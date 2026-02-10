defmodule Screen.Documents.Persistence do
  @moduledoc """
  Persistence backend for SharedDoc / DocServer.

  Implements `Yex.Sync.SharedDoc.PersistenceBehaviour` to load document
  state from the database on bind and persist updates on each change.
  """

  @behaviour Yex.Sync.SharedDoc.PersistenceBehaviour

  require Logger

  alias Screen.Documents

  @impl true
  def bind(_state, doc_name, doc) do
    updates = Documents.get_document_updates_with_inheritance(doc_name)

    Enum.each(updates, fn update_binary ->
      case Yex.apply_update(doc, update_binary) do
        :ok -> :ok
        {:error, reason} -> Logger.warning("Failed to apply update: #{inspect(reason)}")
      end
    end)

    %{doc_name: doc_name}
  end

  @impl true
  def update_v1(state, _update, _doc_name, _doc) do
    # Persistence of individual updates is handled by the DocServer
    # (which has access to the origin/user context). This callback
    # is required by the behaviour but we delegate actual persistence
    # to DocServer.handle_update_v1/4.
    state
  end
end
