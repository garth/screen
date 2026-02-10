defmodule Screen.Repo.Migrations.CreateDocumentsAndChannelsTables do
  use Ecto.Migration

  def change do
    create table(:documents, primary_key: false) do
      add :id, :string, primary_key: true, size: 24
      add :user_id, references(:users, type: :string, on_delete: :delete_all), null: false
      add :name, :string, null: false
      add :type, :string, null: false
      add :base_document_id, references(:documents, type: :string, on_delete: :nilify_all)
      add :is_public, :boolean, default: false, null: false
      add :meta, :map, default: %{}
      add :deleted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:documents, [:user_id])
    create index(:documents, [:base_document_id])

    create table(:document_updates, primary_key: false) do
      add :id, :string, primary_key: true, size: 24
      add :document_id, references(:documents, type: :string, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :string, on_delete: :delete_all), null: false
      add :update, :binary, null: false
      add :deleted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:document_updates, [:document_id])
    create index(:document_updates, [:user_id])

    create table(:document_users, primary_key: false) do
      add :id, :string, primary_key: true, size: 24
      add :document_id, references(:documents, type: :string, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :string, on_delete: :delete_all), null: false
      add :can_write, :boolean, default: false, null: false
      add :deleted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:document_users, [:document_id, :user_id])
    create index(:document_users, [:user_id])

    create table(:channels, primary_key: false) do
      add :id, :string, primary_key: true, size: 24
      add :user_id, references(:users, type: :string, on_delete: :delete_all), null: false

      add :event_document_id, references(:documents, type: :string, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :slug, :string
      add :deleted_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:channels, [:user_id])
    create index(:channels, [:event_document_id])
    create unique_index(:channels, [:slug])
  end
end
