# Chapel Screen

A real-time collaborative presentation editor with live presenter sync, offline support, and PWA capabilities.

## Overview

Chapel Screen lets users create presentations with a rich text editor, collaborate in real time, and present content with segment-by-segment navigation synced across presenter and viewer devices. Content is automatically segmented for presentation, with support for multiple display formats (single slide, minimal, block, scrolling, etc.).

The project is a monorepo with two applications:

- **`client/`** — SvelteKit 2 static SPA (frontend only)
- **`server/`** — Phoenix 1.8 backend (auth, data, Yjs sync)

## Tech Stack

### Client

- **SvelteKit 2** / **Svelte 5** with TypeScript
- **ProseMirror** — rich text editor with custom schema (headings, lists, blockquotes, images, slide dividers)
- **Yjs** — CRDT-based real-time collaboration
- **y-phoenix-channel** — Yjs sync over Phoenix Channels
- **y-indexeddb** — offline document persistence
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
- **Elixir** ~> 1.15
- **Docker** (for PostgreSQL)

## Getting Started

### Server

```bash
cd server
cp .env.example .env  # If needed
mix setup             # Install deps, create DB, migrate, build assets
mix phx.server        # Start Phoenix server
```

The server runs at `http://localhost:4000`.

### Client

```bash
pnpm install              # Install all workspace dependencies
cd client
cp .env.example .env      # Configure VITE_WS_URL and VITE_PHOENIX_URL
pnpm dev                  # Start Vite dev server
```

The client runs at `http://localhost:5173` and connects to the Phoenix server for auth and data sync.

## Development

### Root Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start client + Phoenix server (concurrent)
pnpm test:unit        # Run client + server unit tests
pnpm test:e2e         # Playwright e2e tests
```

### Client Commands (`client/`)

```bash
pnpm dev              # Vite dev server
pnpm build            # Production build (static SPA)
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # Prettier + ESLint
pnpm format           # Auto-format code
pnpm test:unit        # Vitest unit tests
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

Documents use Yjs CRDTs for conflict-free real-time editing, synced over Phoenix Channels via `y-phoenix-channel`. Each document is managed by a per-document GenServer using Yex (Elixir Yjs NIF bindings) with Ecto persistence.

Awareness data (presenter position, cursors) syncs through the same channel provider.

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
