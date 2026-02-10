defmodule Screen.Documents do
  @moduledoc """
  The Documents context.
  """

  import Ecto.Query, warn: false
  alias Screen.Repo
  alias Screen.Documents.{Document, DocumentUpdate, DocumentUser}

  @doc """
  Gets a single document.

  Raises `Ecto.NoResultsError` if the Document does not exist.
  """
  def get_document!(id), do: Repo.get!(Document, id)

  @doc """
  Gets a document by id, returns nil if not found.
  """
  def get_document(id), do: Repo.get(Document, id)

  @doc """
  Returns all document update binaries for the given document,
  walking the `base_document_id` chain to include inherited updates.

  Updates are returned base-most first, then self — so applying them
  in order reconstructs the full document state.
  """
  def get_document_updates_with_inheritance(document_id) do
    document = get_document!(document_id)
    chain = build_inheritance_chain(document, [])

    Enum.flat_map(chain, fn doc_id ->
      DocumentUpdate
      |> where([du], du.document_id == ^doc_id and is_nil(du.deleted_at))
      |> order_by([du], asc: du.inserted_at)
      |> select([du], du.update)
      |> Repo.all()
    end)
  end

  defp build_inheritance_chain(%Document{id: id, base_document_id: nil}, acc) do
    [id | acc]
  end

  defp build_inheritance_chain(%Document{id: id, base_document_id: base_id}, acc) do
    base = get_document!(base_id)
    build_inheritance_chain(base, [id | acc])
  end

  @doc """
  Creates a document update record.
  """
  def create_document_update!(document_id, user_id, update_binary) do
    %DocumentUpdate{}
    |> DocumentUpdate.changeset(%{update: update_binary})
    |> Ecto.Changeset.put_change(:document_id, document_id)
    |> Ecto.Changeset.put_change(:user_id, user_id)
    |> Repo.insert!()
  end

  @doc """
  Updates the meta column on a document.
  """
  def update_document_meta!(document_id, meta) when is_map(meta) do
    document = get_document!(document_id)

    document
    |> Ecto.Changeset.change(%{meta: meta})
    |> Repo.update!()
  end

  @doc """
  Checks a user's permission level for a document.

  Returns:
    - `{:ok, :read_write}` for the document owner or shared users with `can_write`
    - `{:ok, :read_only}` for public documents (non-owner) or shared users without `can_write`
    - `{:error, :not_found}` if document doesn't exist or user has no access
  """
  def check_document_permission(document_id, user_id) do
    case get_document(document_id) do
      nil ->
        {:error, :not_found}

      %Document{} = document ->
        cond do
          # Owner always gets read_write
          document.user_id == user_id ->
            {:ok, :read_write}

          # Shared user
          user_id != nil ->
            case get_document_user(document_id, user_id) do
              %DocumentUser{can_write: true} -> {:ok, :read_write}
              %DocumentUser{} -> {:ok, :read_only}
              nil -> if document.is_public, do: {:ok, :read_only}, else: {:error, :not_found}
            end

          # Public document, non-owner
          document.is_public ->
            {:ok, :read_only}

          # No access
          true ->
            {:error, :not_found}
        end
    end
  end

  defp get_document_user(document_id, user_id) do
    DocumentUser
    |> where(
      [du],
      du.document_id == ^document_id and du.user_id == ^user_id and is_nil(du.deleted_at)
    )
    |> Repo.one()
  end
end
