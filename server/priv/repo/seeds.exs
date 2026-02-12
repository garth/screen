# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Idempotent: checks for existing data before inserting.

require Ecto.Query

alias Screen.Repo
alias Screen.Accounts
alias Screen.Accounts.User
alias Screen.Documents
alias Screen.Documents.{Document, DocumentUser}
alias Screen.Channels

# --- Users ---

create_user = fn attrs ->
  case Accounts.get_user_by_email(attrs.email) do
    nil ->
      {:ok, user} = Accounts.register_user(Map.take(attrs, [:email, :first_name, :last_name]))

      user =
        if attrs[:password] do
          {:ok, {user, _}} =
            Accounts.update_user_password(user, %{
              password: attrs.password,
              password_confirmation: attrs.password
            })

          user
        else
          user
        end

      user
      |> User.confirm_changeset()
      |> Repo.update!()

    user ->
      user
  end
end

test_user =
  create_user.(%{
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    password: "testtesttesttest"
  })

alice =
  create_user.(%{
    email: "alice@example.com",
    first_name: "Alice",
    last_name: "Johnson",
    password: "testtesttesttest"
  })

bob =
  create_user.(%{
    email: "bob@example.com",
    first_name: "Bob",
    last_name: "Smith",
    password: "testtesttesttest"
  })

IO.puts("Created users: test@example.com, alice@example.com, bob@example.com")
IO.puts("Password for all: testtesttesttest")

# --- Helper to find or create documents ---

find_or_create_document = fn user_id, type, name, attrs ->
  existing =
    Document
    |> Ecto.Query.where(
      [d],
      d.user_id == ^user_id and d.name == ^name and d.type == ^type and is_nil(d.deleted_at)
    )
    |> Repo.one()

  case existing do
    nil ->
      {:ok, doc} = Documents.create_document(user_id, type, Map.put(attrs, :name, name))
      doc

    doc ->
      doc
  end
end

# --- Themes ---

system_theme =
  find_or_create_document.(test_user.id, "theme", "Default Theme", %{
    is_public: true,
    meta: %{
      "isSystemTheme" => true,
      "font" => "sans-serif",
      "colors" => %{
        "background" => "#1e1e2e",
        "text" => "#cdd6f4",
        "primary" => "#b4befe",
        "secondary" => "#f5c2e7"
      }
    }
  })

light_theme =
  find_or_create_document.(test_user.id, "theme", "Light Minimal", %{
    is_public: true,
    meta: %{
      "isSystemTheme" => true,
      "font" => "serif",
      "colors" => %{
        "background" => "#eff1f5",
        "text" => "#4c4f69",
        "primary" => "#7287fd",
        "secondary" => "#dc8a78"
      }
    }
  })

alice_theme =
  find_or_create_document.(alice.id, "theme", "Neon Glow", %{
    meta: %{
      "font" => "monospace",
      "colors" => %{
        "background" => "#0a0a0f",
        "text" => "#e0e0e0",
        "primary" => "#00ff88",
        "secondary" => "#ff00aa"
      }
    }
  })

IO.puts("Created themes: Default Theme, Light Minimal, Neon Glow")

# --- Presentations ---

welcome_pres =
  find_or_create_document.(test_user.id, "presentation", "Welcome to Chapel Screen", %{
    is_public: true,
    meta: %{"themeId" => system_theme.id}
  })

team_pres =
  find_or_create_document.(test_user.id, "presentation", "Team Standup", %{
    meta: %{"themeId" => system_theme.id}
  })

roadmap_pres =
  find_or_create_document.(test_user.id, "presentation", "Product Roadmap Q2", %{
    meta: %{"themeId" => light_theme.id}
  })

alice_pres =
  find_or_create_document.(alice.id, "presentation", "Design System Overview", %{
    meta: %{"themeId" => alice_theme.id}
  })

bob_pres =
  find_or_create_document.(bob.id, "presentation", "Engineering Architecture", %{
    is_public: true,
    meta: %{"themeId" => system_theme.id}
  })

shared_pres =
  find_or_create_document.(alice.id, "presentation", "Shared Project Brief", %{
    meta: %{"themeId" => light_theme.id}
  })

IO.puts("Created presentations")

# --- Document sharing ---

share_document = fn document_id, user_id, can_write ->
  existing =
    DocumentUser
    |> Ecto.Query.where(
      [du],
      du.document_id == ^document_id and du.user_id == ^user_id and is_nil(du.deleted_at)
    )
    |> Repo.one()

  unless existing do
    %DocumentUser{}
    |> DocumentUser.changeset(%{can_write: can_write})
    |> Ecto.Changeset.put_change(:document_id, document_id)
    |> Ecto.Changeset.put_change(:user_id, user_id)
    |> Repo.insert!()
  end
end

# Share "Shared Project Brief" with test_user (read-write) and bob (read-only)
share_document.(shared_pres.id, test_user.id, true)
share_document.(shared_pres.id, bob.id, false)

# Share alice's presentation with bob (read-write)
share_document.(alice_pres.id, bob.id, true)

IO.puts("Created document shares")

# --- Events ---

conference_event =
  find_or_create_document.(test_user.id, "event", "Chapel Conference 2026", %{
    is_public: true
  })

private_event =
  find_or_create_document.(test_user.id, "event", "Internal Review", %{
    is_public: false
  })

alice_event =
  find_or_create_document.(alice.id, "event", "Design Sprint", %{
    is_public: true
  })

IO.puts("Created events")

# --- Channels ---

find_or_create_channel = fn user_id, event_document_id, name, slug ->
  case Channels.get_channel_by_slug(slug) do
    nil ->
      {:ok, channel} =
        Channels.create_channel(user_id, event_document_id, %{name: name, slug: slug})

      channel

    channel ->
      channel
  end
end

_main_stage =
  find_or_create_channel.(
    test_user.id,
    conference_event.id,
    "Main Stage",
    "chapel-conference-main"
  )

_breakout =
  find_or_create_channel.(
    test_user.id,
    conference_event.id,
    "Breakout Room",
    "chapel-conference-breakout"
  )

_review_channel =
  find_or_create_channel.(
    test_user.id,
    private_event.id,
    "Review Session",
    "internal-review"
  )

_design_channel =
  find_or_create_channel.(
    alice.id,
    alice_event.id,
    "Design Showcase",
    "design-sprint-showcase"
  )

IO.puts("Created channels")

IO.puts("""

Seed data complete!

Users:
  - test@example.com (password: testtesttesttest)
  - alice@example.com (password: testtesttesttest)
  - bob@example.com (password: testtesttesttest)

Themes: Default Theme (system), Light Minimal (system), Neon Glow (Alice's)
Presentations: 6 total across users, with sharing
Events: Chapel Conference 2026, Internal Review, Design Sprint
Channels: 4 total across events
""")
