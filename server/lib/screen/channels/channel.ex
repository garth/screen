defmodule Screen.Channels.Channel do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, ExCuid2.Ecto.Type, autogenerate: true}
  @foreign_key_type ExCuid2.Ecto.Type
  schema "channels" do
    field :name, :string
    field :slug, :string
    field :deleted_at, :utc_datetime

    belongs_to :user, Screen.Accounts.User
    belongs_to :event_document, Screen.Documents.Document

    timestamps(type: :utc_datetime)
  end

  def changeset(channel, attrs) do
    channel
    |> cast(attrs, [:name, :slug, :deleted_at])
    |> validate_required([:name])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:event_document_id)
    |> unique_constraint(:slug)
  end
end
