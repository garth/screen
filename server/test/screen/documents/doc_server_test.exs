defmodule Screen.Documents.DocServerTest do
  # Not async because DocServer GenServer processes need shared sandbox access
  use Screen.DataCase, async: false

  alias Screen.Documents
  alias Screen.Documents.DocServer

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    user = user_fixture()
    document = document_fixture(user)
    %{user: user, document: document}
  end

  # Start a DocServer directly via start_link (not DynamicSupervisor)
  # so that $callers propagation gives it access to the test sandbox.
  defp start_server(document) do
    {:ok, server} =
      DocServer.start_link(
        [doc_name: document.id],
        name: {:via, Registry, {Screen.Documents.DocRegistry, document.id}}
      )

    server
  end

  defp wait_for_exit(pid) do
    ref = Process.monitor(pid)

    receive do
      {:DOWN, ^ref, :process, ^pid, _} -> :ok
    after
      1000 -> :ok
    end
  end

  defp make_yjs_update(name \\ "content", text_content) do
    doc = Yex.Doc.new()
    text = Yex.Doc.get_text(doc, name)
    {:ok, _} = Yex.Doc.monitor_update(doc)

    Yex.Text.insert(text, 0, text_content)

    receive do
      {:update_v1, update_bin, _origin, _metadata} -> update_bin
    after
      1000 -> raise "expected update from doc"
    end
  end

  defp encode_sync_update(update) do
    {:ok, sync_update} = Yex.Sync.get_update(update)
    {:ok, message} = Yex.Sync.message_encode({:sync, sync_update})
    message
  end

  describe "find_or_start/1" do
    test "finds existing server via registry", %{document: document} do
      # Start manually so we control sandbox access
      server1 = start_server(document)
      DocServer.observe(server1)

      # find_or_start should find the existing server
      server2 = DocServer.find_or_start(document.id)
      assert server1 == server2

      DocServer.unobserve(server1)
      wait_for_exit(server1)
    end
  end

  describe "observe/1 and unobserve/1" do
    test "observer receives broadcasts from other clients", %{document: document, user: user} do
      server = start_server(document)
      DocServer.observe(server)
      DocServer.register_user(server, self(), user.id)

      update = make_yjs_update("hello")
      message = encode_sync_update(update)

      # Simulate a second client sending the update from a different pid
      task =
        Task.async(fn ->
          DocServer.send_yjs_message(server, message)
        end)

      Task.await(task)

      # We should receive the broadcast since we're an observer
      assert_receive {:yjs, _message, ^server}, 1000

      DocServer.unobserve(server)
      wait_for_exit(server)
    end

    test "server auto-terminates when last observer unobserves", %{document: document} do
      server = start_server(document)
      DocServer.observe(server)

      ref = Process.monitor(server)
      DocServer.unobserve(server)

      assert_receive {:DOWN, ^ref, :process, ^server, :normal}, 1000
    end

    test "server auto-terminates when observer process dies", %{document: document} do
      server = start_server(document)

      test_pid = self()

      {observer_pid, observer_ref} =
        spawn_monitor(fn ->
          DocServer.observe(server)
          send(test_pid, :observer_ready)

          receive do
            :stop -> :ok
          end
        end)

      assert_receive :observer_ready, 1000

      server_ref = Process.monitor(server)
      Process.exit(observer_pid, :kill)

      assert_receive {:DOWN, ^observer_ref, :process, ^observer_pid, :killed}
      assert_receive {:DOWN, ^server_ref, :process, ^server, :normal}, 1000
    end
  end

  describe "update persistence" do
    test "persists updates to the database", %{document: document, user: user} do
      server = start_server(document)
      DocServer.observe(server)
      DocServer.register_user(server, self(), user.id)

      update = make_yjs_update("test content")
      message = encode_sync_update(update)

      DocServer.send_yjs_message(server, message)

      # Wait for async persistence
      _ = :sys.get_state(server)

      updates = Documents.get_document_updates_with_inheritance(document.id)
      assert length(updates) > 0

      DocServer.unobserve(server)
      wait_for_exit(server)
    end
  end

  describe "initial state loading" do
    test "loads existing updates on startup", %{document: document, user: user} do
      # Create and persist a Yjs update
      update = make_yjs_update("persisted content")
      Documents.create_document_update!(document.id, user.id, update)

      # Start a new DocServer — it should load the persisted update
      server = start_server(document)
      DocServer.observe(server)

      # Initiate sync to get the document state
      {:ok, sv} = Yex.encode_state_vector(Yex.Doc.new())
      {:ok, step1} = Yex.Sync.message_encode({:sync, {:sync_step1, sv}})
      DocServer.send_yjs_message(server, step1)

      # We should receive a sync_step2 with the document state
      assert_receive {:yjs, reply_data, ^server}, 1000

      {:ok, {:sync, {:sync_step2, state_update}}} = Yex.Sync.message_decode(reply_data)

      # Apply the state to a fresh doc and verify the content
      new_doc = Yex.Doc.new()
      :ok = Yex.apply_update(new_doc, state_update)
      result_text = Yex.Doc.get_text(new_doc, "content")
      assert Yex.Text.to_string(result_text) == "persisted content"

      DocServer.unobserve(server)
      wait_for_exit(server)
    end
  end

  describe "compaction on terminate" do
    test "compacts updates into a single state on shutdown", %{document: document, user: user} do
      server = start_server(document)
      DocServer.observe(server)
      DocServer.register_user(server, self(), user.id)

      # Send two updates to create multiple document_updates rows
      update1 = make_yjs_update("hello")
      DocServer.send_yjs_message(server, encode_sync_update(update1))

      update2 = make_yjs_update("content", "world")
      DocServer.send_yjs_message(server, encode_sync_update(update2))

      # Wait for persistence
      _ = :sys.get_state(server)

      # Verify we have multiple updates before shutdown
      updates_before = Documents.get_document_updates_with_inheritance(document.id)
      assert length(updates_before) >= 2

      # Unobserve triggers graceful shutdown + compaction
      DocServer.unobserve(server)
      wait_for_exit(server)

      # After compaction, there should be exactly one update
      updates_after = Documents.get_document_updates_with_inheritance(document.id)
      assert length(updates_after) == 1

      # The compacted state should still contain all the content
      [compacted] = updates_after
      doc = Yex.Doc.new()
      :ok = Yex.apply_update(doc, compacted)
      text = Yex.Doc.get_text(doc, "content")
      result = Yex.Text.to_string(text)
      assert String.contains?(result, "hello")
      assert String.contains?(result, "world")
    end

    test "flushes pending meta sync on terminate", %{document: document, user: user} do
      server = start_server(document)
      DocServer.observe(server)
      DocServer.register_user(server, self(), user.id)

      # Set a meta value
      doc = Yex.Doc.new()
      meta = Yex.Doc.get_map(doc, "meta")
      {:ok, _} = Yex.Doc.monitor_update(doc)
      Yex.Map.set(meta, "title", "Terminate Test")

      update =
        receive do
          {:update_v1, update_bin, _origin, _metadata} -> update_bin
        after
          1000 -> raise "expected update"
        end

      DocServer.send_yjs_message(server, encode_sync_update(update))

      # Don't trigger sync_meta manually — let terminate flush it
      DocServer.unobserve(server)
      wait_for_exit(server)

      reloaded = Documents.get_document!(document.id)
      assert reloaded.meta["title"] == "Terminate Test"
    end
  end

  describe "meta seeding from DB" do
    test "seeds Yjs meta from DB meta on startup", %{user: user} do
      # Create a document with DB meta containing isSystemTheme
      {:ok, document} =
        Documents.create_document(user.id, "theme", %{
          name: "System Theme",
          meta: %{"isSystemTheme" => true, "title" => "System Theme"}
        })

      # Start DocServer — it should seed Yjs meta from DB
      server = start_server(document)
      DocServer.observe(server)

      # Sync the document state to a fresh doc
      {:ok, sv} = Yex.encode_state_vector(Yex.Doc.new())
      {:ok, step1} = Yex.Sync.message_encode({:sync, {:sync_step1, sv}})
      DocServer.send_yjs_message(server, step1)

      assert_receive {:yjs, reply_data, ^server}, 1000
      {:ok, {:sync, {:sync_step2, state_update}}} = Yex.Sync.message_decode(reply_data)

      # Apply the state and check the meta map
      new_doc = Yex.Doc.new()
      :ok = Yex.apply_update(new_doc, state_update)
      meta = Yex.Doc.get_map(new_doc, "meta")
      assert Yex.Map.get(meta, "isSystemTheme") == true
      assert Yex.Map.get(meta, "title") == "System Theme"

      DocServer.unobserve(server)
      wait_for_exit(server)
    end

    test "does not overwrite existing Yjs meta with DB meta", %{user: user} do
      # Create a document with DB meta
      {:ok, document} =
        Documents.create_document(user.id, "theme", %{
          name: "Old Title",
          meta: %{"title" => "Old Title"}
        })

      # Persist a Yjs update that sets a different title in meta
      doc = Yex.Doc.new()
      meta = Yex.Doc.get_map(doc, "meta")
      {:ok, _} = Yex.Doc.monitor_update(doc)
      Yex.Map.set(meta, "title", "New Title")

      update =
        receive do
          {:update_v1, update_bin, _origin, _metadata} -> update_bin
        after
          1000 -> raise "expected update"
        end

      Documents.create_document_update!(document.id, user.id, update)

      # Start DocServer — it should NOT overwrite the Yjs meta title
      server = start_server(document)
      DocServer.observe(server)

      # Sync the document state
      {:ok, sv} = Yex.encode_state_vector(Yex.Doc.new())
      {:ok, step1} = Yex.Sync.message_encode({:sync, {:sync_step1, sv}})
      DocServer.send_yjs_message(server, step1)

      assert_receive {:yjs, reply_data, ^server}, 1000
      {:ok, {:sync, {:sync_step2, state_update}}} = Yex.Sync.message_decode(reply_data)

      new_doc = Yex.Doc.new()
      :ok = Yex.apply_update(new_doc, state_update)
      result_meta = Yex.Doc.get_map(new_doc, "meta")

      # Title should be from the Yjs update, not the DB
      assert Yex.Map.get(result_meta, "title") == "New Title"

      DocServer.unobserve(server)
      wait_for_exit(server)
    end
  end

  describe "meta sync" do
    test "syncs meta map to database after debounce", %{document: document, user: user} do
      server = start_server(document)
      DocServer.observe(server)
      DocServer.register_user(server, self(), user.id)

      # Create a doc update that sets a value in the "meta" map
      doc = Yex.Doc.new()
      meta = Yex.Doc.get_map(doc, "meta")
      {:ok, _} = Yex.Doc.monitor_update(doc)

      Yex.Map.set(meta, "title", "My Document")

      update =
        receive do
          {:update_v1, update_bin, _origin, _metadata} -> update_bin
        after
          1000 -> raise "expected update"
        end

      message = encode_sync_update(update)
      DocServer.send_yjs_message(server, message)

      # Trigger the meta sync timer immediately
      send(server, :sync_meta)

      # Wait for processing
      _ = :sys.get_state(server)

      reloaded = Documents.get_document!(document.id)
      assert reloaded.meta["title"] == "My Document"

      DocServer.unobserve(server)
      wait_for_exit(server)
    end
  end
end
