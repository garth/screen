defmodule Screen.Repo.Migrations.AddCompositeIndexOnDocumentUpdates do
  use Ecto.Migration

  def change do
    # Hottest query path — runs on every document open
    create index(:document_updates, [:document_id, :inserted_at],
             where: "deleted_at IS NULL",
             name: :document_updates_doc_id_inserted_at_active_index
           )
  end
end
