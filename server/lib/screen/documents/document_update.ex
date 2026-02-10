defmodule Screen.Documents.DocumentUpdate do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, ExCuid2.Ecto.Type, autogenerate: true}
  @foreign_key_type ExCuid2.Ecto.Type
  schema "document_updates" do
    field :update, :binary
    field :deleted_at, :utc_datetime

    belongs_to :document, Screen.Documents.Document
    belongs_to :user, Screen.Accounts.User

    timestamps(type: :utc_datetime)
  end

  def changeset(document_update, attrs) do
    document_update
    |> cast(attrs, [:update])
    |> validate_required([:update])
    |> foreign_key_constraint(:document_id)
    |> foreign_key_constraint(:user_id)
  end
end
