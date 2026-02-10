defmodule Screen.Documents.DocServer do
  @moduledoc """
  A per-document GenServer that manages Yjs document state, sync protocol,
  awareness, persistence, and observer broadcasting.

  Built on `Yex.DocServer` which handles the low-level y-protocols message
  processing. This module adds:

  - Observer management (channel processes register to receive broadcasts)
  - User identity tracking (maps channel pids to user_ids for persistence)
  - Database persistence of updates with user attribution
  - Debounced meta sync from the Yjs doc map to the documents table
  - Process lifecycle via Registry + DynamicSupervisor
  """

  use Yex.DocServer

  require Logger

  alias Yex.{Sync, Awareness}
  alias Screen.Documents

  @meta_debounce_ms 2_000
  @meta_max_debounce_ms 10_000

  # --- Public API ---

  @doc """
  Finds an existing DocServer for the given document name, or starts a new one.
  """
  def find_or_start(doc_name) do
    case Registry.lookup(Screen.Documents.DocRegistry, doc_name) do
      [{pid, _}] ->
        pid

      [] ->
        case DynamicSupervisor.start_child(
               Screen.Documents.DocSupervisor,
               {__MODULE__, doc_name: doc_name, name: via(doc_name)}
             ) do
          {:ok, pid} -> pid
          {:error, {:already_started, pid}} -> pid
        end
    end
  end

  @doc """
  Registers the calling process as an observer to receive `{:yjs, message, server}` messages.
  """
  def observe(server) do
    GenServer.call(server, {:observe, self()})
  end

  @doc """
  Unregisters the calling process as an observer.
  """
  def unobserve(server) do
    GenServer.call(server, {:unobserve, self()})
  end

  @doc """
  Associates a channel pid with a user_id for update attribution.
  """
  def register_user(server, pid, user_id) do
    GenServer.cast(server, {:register_user, pid, user_id})
  end

  @doc """
  Sends a y-protocols binary message to the server for processing.
  Returns any reply messages to the caller via `{:yjs, reply, server}`.
  """
  def send_yjs_message(server, message) when is_binary(message) do
    case process_message_v1(server, message, self()) do
      {:ok, replies} ->
        Enum.each(replies, fn reply ->
          send(self(), {:yjs, reply, server})
        end)

        :ok

      :ok ->
        :ok

      error ->
        error
    end
  end

  # --- DocServer Callbacks ---

  @impl true
  def init(arg, %{doc: doc, awareness: awareness} = state) do
    doc_name = Keyword.fetch!(arg, :doc_name)

    # Load persisted updates from the database
    updates = Documents.get_document_updates_with_inheritance(doc_name)

    Enum.each(updates, fn update_binary ->
      case Yex.apply_update(doc, update_binary) do
        :ok ->
          :ok

        {:error, reason} ->
          Logger.warning("Failed to apply update for #{doc_name}: #{inspect(reason)}")
      end
    end)

    # Clean local awareness state (server doesn't have its own awareness)
    if awareness, do: Awareness.clean_local_state(awareness)

    {:ok,
     assign(state, %{
       doc_name: doc_name,
       observer_process: %{},
       origin_user_map: %{},
       origin_client_map: %{},
       meta_timer: nil,
       meta_first_pending: nil
     })}
  end

  @impl true
  def handle_update_v1(_doc, update, origin, state) do
    doc_name = state.assigns.doc_name
    user_id = Map.get(state.assigns.origin_user_map, origin)

    # Persist the update to the database (user_id required by DB constraint)
    if user_id do
      try do
        Documents.create_document_update!(doc_name, user_id, update)
      rescue
        e -> Logger.error("Failed to persist update for #{doc_name}: #{inspect(e)}")
      end
    end

    # Broadcast the update to other observers
    with {:ok, sync_update} <- Sync.get_update(update),
         {:ok, message} <- Sync.message_encode({:sync, sync_update}) do
      broadcast_to_observers(message, origin, state)
    end

    # Schedule debounced meta sync
    state = schedule_meta_sync(state)

    {:noreply, state}
  end

  @impl true
  def handle_awareness_update(
        awareness,
        %{removed: removed, added: added, updated: updated},
        origin,
        state
      ) do
    updated_clients = added ++ updated ++ removed

    with {:ok, update} <- Awareness.encode_update(awareness, updated_clients),
         {:ok, message} <- Sync.message_encode({:awareness, update}) do
      broadcast_to_observers(message, origin, state)

      {:noreply, update_origin_client_map(state, origin, %{removed: removed, added: added})}
    else
      error ->
        Logger.warning("Awareness encode error: #{inspect(error)}")
        {:noreply, state}
    end
  end

  @impl true
  def handle_call({:observe, client}, _from, state) do
    observer_process =
      Map.put_new_lazy(state.assigns.observer_process, client, fn -> Process.monitor(client) end)

    {:reply, :ok, assign(state, :observer_process, observer_process)}
  end

  @impl true
  def handle_call({:unobserve, client}, _from, state) do
    state = remove_observer(client, state)

    if state.assigns.observer_process == %{} do
      {:stop, :normal, :ok, state}
    else
      {:reply, :ok, state}
    end
  end

  @impl true
  def handle_cast({:register_user, pid, user_id}, state) do
    {:noreply,
     assign(state, :origin_user_map, Map.put(state.assigns.origin_user_map, pid, user_id))}
  end

  @impl true
  def handle_info(:sync_meta, state) do
    state = assign(state, meta_timer: nil, meta_first_pending: nil)
    do_sync_meta(state)
    {:noreply, state}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    state = remove_observer(pid, state)

    if state.assigns.observer_process == %{} do
      {:stop, :normal, state}
    else
      {:noreply, state}
    end
  end

  # --- Private Helpers ---

  defp via(doc_name) do
    {:via, Registry, {Screen.Documents.DocRegistry, doc_name}}
  end

  defp broadcast_to_observers(message, origin, state) do
    state.assigns.observer_process
    |> Enum.reject(fn {pid, _} -> pid == origin end)
    |> Enum.each(fn {pid, _} ->
      send(pid, {:yjs, message, self()})
    end)
  end

  defp remove_observer(client, state) do
    {ref, observer_process} = Map.pop(state.assigns.observer_process, client)
    if ref, do: Process.demonitor(ref, [:flush])

    origin_user_map = Map.delete(state.assigns.origin_user_map, client)

    state
    |> assign(:observer_process, observer_process)
    |> assign(:origin_user_map, origin_user_map)
    |> remove_awareness_clients(client)
  end

  defp remove_awareness_clients(state, origin) do
    clients = Map.get(state.assigns.origin_client_map, origin, [])

    if state.awareness && clients != [] do
      Awareness.remove_states(state.awareness, clients)
    end

    assign(state, :origin_client_map, Map.delete(state.assigns.origin_client_map, origin))
  end

  defp update_origin_client_map(state, nil, _event), do: state

  defp update_origin_client_map(state, origin, %{removed: removed, added: added}) do
    origin_client_map =
      Map.update(state.assigns.origin_client_map, origin, added, fn prev ->
        (added ++ prev)
        |> Enum.uniq()
        |> Enum.reject(&(&1 in removed))
      end)

    assign(state, :origin_client_map, origin_client_map)
  end

  defp schedule_meta_sync(state) do
    now = System.monotonic_time(:millisecond)

    # Cancel existing timer if any
    if state.assigns.meta_timer do
      Process.cancel_timer(state.assigns.meta_timer)
    end

    first_pending = state.assigns.meta_first_pending || now

    cond do
      # Max debounce exceeded — sync immediately
      now - first_pending >= @meta_max_debounce_ms ->
        send(self(), :sync_meta)
        assign(state, meta_timer: nil, meta_first_pending: nil)

      # Schedule new debounce timer
      true ->
        timer = Process.send_after(self(), :sync_meta, @meta_debounce_ms)
        assign(state, meta_timer: timer, meta_first_pending: first_pending)
    end
  end

  defp do_sync_meta(state) do
    doc_name = state.assigns.doc_name

    try do
      meta_map = state.doc |> Yex.Doc.get_map("meta") |> Yex.Map.to_json()
      Documents.update_document_meta!(doc_name, meta_map)
    rescue
      e -> Logger.error("Failed to sync meta for #{doc_name}: #{inspect(e)}")
    end
  end
end
