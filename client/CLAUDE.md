# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen is a real-time collaborative presentation editor. The client is a pure static SPA built with SvelteKit 2, Svelte 5, and TypeScript. All server-side logic (auth, data, sync) is handled by the Phoenix backend — the client connects via Phoenix Channels and Yjs documents.

Auth pages (login, register, forgot/reset password) are served by Phoenix LiveView. The SPA handles everything else: document editing, presentations, preferences.

## Commands

```bash
# Development
pnpm dev              # Start Vite dev server
pnpm build            # Build static SPA (outputs to build/)
pnpm preview          # Preview built app

# Code Quality
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # ESLint

# Testing
pnpm test             # Run unit tests
pnpm test:unit        # Vitest unit tests only
# E2e tests live at the repo root — run `pnpm test:e2e` from there
```

## Architecture

### Static SPA

The client uses `adapter-static` with `fallback: 'index.html'` for client-side routing. SSR and prerendering are disabled (`src/routes/+layout.ts`). Phoenix serves the built static files with index.html fallback.

### Data Flow — All Live via Channels

All data flows through WebSocket channels or Yjs documents — no REST endpoints.

| Data                               | Mechanism                                              |
| ---------------------------------- | ------------------------------------------------------ |
| Auth state (user identity)         | `user:{userId}` channel join reply + push events       |
| Document content                   | Yjs sync protocol via `document:{id}` channel          |
| Document metadata (title, themeId) | Yjs `meta` map on each doc                             |
| Permissions (isOwner, canWrite)    | `document:{id}` channel join reply                     |
| Document list                      | `user-{userId}-documents` Yjs doc via document channel |
| Theme data                         | Each theme is a Yjs doc synced via document channel    |
| Theme list                         | `user:{userId}` channel push events                    |
| User profile                       | `user:{userId}` channel push events                    |

### Mutations via User Channel

| Action          | Channel Event                                |
| --------------- | -------------------------------------------- |
| Create document | push `"create_document"`                     |
| Delete document | push `"delete_document"`                     |
| Update document | push `"update_document"`                     |
| Create channel  | push `"create_channel"`                      |
| Delete channel  | push `"delete_channel"`                      |
| Update profile  | push `"update_profile"`                      |
| Change password | push `"change_password"`                     |
| Delete account  | push `"delete_account"`                      |
| Logout          | Navigate to `/users/log-out` (Phoenix route) |

### Phoenix Channel Providers

- **`src/lib/providers/phoenix-socket.ts`** — shared Socket singleton connecting to `VITE_WS_URL`
- **`src/lib/providers/user-channel.ts`** — manages `user:{userId}` channel for profile, themes, and mutations
- **`src/lib/stores/auth.svelte.ts`** — global auth state using Svelte 5 runes; exposes `auth.user`, `auth.themes`, `auth.userChannel`

### Document Sync

Yjs documents sync via `y-phoenix-channel` (PhoenixChannelProvider), which implements the full y-protocols sync over Phoenix Channels with native binary WebSocket frames. This replaces the previous Hocuspocus provider.

### Frontend Patterns

- **Svelte 5 Runes**: Uses `$state()` for reactive state
- **Validation**: Valibot schemas in `src/lib/validation.ts`
- **Toast Notifications**: Global store at `src/lib/toast.svelte.ts` with `Toasts.svelte` component in root layout

### Key Directories

- `src/routes/` - SvelteKit pages (SPA, no server routes)
- `src/lib/providers/` - Phoenix socket and channel management
- `src/lib/stores/` - Svelte stores including auth and document stores
- `src/lib/components/` - Reusable Svelte components
- `src/lib/editor/` - ProseMirror editor schema, plugins, and utilities
- `../e2e/` - Playwright end-to-end tests (at repo root)

### Presentation System

The presentation feature uses a rich text editor with real-time collaboration:

- **Editor**: ProseMirror with custom schema (`src/lib/editor/schema.ts`) supporting paragraphs, headings, lists, images, blockquotes, and slide dividers
- **Schema Types** (`src/lib/editor/schema.ts`):
  - Block nodes: `paragraph`, `heading` (levels 1-3), `bullet_list`, `ordered_list`, `list_item`, `blockquote`, `attribution`, `slide_divider`
  - Inline nodes: `text`, `sentence` (for split paragraphs), `image`, `hard_break`
  - Marks: `strong`, `em`, `underline`, `strikethrough`, `code`, `link`
  - Segment attributes: `segmentId` and `mergeGroupId` on paragraph, heading, list_item, blockquote, image
