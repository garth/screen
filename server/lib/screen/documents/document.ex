defmodule Screen.Documents.Document do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, ExCuid2.Ecto.Type, autogenerate: true}
  @foreign_key_type ExCuid2.Ecto.Type
  schema "documents" do
    field :name, :string
    field :type, :string
    field :is_public, :boolean, default: false
    field :meta, :map, default: %{}
    field :deleted_at, :utc_datetime

    belongs_to :user, Screen.Accounts.User
    belongs_to :base_document, Screen.Documents.Document
    has_many :document_updates, Screen.Documents.DocumentUpdate
    has_many :document_users, Screen.Documents.DocumentUser
    has_many :channels, Screen.Channels.Channel, foreign_key: :event_document_id

    timestamps(type: :utc_datetime)
  end

  def changeset(document, attrs) do
    document
    |> cast(attrs, [:name, :type, :is_public, :meta, :base_document_id, :deleted_at])
    |> validate_required([:name, :type])
    |> validate_inclusion(:type, ~w(presentation theme event))
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:base_document_id)
  end
end
