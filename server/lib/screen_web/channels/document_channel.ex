defmodule ScreenWeb.DocumentChannel do
  @moduledoc """
  Handles `document:{id}` channel for Yjs document sync.

  Checks permissions on join and returns a `read_only` flag. Read-only clients
  can only send sync step1 (reads) and awareness messages; write attempts are
  silently dropped.

  ## Join

  - `document:{id}` — checks permission, starts DocServer, begins Yjs sync

  ## Incoming Events

  - `yjs` — binary Yjs sync message, delegated to DocServer

  ## Outgoing Events

  - `permissions` — pushed after join with `%{read_only: boolean}`
  - `yjs` — relayed Yjs messages from DocServer (sync updates, awareness)
  """

  use ScreenWeb, :channel

  alias Screen.Documents
  alias Screen.Documents.DocServer

  @impl true
  def join("document:" <> doc_id, _params, socket) do
    user = socket.assigns.user
    user_id = if user, do: user.id

    case Documents.check_document_permission(doc_id, user_id) do
      {:ok, permission} ->
        server = DocServer.find_or_start(doc_id)
        DocServer.observe(server)
        DocServer.register_user(server, self(), user_id)

        socket =
          socket
          |> assign(:server, server)
          |> assign(:doc_id, doc_id)
          |> assign(:read_only, permission == :read_only)

        # Push permissions so the client can update readOnly state
        # (y-phoenix-channel ignores the join reply payload)
        send(self(), :push_permissions)

        # Initiate sync by sending our SyncStep1 to the server
        send(self(), :start_sync)

        {:ok, %{read_only: permission == :read_only}, socket}

      {:error, :not_found} ->
        {:error, %{reason: "not found"}}
    end
  end

  @impl true
  def handle_in("yjs", %{"data" => data}, socket) when is_binary(data) do
    if socket.assigns.read_only do
      # Read-only clients can only send sync step1 (reads) and awareness
      case Yex.Sync.message_decode(data) do
        {:ok, {:sync, {:sync_step1, _}}} ->
          DocServer.send_yjs_message(socket.assigns.server, data)

        {:ok, {:awareness, _}} ->
          DocServer.send_yjs_message(socket.assigns.server, data)

        {:ok, :query_awareness} ->
          DocServer.send_yjs_message(socket.assigns.server, data)

        _ ->
          :ok
      end
    else
      DocServer.send_yjs_message(socket.assigns.server, data)
    end

    {:noreply, socket}
  end

  @impl true
  def handle_info(:push_permissions, socket) do
    push(socket, "permissions", %{read_only: socket.assigns.read_only})
    {:noreply, socket}
  end

  @impl true
  def handle_info(:start_sync, socket) do
    {:ok, step1} = Yex.Sync.message_encode({:sync, {:sync_step1, <<0>>}})
    DocServer.send_yjs_message(socket.assigns.server, step1)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:yjs, message, _server}, socket) do
    push(socket, "yjs", %{"data" => message})
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    if server = socket.assigns[:server] do
      DocServer.unobserve(server)
    end
  end
end
