defmodule Screen.Repo.Migrations.AddCheckConstraintOnDocumentsType do
  use Ecto.Migration

  def change do
    create constraint(:documents, :documents_type_check,
             check: "type IN ('presentation', 'theme', 'event')"
           )
  end
end
