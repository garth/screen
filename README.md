# Chapel Screen

A real-time collaborative presentation editor with live presenter sync, offline support, and PWA capabilities.

## Overview

Chapel Screen lets users create presentations with a rich text editor, collaborate in real time, and present content with segment-by-segment navigation synced across presenter and viewer devices. Content is automatically segmented for presentation, with support for multiple display formats (single slide, minimal, block, scrolling, etc.).

The project is a monorepo with two applications:

- **`client/`** — SvelteKit 2 frontend with a Hocuspocus collaboration server
- **`server/`** — Phoenix 1.8 backend providing an alternative Yjs sync layer

## Tech Stack

### Client

- **SvelteKit 2** / **Svelte 5** with TypeScript
- **ProseMirror** — rich text editor with custom schema (headings, lists, blockquotes, images, slide dividers)
- **Yjs** — CRDT-based real-time collaboration
- **Hocuspocus** — WebSocket server for Yjs document sync
- **y-webrtc** — P2P awareness sync (presenter position, cursors)
- **y-indexeddb** — offline document persistence
- **Prisma 7** with PostgreSQL
- **Tailwind CSS v4** / **DaisyUI 5** with Catppuccin themes
- **Valibot** — schema validation
- **PWA** via Workbox service worker

### Server

- **Phoenix 1.8** with LiveView 1.1
- **Yex** — Elixir NIF bindings for Yjs
- **Ecto** with PostgreSQL
- **Swoosh** — email delivery

## Prerequisites

- **Node.js** >= 24.12.0
- **pnpm** 10.28+
- **Elixir** ~> 1.15 (for the server)
- **Docker** (for PostgreSQL and MailDev)

## Getting Started

### Client

```bash
cd client
cp .env.example .env
pnpm install
pnpm db:start         # Start PostgreSQL (port 5432) + MailDev
pnpm db:push          # Push schema to database
pnpm dev              # Start dev server + Hocuspocus collaboration server
```

The app runs at `http://localhost:5173` and the Hocuspocus server at `ws://localhost:1234`.

### Server

```bash
cd server
mix setup             # Install deps, create DB, migrate, build assets
mix phx.server        # Start Phoenix server
```

The server runs at `http://localhost:4000`.

## Development

### Client Commands

```bash
pnpm dev              # Dev server + Hocuspocus (concurrent)
pnpm build            # Production build
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # Prettier + ESLint
pnpm format           # Auto-format code
pnpm test:unit        # Vitest unit tests
pnpm test:e2e         # Playwright e2e tests
pnpm db:studio        # Prisma Studio GUI
pnpm db:migrate       # Create new Prisma migration
```

### Server Commands

```bash
mix phx.server        # Start dev server
mix test              # Run all tests
mix test path/to.exs  # Run single test file
mix format            # Format code
mix precommit         # Compile (warnings-as-errors), format, test
```

## Architecture

### Real-Time Collaboration

Documents use Yjs CRDTs for conflict-free real-time editing. Two sync backends are available:

1. **Hocuspocus** (client) — Node.js WebSocket server persisting to PostgreSQL via Prisma
2. **Phoenix Channels** (server) — Per-document GenServer using Yex (Elixir Yjs NIF) with Ecto persistence

Awareness data (presenter position, cursors) syncs via WebRTC peer-to-peer connections, with timestamp-based conflict resolution when multiple providers report state.

### Presentation System

Content is authored in a ProseMirror editor with a custom schema. The segment plugin automatically assigns stable UUIDs to content blocks and splits long paragraphs into sentences for granular presenter navigation. Segments can be merged into groups that navigate as a single unit.

Display formats control how content is arranged into slides for viewers:
- **single** — one logical segment per slide
- **minimal** — two logical segments per slide
- **block** — one contiguous content block per slide
- **scrolling** — all content with fading on past segments

### Offline Support

- **IndexedDB** (y-indexeddb) caches documents locally
- **Service Worker** (Workbox) caches static assets
- **PWA manifest** enables install on mobile/desktop
- Changes sync automatically when connectivity resumes
