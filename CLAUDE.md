# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen is a real-time collaborative presentation editor. This is a monorepo with two applications:

- **`client/`** — SvelteKit 2 static SPA (TypeScript, Svelte 5, ProseMirror, Yjs)
- **`server/`** — Phoenix 1.8 backend providing auth, Yjs sync, and all server-side logic via Phoenix Channels and Yex (Elixir Yjs NIF bindings)

Each app has its own detailed `CLAUDE.md` — refer to `client/CLAUDE.md` and `server/CLAUDE.md` for app-specific architecture, patterns, and commands.

## Common Commands

### Root

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start client + Phoenix server (concurrent)
pnpm test:unit        # Run client + server unit tests
pnpm test:e2e         # Playwright e2e tests (from root)
pnpm lint             # Run client ESLint + server compile --warnings-as-errors
pnpm format           # Format all files (Prettier + mix format)
pnpm lint:format      # Check formatting (Prettier + mix format --check-formatted)
```

### Client (`client/`)

```bash
pnpm dev              # Vite dev server
pnpm build            # Production build (static SPA)
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # ESLint
pnpm test:unit        # Vitest (browser-mode for .svelte.test.ts, Node for .test.ts)
```

### Server (`server/`)

```bash
mix setup             # Install deps, create DB, migrate, build assets
mix phx.server        # Start Phoenix on port 4000
mix test              # ExUnit tests
mix test path/to/test.exs   # Run single test file
mix precommit         # compile --warnings-as-errors, deps.unlock --unused, format, test
```

## Architecture

### Collaboration Model

Documents use Yjs CRDTs for conflict-free real-time editing, synced over Phoenix Channels:

- Browser ↔ PhoenixChannelProvider (`y-phoenix-channel`) ↔ Phoenix Channel (`document:*`) ↔ DocServer (GenServer with Yex) ↔ Ecto/PostgreSQL

Awareness data (presenter position, cursors) syncs through the same Phoenix Channel provider. IndexedDB (y-indexeddb) provides offline persistence.

### Auth

Phoenix handles all authentication via LiveView pages (login, register, forgot/reset password). The SPA connects to Phoenix via WebSocket, authenticating through session cookies.

### Database

PostgreSQL managed by the Phoenix server via Ecto migrations:

- Port 5439 (via root `docker-compose.yml`)
- Schema: User, UserToken, Document, DocumentUpdate, DocumentUser, Channel

## Tooling Preferences

- Always use `pnpm`/`pnpx` over `npm`/`npx`

## Commit Conventions

- Imperative present tense, no conventional commit prefixes (e.g., "Add presentation viewer specs", "Fix responsive updates")
- Do NOT include `Co-Authored-By` lines
