defmodule Screen.Repo.Migrations.FixDocumentUpdatesUserIdCascade do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE document_updates DROP CONSTRAINT document_updates_user_id_fkey"
    execute "ALTER TABLE document_updates ALTER COLUMN user_id DROP NOT NULL"

    execute """
    ALTER TABLE document_updates
    ADD CONSTRAINT document_updates_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    """
  end

  def down do
    execute "ALTER TABLE document_updates DROP CONSTRAINT document_updates_user_id_fkey"

    execute "UPDATE document_updates SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL"

    execute "ALTER TABLE document_updates ALTER COLUMN user_id SET NOT NULL"

    execute """
    ALTER TABLE document_updates
    ADD CONSTRAINT document_updates_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    """
  end
end
