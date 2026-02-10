defmodule Screen.Channels do
  @moduledoc """
  The Channels context for managing event channels.
  """

  import Ecto.Query, warn: false
  alias Screen.Repo
  alias Screen.Channels.Channel

  @doc """
  Creates a channel for an event document.
  """
  def create_channel(user_id, event_document_id, attrs) do
    %Channel{}
    |> Channel.changeset(attrs)
    |> Ecto.Changeset.put_change(:user_id, user_id)
    |> Ecto.Changeset.put_change(:event_document_id, event_document_id)
    |> Repo.insert()
  end

  @doc """
  Gets a channel by slug, excluding soft-deleted.
  """
  def get_channel_by_slug(slug) do
    Channel
    |> where([c], c.slug == ^slug and is_nil(c.deleted_at))
    |> Repo.one()
  end

  @doc """
  Gets a channel by ID, excluding soft-deleted.
  """
  def get_channel(id) do
    case Repo.get(Channel, id) do
      %Channel{deleted_at: nil} = channel -> channel
      _ -> nil
    end
  end

  @doc """
  Lists all channels for an event document, excluding soft-deleted.
  """
  def list_channels_for_event(event_document_id) do
    Channel
    |> where([c], c.event_document_id == ^event_document_id and is_nil(c.deleted_at))
    |> order_by([c], asc: c.inserted_at)
    |> Repo.all()
  end

  @doc """
  Updates a channel's name and/or slug.
  """
  def update_channel(%Channel{} = channel, attrs) do
    channel
    |> Channel.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Soft-deletes a channel by setting `deleted_at`.
  """
  def delete_channel(%Channel{} = channel) do
    channel
    |> Ecto.Changeset.change(%{deleted_at: DateTime.utc_now(:second)})
    |> Repo.update()
  end
end
