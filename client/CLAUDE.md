# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen is a real-time collaborative presentation editor built with SvelteKit 2, Svelte 5, TypeScript, and PostgreSQL via Prisma ORM.

The app features user authentication, document management, real-time collaboration via Yjs/Hocuspocus/WebRTC, offline support via IndexedDB, and PWA capabilities for native app-like experience.

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview built app

# Code Quality
pnpm check            # TypeScript + Svelte type checking
pnpm lint             # Check formatting + linting
pnpm format           # Auto-format code

# Testing
pnpm test             # Run unit tests
pnpm test:unit        # Vitest unit tests only
# E2e tests live at the repo root — run `pnpm test:e2e` from there

# Database
pnpm db:start         # Start PostgreSQL + MailDev containers
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Create new migration
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Seed database with test data

# Hocuspocus (collaboration server)
pnpm hocuspocus       # Start Hocuspocus server
pnpm hocuspocus:dev   # Start with file watching
```

## Architecture

### Server-Side Patterns

- **Authentication**: Custom session-based auth using Argon2 password hashing and SHA256 session tokens. Sessions stored in database, validated on every request via `src/lib/server/auth.ts`. User/session injected into `event.locals`.

- **Remote Functions**: Server actions defined in `data.remote.ts` files using SvelteKit's experimental remote functions (`command()` and `form()` helpers from `$app/server`). This is the primary pattern for form handling.

- **Database**: Prisma ORM with PostgreSQL. Schema at `prisma/schema.prisma`. Generated client in `generated/prisma/`. All entities use soft deletes via `deletedAt` field.

### Frontend Patterns

- **Svelte 5 Runes**: Uses `$state()` for reactive state. Experimental async components enabled.

- **Validation**: Valibot schemas in `src/lib/validation.ts` shared between client and server.

- **Toast Notifications**: Global store at `src/lib/toast.svelte.ts` with `Toasts.svelte` component in root layout.

### Key Directories

- `src/routes/` - SvelteKit pages and server handlers
- `src/lib/server/` - Server-only code (auth, database, email)
- `src/lib/components/` - Reusable Svelte components
- `src/lib/editor/` - ProseMirror editor schema, plugins, and utilities
- `prisma/` - Database schema and migrations
- `../e2e/` - Playwright end-to-end tests (at repo root)

### Database Models

User → Session (auth), Document → DocumentUpdate (change tracking), DocumentUser (sharing/collaboration)

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
  - Presenter sync via shared awareness channel
- **Format Modes**: Control how content is displayed to viewers
  - `single`: shows only 1 logical segment per slide
  - `minimal`: Shows only 2 logical segments at a time (current pair)
  - `block`: Shows a single block of contiguous content per slide
  - `maximal`: Shows only the current segment (and its merge group)
  - `scrolling`: Shows all segments with fading effect on past segments
  - Format stored in document metadata via `doc.format`
- **Logical Segments**: For slide grouping purposes, segments are counted as "logical units":
  - A regular paragraph/heading/list-item = 1 logical segment
  - A sentence-split paragraph (all sentences combined) = 1 logical segment
  - This ensures a long paragraph with multiple sentences doesn't span across slides
  - Navigation still treats each sentence as a separate presentation point
  - Example with minimal mode (2 logical segments per slide):
    - Segments: [Para1], [LongPara sent1], [LongPara sent2], [Para3], [Para4]
    - Slide 1: Para1 + LongPara (all sentences) — 2 logical segments
    - Slide 2: Para3 + Para4 — 2 logical segments
- **PresentationViewer Component** (`src/lib/components/presentation/PresentationViewer.svelte`):
  - Renders Yjs content as HTML with segment wrapping
  - Three display modes:
    - `view`: Basic rendering, no segment filtering
    - `present`: Full content with segment highlighting (for presenter)
    - `follow`: Applies format modes to filter/style segments (for viewers)
  - Format effects only apply in `follow` mode
  - Presenter sees all segments regardless of format mode
  - Viewer defaults to first segment if no presenter position is set
  - **Sentence Segment Handling**:
    - `shouldSplitIntoSentences()` verifies sentence's `parentSegmentId` matches the DOM element's `segmentId`
    - Prevents cross-paragraph rendering when segment indices are misaligned
    - `renderSentenceSegments()` renders visible sentences with proper wrapping
    - Paragraphs with no visible sentences are skipped entirely (return empty string)
    - Non-sentence paragraphs verify segment ID matches before rendering via `wrapWithSegment()`
  - In `follow` mode, the following rules apply for automatically arranging the content into slides:
    - a `presentation point` is a segment of a presentation that can be selected
    - merged segments should be treated as a single segment in the viewer
    - when long paragraphs are automatically segmented, do not split the paragraph across slides. treat the paragraph as a single logical segment within the formatting mode, but still navigate the split sentences as individual presentation points.
    - when a long paragraph is split into sentences, keep all sentences on the slide of the first sentence for all follow modes. Only start a new slide for the following block element.
    - a `presentation block` is a contiguous set of elements, each having content
    - any empty top level block node is a candidate `virtual slide divider`
    - new slides are started either by a `virtual slide divider` (depending on the `Format Mode`) or by `slide_divider` block node
    - if the content of a slide overflows the `slide viewport`, the content should scroll as the `presentation points` are selected
    - empty top level blocks at the start or end of a slide should be trimmed
    - the `slide viewport` is the rectangle within the slide where content can be rendered
    - the dimensions of the `slide viewport` are defined by the theme

### Document Stores (`src/lib/stores/documents/`)

Typed Svelte stores wrapping Yjs documents with reactive properties:

- **base.svelte.ts**: Core document infrastructure with dual-provider sync
  - Hocuspocus provider (primary) for server-mediated sync
  - WebRTC provider for P2P awareness sync (presenter position, cursors)
  - IndexedDB persistence via y-indexeddb for offline support
  - `createReactiveMetaProperty()` for reactive Yjs Map bindings
- **presentation.svelte.ts**: Presentation documents (title, themeId, content, theme overrides)
- **theme.svelte.ts**: Theme documents with inheritance (font, colors, viewport, backgroundImage)
- **event.svelte.ts**: Event documents (presentations array, channels)
- **awareness.svelte.ts**: Dual-provider awareness for presenter sync
  - Writes to both Hocuspocus and WebRTC awareness
  - Reads from most recent (timestamp-based conflict resolution)

### Offline Support & PWA

- **IndexedDB**: y-indexeddb caches documents locally for offline editing
- **Service Worker**: Workbox caches static assets (JS, CSS, images, fonts)
- **PWA Manifest**: Enables "Add to Home Screen" on mobile/desktop
- **Dual Providers**: Hocuspocus (when online) + WebRTC (P2P fallback)
- **Configuration**: `vite.config.ts` contains SvelteKitPWA plugin setup

## Environment Setup

Copy `.env.example` to `.env`. Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_*` - Email configuration (MailDev runs on port 1025 locally)
- `APP_URL` - Application URL for email links

## Testing Notes

- Unit tests use Vitest with Playwright browser provider for component tests
- E2E tests live at the repo root (`e2e/`) and are run via `pnpm test:e2e` from the root
- E2E tests require `ALLOW_TEST_ENDPOINTS=true` for test API endpoints
- Run `pnpm db:start` before e2e tests to ensure database and mail services are running
