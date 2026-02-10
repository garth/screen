This is the Phoenix 1.8 backend for Chapel Screen, a real-time collaborative presentation editor.

## Chapel Screen Server Architecture

### Key Modules

- **`Screen.Documents.DocServer`** — Per-document GenServer managing Yjs state via `Yex.DocServer`. Handles observer broadcasting, user attribution, database persistence, and debounced meta sync (2-10s). Uses Registry + DynamicSupervisor (`DocRegistry`/`DocSupervisor`).
- **`Screen.Documents.Persistence`** — Implements `Yex.Sync.SharedDoc.PersistenceBehaviour` for loading document state from the database on bind.
- **`ScreenWeb.DocumentChannel`** — Handles `document:*` topics. Checks permissions on join, returns `read_only` flag. Read-only clients can only send sync step1 and awareness. Delegates message processing to `DocServer`.
- **`ScreenWeb.UserChannel`** — Handles `user:{userId}` channel for profile, themes, and document/channel mutations.
- **`ScreenWeb.UserSocket`** — Authenticates via session token. Registers `document:*` and `user:*` channels.

### Database Schemas

All schemas use `ExCuid2` string primary keys and `deleted_at` for soft deletes.

- **`Screen.Accounts.User`** — email (citext, unique), first_name, last_name, discoverable
- **`Screen.Accounts.UserToken`** — session/login/change tokens with expiry
- **`Screen.Accounts.Scope`** — Context struct (not a DB schema) holding user reference for authorization
- **`Screen.Documents.Document`** — name, type ("presentation"/"theme"/"event"), is_public, meta (map), base_document_id (self-referential for inheritance)
- **`Screen.Documents.DocumentUpdate`** — binary Yjs update with user_id attribution
- **`Screen.Documents.DocumentUser`** — can_write permission per user per document
- **`Screen.Channels.Channel`** — name, slug (unique), event_document_id

### Document Lifecycle

1. Client joins `document:{id}` channel → `DocumentChannel.join/3` checks permissions
2. `DocServer.find_or_start/1` creates or finds existing GenServer
3. DocServer loads persisted updates from `document_updates` table (with base document inheritance)
4. Channel process registers as observer and syncs via y-protocols binary messages
5. Updates are persisted with user attribution; meta map changes are debounced to the `documents.meta` column
6. When all observers disconnect, the DocServer stops

### Contexts

- **`Screen.Accounts`** — User CRUD, auth tokens, session management
- **`Screen.Documents`** — Document CRUD, permission checks, update persistence
- **`Screen.Channels`** — Channel management for events

## Commands

```bash
mix setup             # Install deps, create DB, migrate, build assets
mix phx.server        # Start Phoenix on port 4000
mix test              # ExUnit tests
mix test path/to/test.exs   # Run single test file
mix precommit         # compile --warnings-as-errors, deps.unlock --unused, format, test
```

## Project Guidelines

- Do not include `Co-Authored-By` lines in commit messages
- Use `mix precommit` alias when you are done with all changes and fix any pending issues
- Use the already included `:req` (`Req`) library for HTTP requests

### Authentication

Phoenix handles auth via LiveView pages. `phx.gen.auth` creates router plugs and `live_session` scopes:

- `:fetch_current_scope_for_user` — included in the default browser pipeline
- `:require_authenticated_user` — redirects unauthenticated users to login
- `live_session :require_authenticated_user` — for routes requiring auth
- `live_session :current_user` — for routes that work with or without auth
- `@current_scope` is assigned (not `@current_user`); use `@current_scope.user` in templates

### Elixir Reminders

- Lists don't support index access (`mylist[i]`); use `Enum.at/2`
- Variables are immutable but rebindable; bind block expression results to variables
- Don't nest modules in the same file
- Don't use `String.to_atom/1` on user input
- Access struct fields directly (`my_struct.field`), not via `[]` syntax
- Use `Ecto.Changeset.get_field/2` for changeset fields
- Predicate functions end in `?`, not `is_` prefix (except guards)

### Testing

- Use `start_supervised!/1` to start processes in tests
- Avoid `Process.sleep/1`; use `Process.monitor/1` + `assert_receive {:DOWN, ...}`
- Use `_ = :sys.get_state/1` to synchronize before assertions

### Ecto

- Preload associations in queries when accessed in templates
- Use `:string` type for text columns in schemas
- Set `user_id` programmatically, not via `cast`
- Use `mix ecto.gen.migration` to generate migrations

### LiveView

- Use `<.link navigate={href}>` not deprecated `live_redirect`
- Use streams for collections, not assigns
- HEEx: use `{...}` for attribute interpolation, `<%= %>` for block constructs in tag bodies
- Always use `to_form/2` and `<.input>` for forms
