defmodule Screen.Repo.Migrations.AlterUsersAddProfileFields do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :first_name, :string, null: false
      add :last_name, :string, null: false
      add :discoverable, :boolean, default: false, null: false
      add :deleted_at, :utc_datetime
    end
  end
end
