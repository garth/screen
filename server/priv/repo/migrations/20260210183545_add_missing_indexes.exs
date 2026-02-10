defmodule Screen.Repo.Migrations.AddMissingIndexes do
  use Ecto.Migration

  def change do
    # Partial index for listing user's active documents
    create index(:documents, [:user_id],
             where: "deleted_at IS NULL",
             name: :documents_user_id_active_index
           )

    # Partial index for filtering documents by type (themes query)
    create index(:documents, [:type],
             where: "deleted_at IS NULL",
             name: :documents_type_active_index
           )

    # Drop existing full unique index on channels.slug
    drop index(:channels, [:slug], name: :channels_slug_index)

    # Replace with partial unique index allowing slug reuse after soft-delete
    create unique_index(:channels, [:slug],
             where: "deleted_at IS NULL",
             name: :channels_slug_active_unique_index
           )
  end
end
