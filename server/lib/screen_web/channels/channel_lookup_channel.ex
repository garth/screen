defmodule ScreenWeb.ChannelLookupChannel do
  @moduledoc """
  Handles `channel:slug:*` topic for public channel lookups.

  Allows unauthenticated users to look up a channel by slug and receive
  the channel data needed to join the corresponding event and presentation
  documents.

  ## Join

  - `channel:slug:{slug}` — looks up channel, checks event document permissions

  ## Permission Logic

  - Event is public → allow join
  - Event is private + user is owner or in DocumentUser → allow join
  - Otherwise → `{:error, %{reason: "not found"}}`

  ## Join Reply

  - `%{id, name, slug, eventDocumentId}` — channel data for client resolution
  """

  use ScreenWeb, :channel

  alias Screen.Channels
  alias Screen.Documents

  @impl true
  def join("channel:slug:" <> slug, _params, socket) do
    case Channels.get_channel_by_slug_with_event(slug) do
      nil ->
        {:error, %{reason: "not found"}}

      channel ->
        event_doc = channel.event_document
        user = socket.assigns.user
        user_id = if user, do: user.id

        case Documents.check_document_permission(event_doc.id, user_id) do
          {:ok, _permission} ->
            {:ok,
             %{
               id: channel.id,
               name: channel.name,
               slug: channel.slug,
               eventDocumentId: channel.event_document_id
             }, socket}

          {:error, :not_found} ->
            {:error, %{reason: "not found"}}
        end
    end
  end
end
