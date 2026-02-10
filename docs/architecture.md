# Architecture

## Overview

Chapel Screen is a real-time collaborative presentation editor built as a monorepo with two applications:

- **`client/`** — SvelteKit 2 static SPA (TypeScript, Svelte 5, ProseMirror, Yjs)
- **`server/`** — Phoenix 1.8 backend (Elixir, Ecto, Yex Yjs NIF bindings)

The client is a pure static SPA with no server-side rendering. All server-side logic (auth, database, Yjs sync) is handled by Phoenix. The client connects to Phoenix via WebSocket channels for all live data.

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend framework | SvelteKit 2, Svelte 5 | Static SPA (adapter-static), runes syntax |
| Styling | Tailwind CSS 4, DaisyUI 5 | Light and dark themes |
| Rich text editor | ProseMirror | Custom schema with segments |
| Real-time sync | Yjs + y-phoenix-channel | CRDT documents over Phoenix Channels |
| Offline persistence | y-indexeddb | IndexedDB for offline editing |
| Validation | Valibot | Client-side input validation |
| Backend framework | Phoenix 1.8 | LiveView for auth pages, Channels for data |
| Database | PostgreSQL | Managed via Ecto migrations |
| Yjs server | Yex (NIF) | Elixir Yjs bindings via DocServer GenServer |
| Auth | Phoenix LiveView | Session-based with bcrypt password hashing |
| IDs | ExCuid2 | Distributed, sortable 24-char string IDs |

## Data Flow

```
Browser (SPA)
  ├── PhoenixChannelProvider (y-phoenix-channel)
  │     └── Phoenix Channel (document:*) ↔ DocServer (GenServer + Yex) ↔ PostgreSQL
  ├── User Channel (user:{userId})
  │     └── Profile, themes, document CRUD mutations
  └── Phoenix LiveView (auth pages)
        └── Login, register, forgot/reset password
```

### All Data is Live via Channels

No REST endpoints. All data flows through WebSocket channels or Yjs documents:

| Data | Mechanism |
|------|-----------|
| Auth state | `user:{userId}` channel join reply + push events |
| Document content | Yjs sync protocol via `document:{id}` channel |
| Document metadata | Yjs `meta` map on each document |
| Permissions | `document:{id}` channel join reply (`read_only` flag) |
| Document list | `user-{userId}-documents` Yjs doc via document channel |
| Theme data | Each theme is a Yjs doc synced via document channel |
| Theme list | `user:{userId}` channel push events |
| User profile | `user:{userId}` channel push events |

### Mutations via User Channel

| Action | Channel Event |
|--------|---------------|
| Create document | push `"create_document"` |
| Delete document | push `"delete_document"` |
| Update profile | push `"update_profile"` |
| Change password | push `"change_password"` |
| Delete account | push `"delete_account"` |
| Logout | Navigate to `/users/log-out` (Phoenix route) |

## Authentication

Phoenix handles all authentication via LiveView pages. The SPA authenticates through the Phoenix WebSocket using session cookies set by LiveView.

Flow:
1. User visits auth page (served by Phoenix LiveView)
2. Phoenix sets session cookie on successful login/register
3. SPA connects to Phoenix WebSocket, sending session cookie
4. Phoenix validates session and allows channel joins
5. User channel (`user:{userId}`) provides profile and theme data

Auth pages are NOT part of the SPA — they are Phoenix LiveView pages:
- `/users/log-in`
- `/users/register`
- `/users/forgot-password`
- `/users/reset-password`
- `/users/log-out`

## Collaboration Model

Documents use Yjs CRDTs for conflict-free real-time editing:

1. Browser creates a `Y.Doc` and connects via `PhoenixChannelProvider`
2. Provider syncs with Phoenix `DocumentChannel` using binary WebSocket frames
3. `DocumentChannel` delegates to `DocServer` (GenServer holding Yex document state)
4. `DocServer` persists updates to `document_updates` table via Ecto
5. Multiple clients sync through the same `DocServer` instance

### Awareness

Awareness data (presenter position, collaborative cursors) syncs through the same Phoenix Channel provider. No separate WebRTC layer is needed.

### Offline Support

- **IndexedDB**: y-indexeddb caches documents locally for offline editing
- **Service Worker**: Workbox caches static assets (JS, CSS, images, fonts)
- **PWA Manifest**: Enables "Add to Home Screen" on mobile/desktop

## Document Types

All documents are Yjs-based with a shared `meta` Y.Map for metadata. Document types:

### Presentation
- Rich text content (ProseMirror via Y.XmlFragment)
- Auto-segmented for presenter navigation
- Theme overrides (font, colors, background)

### Theme
- Font, background color, text color, viewport area, background image
- System themes are read-only
- Non-system themes can inherit from a base (system) theme

### Event
- List of presentation document IDs
- List of channels with ordered presentations
- Per-channel theme overrides for presentations

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Static SPA + Phoenix backend | Clean separation: Phoenix handles auth/data, SPA handles UI |
| Phoenix Channels for all data | Real-time by default, no REST polling needed |
| Yjs CRDTs | Conflict-free collaborative editing with offline support |
| y-phoenix-channel | Native binary WebSocket frames, same author as Yex |
| PhoenixChannelProvider for awareness | Awareness travels through the channel, no WebRTC needed |
| IndexedDB persistence | Offline editing and faster initial loads |
| ExCuid2 IDs | Distributed, sortable, no DB contention |
| Soft deletes | Data recovery, referential integrity |
| Session-based auth | Simple, secure, easy invalidation via Phoenix |

## Directory Structure

```
screen/
├── client/                          # SvelteKit static SPA
│   ├── src/
│   │   ├── routes/                  # SvelteKit pages (SPA, no server routes)
│   │   │   ├── (app)/               # Authenticated app routes
│   │   │   └── presentation/        # Public presentation routes
│   │   └── lib/
│   │       ├── providers/           # Phoenix socket and channel management
│   │       ├── stores/              # Svelte stores (auth, documents)
│   │       │   └── documents/       # Yjs document stores
│   │       ├── components/          # Reusable Svelte components
│   │       └── editor/              # ProseMirror schema, plugins, utilities
│   └── build/                       # Static SPA output
├── server/                          # Phoenix backend
│   ├── lib/screen/                  # Business logic (Ecto schemas, contexts)
│   │   └── collaboration/           # DocServer, document management
│   └── lib/screen_web/              # Web layer (channels, LiveView, router)
│       ├── channels/                # DocumentChannel, UserChannel
│       └── live/                    # Auth LiveView pages
├── e2e/                             # Playwright end-to-end tests
└── docs/                            # Project documentation
```
