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

  @valid_document_types ~w(presentation theme event)

  @doc """
  Creates a document owned by the given user.

  Accepts `user_id`, `type`, and optional `attrs` map.
  Defaults name to "Untitled" if not provided.
  Validates type is one of: presentation, theme, event.
  """
  def create_document(user_id, type, attrs \\ %{}) do
    if type in @valid_document_types do
      attrs = Map.put_new(attrs, :name, "Untitled")
      attrs = Map.put(attrs, :type, type)

      %Document{}
      |> Document.changeset(attrs)
      |> Ecto.Changeset.put_change(:user_id, user_id)
      |> Repo.insert()
    else
      {:error, :invalid_type}
    end
  end

  @doc """
  Soft-deletes a document by setting `deleted_at`.

  Verifies the user is the document owner before deleting.
  """
  def delete_document(document_id, user_id) do
    case get_document(document_id) do
      nil ->
        {:error, :not_found}

      %Document{user_id: ^user_id} = document ->
        document
        |> Ecto.Changeset.change(%{deleted_at: DateTime.utc_now(:second)})
        |> Repo.update()

      %Document{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Updates mutable fields on a document (name, is_public, meta).

  Verifies the user is the document owner before updating.
  """
  def update_document(document_id, user_id, attrs) do
    case get_document(document_id) do
      nil ->
        {:error, :not_found}

      %Document{user_id: ^user_id} = document ->
        document
        |> Document.changeset(Map.take(attrs, [:name, :is_public, :meta]))
        |> Repo.update()

      %Document{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Lists documents accessible to a user (owned or shared), excluding soft-deleted.

  Returns a list of maps with: id, name, type, is_public, updated_at, is_owner, can_write.
  Ordered by updated_at descending.
  """
  def list_user_documents(user_id) do
    owned_query =
      from d in Document,
        where: d.user_id == ^user_id and is_nil(d.deleted_at),
        select: %{
          id: d.id,
          name: d.name,
          type: d.type,
          is_public: d.is_public,
          updated_at: d.updated_at,
          is_owner: true,
          can_write: true
        }

    shared_query =
      from d in Document,
        join: du in DocumentUser,
        on: du.document_id == d.id and du.user_id == ^user_id and is_nil(du.deleted_at),
        where: is_nil(d.deleted_at) and d.user_id != ^user_id,
        select: %{
          id: d.id,
          name: d.name,
          type: d.type,
          is_public: d.is_public,
          updated_at: d.updated_at,
          is_owner: false,
          can_write: du.can_write
        }

    owned = Repo.all(owned_query)
    shared = Repo.all(shared_query)

    (owned ++ shared)
    |> Enum.sort_by(& &1.updated_at, {:desc, DateTime})
  end

  @doc """
  Lists themes visible to a user: all system themes plus user-owned themes.

  Returns a list of maps with: id, name, isSystemTheme.
  Excludes soft-deleted documents.
  """
  def list_user_themes(user_id) do
    system_themes_query =
      from d in Document,
        where:
          d.type == "theme" and
            is_nil(d.deleted_at) and
            fragment("?->>'isSystemTheme' = 'true'", d.meta),
        select: %{id: d.id, name: d.name, isSystemTheme: true}

    user_themes_query =
      from d in Document,
        where:
          d.type == "theme" and
            d.user_id == ^user_id and
            is_nil(d.deleted_at) and
            (is_nil(fragment("?->>'isSystemTheme'", d.meta)) or
               fragment("?->>'isSystemTheme' != 'true'", d.meta)),
        select: %{id: d.id, name: d.name, isSystemTheme: false}

    Repo.all(system_themes_query) ++ Repo.all(user_themes_query)
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