- **Collaboration**: Yjs with y-prosemirror for CRDT-based real-time sync
- **Segmentation**: Content is automatically segmented for presenter navigation:
  - Stable UUIDs assigned to each segment via `segmentId` attribute
  - Long paragraphs (>100 chars) split into sentence nodes
  - Segment plugin (`src/lib/editor/segment-plugin.ts`) handles ID assignment and sentence splitting
  - Visual segment boundaries shown in editor with subtle left borders
- **Merged Segments**: Multiple segments can be merged to present as a single unit:
  - `mergeGroupId` attribute shared by segments in the same group
  - Merge via toolbar button or `Cmd/Ctrl+M`, unmerge via `Cmd/Ctrl+Shift+M`
  - Merged segments show blue background/border in editor
  - Only segments on the same slide can be merged
  - Deleting any segment from a group dissolves the entire group
  - Merge commands in `src/lib/editor/merge-commands.ts`
- **Presenter Mode**: Navigate content segment-by-segment with keyboard/click controls
  - ID-based position tracking (stable across live edits from collaborators)
  - Merged segments navigate and highlight as one unit
  - Viewer auto-scrolls to active segment
  - Presenter sync via PhoenixChannelProvider awareness
- **Format Modes**: Control how content is displayed to viewers
  - `single`: shows only 1 logical segment per slide
  - `minimal`: Shows only 2 logical segments at a time (current pair)
  - `block`: Shows a single block of contiguous content per slide
  - `maximal`: Shows all segments on the current slide
  - `scrolling`: Shows all segments with fading effect on past segments
  - Format stored in document metadata via `doc.format`
- **Logical Segments**: For slide grouping purposes, segments are counted as "logical units":
  - A regular paragraph/heading/list-item = 1 logical segment
  - A sentence-split paragraph (all sentences combined) = 1 logical segment
  - This ensures a long paragraph with multiple sentences doesn't span across slides
  - Navigation still treats each sentence as a separate presentation point
- **PresentationViewer Component** (`src/lib/components/presentation/PresentationViewer.svelte`):
  - Renders Yjs content as HTML with segment wrapping
  - Three display modes: `view`, `present`, `follow`
  - Format effects only apply in `follow` mode

### Document Stores (`src/lib/stores/documents/`)

Typed Svelte stores wrapping Yjs documents with reactive properties:

- **base.svelte.ts**: Core document infrastructure with PhoenixChannelProvider sync
  - PhoenixChannelProvider for server-mediated Yjs sync via Phoenix Channels
  - IndexedDB persistence via y-indexeddb for offline support
  - `createReactiveMetaProperty()` for reactive Yjs Map bindings
- **presentation.svelte.ts**: Presentation documents (title, themeId, content, theme overrides)
- **theme.svelte.ts**: Theme documents with inheritance (font, colors, viewport, backgroundImage)
- **event.svelte.ts**: Event documents (presentations array, channels)
- **awareness.svelte.ts**: PhoenixChannelProvider awareness for presenter sync
- **presenter-awareness.svelte.ts**: Dedicated presenter awareness channel

### Offline Support & PWA

- **IndexedDB**: y-indexeddb caches documents locally for offline editing
- **Service Worker**: Workbox caches static assets (JS, CSS, images, fonts)
- **PWA Manifest**: Enables "Add to Home Screen" on mobile/desktop
- **Configuration**: `vite.config.ts` contains SvelteKitPWA plugin setup

## Environment Setup

Copy `.env.example` to `.env`. Required variables:

- `VITE_WS_URL` — Phoenix server WebSocket URL (e.g., `ws://localhost:4000/socket`)
- `VITE_PHOENIX_URL` — Phoenix server URL for auth redirects (e.g., `http://localhost:4000`)

## Testing Notes

- Unit tests use Vitest with Playwright browser provider for component tests
- E2E tests live at the repo root (`e2e/`) and are run via `pnpm test:e2e` from the root
