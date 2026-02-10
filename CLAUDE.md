# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen is a real-time collaborative presentation editor. This is a monorepo with two independent applications:

- **`client/`** — SvelteKit 2 frontend + Hocuspocus collaboration server (TypeScript, Svelte 5, ProseMirror, Yjs, Prisma/PostgreSQL)
- **`server/`** — Phoenix 1.8 backend providing an alternative Yjs sync backend via Phoenix Channels and Yex (Elixir Yjs NIF bindings)

Each app has its own detailed `CLAUDE.md` — refer to `client/CLAUDE.md` and `server/CLAUDE.md` for app-specific architecture, patterns, and commands.

## Common Commands

### Client (`client/`)

```bash
pnpm dev              # Dev server + Hocuspocus (concurrent)
pnpm build            # Production build
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # Prettier + ESLint
pnpm test:unit        # Vitest (browser-mode for .svelte.test.ts, Node for .test.ts)
pnpm test:e2e         # Playwright e2e tests
pnpm db:start         # Docker: PostgreSQL (5432) + MailDev
pnpm db:push          # Push Prisma schema to database
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

Both apps implement the same collaboration protocol — Yjs CRDT document sync over WebSocket:

- **Client path**: Browser ↔ Hocuspocus server (`client/src/hocuspocus.ts`, port 1234) ↔ Prisma/PostgreSQL
- **Server path**: Browser ↔ Phoenix Channel (`document:*`) ↔ DocServer (GenServer with Yex) ↔ Ecto/PostgreSQL

Additionally, the client uses WebRTC (y-webrtc) for P2P awareness sync (presenter position, cursors) and IndexedDB (y-indexeddb) for offline persistence.

### Databases

The two apps use separate PostgreSQL instances:
- Client: port 5432 (via `client/compose.yaml`)
- Server: port 5439 (via `server/docker-compose.yml`)

Both have similar schemas (User, Document, DocumentUpdate, DocumentUser, Channel) but are managed independently (Prisma migrations vs Ecto migrations).

## Commit Conventions

- Imperative present tense, no conventional commit prefixes (e.g., "Add presentation viewer specs", "Fix responsive updates")
- Do NOT include `Co-Authored-By` lines
