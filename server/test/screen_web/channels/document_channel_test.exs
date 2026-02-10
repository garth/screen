defmodule ScreenWeb.DocumentChannelTest do
  # Not async because DocServer GenServer processes need shared sandbox access
  use ScreenWeb.ChannelCase, async: false

  alias ScreenWeb.{UserSocket, DocumentChannel}
  alias Screen.Documents
  alias Screen.Documents.DocServer

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    owner = user_fixture()
    document = document_fixture(owner)
    token = Screen.Accounts.generate_user_session_token(owner)

    {:ok, socket} =
      connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

    # Pre-start DocServer via start_link (not DynamicSupervisor)
    # so $callers gives it sandbox access
    {:ok, server} =
      DocServer.start_link(
        [doc_name: document.id],
        name: {:via, Registry, {Screen.Documents.DocRegistry, document.id}}
      )

    # Ensure cleanup happens before sandbox teardown
    doc_id = document.id

    on_exit(fn ->
      case Registry.lookup(Screen.Documents.DocRegistry, doc_id) do
        [{pid, _}] ->
          Process.exit(pid, :kill)

          ref = Process.monitor(pid)

          receive do
            {:DOWN, ^ref, _, _, _} -> :ok
          after
            1000 -> :ok
          end

        [] ->
          :ok
      end
    end)

    %{owner: owner, document: document, socket: socket, server: server}
  end

  describe "join/3" do
    test "owner can join their document", %{document: document, socket: socket} do
      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      assert reply == %{read_only: false}
    end

    test "shared user with write access joins as read_write", %{document: document} do
      other_user = user_fixture()
      document_user_fixture(document, other_user, %{can_write: true})
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      assert reply == %{read_only: false}
    end

    test "shared user without write access joins as read_only", %{document: document} do
      other_user = user_fixture()
      document_user_fixture(document, other_user, %{can_write: false})
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      assert reply == %{read_only: true}
    end

    test "anonymous user can join public document", %{owner: owner} do
      public_doc = document_fixture(owner, %{is_public: true})

      # Pre-start a DocServer for the public doc too
      {:ok, _} =
        DocServer.start_link(
          [doc_name: public_doc.id],
          name: {:via, Registry, {Screen.Documents.DocRegistry, public_doc.id}}
        )

      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, DocumentChannel, "document:#{public_doc.id}")

      assert reply == %{read_only: true}
    end

    test "anonymous user cannot join private document", %{document: document} do
      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")
    end

    test "unrelated user cannot join private document", %{document: document} do
      other_user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")
    end

    test "nonexistent document returns error" do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      fake_id = ExCuid2.generate()

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, DocumentChannel, "document:#{fake_id}")
    end

    test "pushes permissions event after join", %{document: document, socket: socket} do
      {:ok, _reply, _socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      assert_push "permissions", %{read_only: false}, 1000
    end

    test "pushes read_only permissions for public doc viewer", %{owner: owner} do
      public_doc = document_fixture(owner, %{is_public: true})

      {:ok, _} =
        DocServer.start_link(
          [doc_name: public_doc.id],
          name: {:via, Registry, {Screen.Documents.DocRegistry, public_doc.id}}
        )

      other_user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      {:ok, _reply, _socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{public_doc.id}")

      assert_push "permissions", %{read_only: true}, 1000
    end

    test "initiates sync on join by pushing yjs messages", %{
      document: document,
      socket: socket
    } do
      {:ok, _reply, _socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      # The channel sends :start_sync after join, which triggers a sync_step1
      # The server responds with sync_step2 + sync_step1 messages
      assert_push "yjs", %{"data" => data}, 1000
      assert is_binary(data)
    end
  end

  describe "handle_in yjs" do
    test "read-write client can send updates", %{
      document: document,
      socket: socket,
      server: server
    } do
      {:ok, _reply, socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{document.id}")

      # Drain initial sync messages
      drain_pushes()

      # Create a valid yjs sync update message
      doc = Yex.Doc.new()
      text = Yex.Doc.get_text(doc, "content")
      {:ok, _} = Yex.Doc.monitor_update(doc)

      Yex.Text.insert(text, 0, "hello")

      update =
        receive do
          {:update_v1, update_bin, _origin, _metadata} -> update_bin
        after
          1000 -> raise "expected update"
        end

      {:ok, sync_update} = Yex.Sync.get_update(update)
      {:ok, message} = Yex.Sync.message_encode({:sync, sync_update})

      push(socket, "yjs", %{"data" => message})

      # Synchronize with DocServer to ensure persistence completes
      _ = :sys.get_state(server)

      updates = Documents.get_document_updates_with_inheritance(document.id)
      assert length(updates) > 0
    end

    test "read-only client cannot send updates", %{owner: owner} do
      public_doc = document_fixture(owner, %{is_public: true})

      {:ok, pub_server} =
        DocServer.start_link(
          [doc_name: public_doc.id],
          name: {:via, Registry, {Screen.Documents.DocRegistry, public_doc.id}}
        )

      other_user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{public_doc.id}")

      # Drain initial sync messages
      drain_pushes()

      # Create a sync_update message (write operation)
      doc = Yex.Doc.new()
      text = Yex.Doc.get_text(doc, "content")
      {:ok, _} = Yex.Doc.monitor_update(doc)

      Yex.Text.insert(text, 0, "blocked")

      update =
        receive do
          {:update_v1, update_bin, _origin, _metadata} -> update_bin
        after
          1000 -> raise "expected update"
        end

      {:ok, sync_update} = Yex.Sync.get_update(update)
      {:ok, message} = Yex.Sync.message_encode({:sync, sync_update})

      push(socket, "yjs", %{"data" => message})

      # Synchronize with DocServer to ensure message processing completes
      _ = :sys.get_state(pub_server)

      updates = Documents.get_document_updates_with_inheritance(public_doc.id)
      assert updates == []
    end

    test "read-only client can send sync_step1 (read request)", %{owner: owner} do
      public_doc = document_fixture(owner, %{is_public: true})

      {:ok, _} =
        DocServer.start_link(
          [doc_name: public_doc.id],
          name: {:via, Registry, {Screen.Documents.DocRegistry, public_doc.id}}
        )

      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, DocumentChannel, "document:#{public_doc.id}")

      # Drain initial sync messages
      drain_pushes()

      # Send a sync_step1 message — should be allowed
      {:ok, sv} = Yex.encode_state_vector(Yex.Doc.new())
      {:ok, step1} = Yex.Sync.message_encode({:sync, {:sync_step1, sv}})

      push(socket, "yjs", %{"data" => step1})

      # Should receive sync_step2 response
      assert_push "yjs", %{"data" => _data}, 1000
    end
  end

  # Helper to drain any pending push messages
  defp drain_pushes do
    receive do
      %Phoenix.Socket.Message{event: "yjs"} -> drain_pushes()
    after
      200 -> :ok
    end
  end
end
