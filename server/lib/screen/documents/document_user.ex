defmodule Screen.Documents.DocumentUser do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, ExCuid2.Ecto.Type, autogenerate: true}
  @foreign_key_type ExCuid2.Ecto.Type
  schema "document_users" do
    field :can_write, :boolean, default: false
    field :deleted_at, :utc_datetime

    belongs_to :document, Screen.Documents.Document
    belongs_to :user, Screen.Accounts.User

    timestamps(type: :utc_datetime)
  end

  def changeset(document_user, attrs) do
    document_user
    |> cast(attrs, [:can_write, :deleted_at])
    |> foreign_key_constraint(:document_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:document_id, :user_id])
  end
end
