defmodule Screen.DocumentsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Screen.Documents` context.
  """

  alias Screen.Repo
  alias Screen.Documents.{Document, DocumentUpdate, DocumentUser}

  def document_fixture(user, attrs \\ %{}) do
    attrs =
      Enum.into(attrs, %{
        name: "Test Document #{System.unique_integer([:positive])}",
        type: "document"
      })

    %Document{}
    |> Document.changeset(attrs)
    |> Ecto.Changeset.put_change(:user_id, user.id)
    |> Repo.insert!()
  end

  def document_update_fixture(document, user, update_binary \\ <<0, 1, 2, 3>>) do
    %DocumentUpdate{}
    |> DocumentUpdate.changeset(%{update: update_binary})
    |> Ecto.Changeset.put_change(:document_id, document.id)
    |> Ecto.Changeset.put_change(:user_id, user.id)
    |> Repo.insert!()
  end

  def document_user_fixture(document, user, attrs \\ %{}) do
    attrs = Enum.into(attrs, %{can_write: false})

    %DocumentUser{}
    |> DocumentUser.changeset(attrs)
    |> Ecto.Changeset.put_change(:document_id, document.id)
    |> Ecto.Changeset.put_change(:user_id, user.id)
    |> Repo.insert!()
  end
end
