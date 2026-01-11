# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen is a real-time collaborative presentation editor built with SvelteKit 2, Svelte 5, TypeScript, and PostgreSQL via Prisma ORM.

The app features user authentication, document management, real-time collaboration via Yjs/WebRTC, and email verification.

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
pnpm test             # Run all tests (unit + e2e)
pnpm test:unit        # Vitest unit tests only
pnpm test:e2e         # Playwright e2e tests only

# Database
pnpm db:start         # Start PostgreSQL + MailDev containers
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Create new migration
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:seed          # Seed database with test data
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
- `e2e/` - Playwright end-to-end tests

### Database Models

User → Session (auth), Document → DocumentUpdate (change tracking), DocumentUser (sharing/collaboration)

### Presentation System

The presentation feature uses a rich text editor with real-time collaboration:

- **Editor**: ProseMirror with custom schema (`src/lib/editor/schema.ts`) supporting paragraphs, headings, lists, images, blockquotes, and slide dividers
- **Collaboration**: Yjs with y-prosemirror for CRDT-based real-time sync, WebRTC for peer-to-peer connections
- **Segmentation**: Content is automatically segmented for presenter navigation:
  - Stable UUIDs assigned to each segment via `segmentId` attribute
  - Long paragraphs (>100 chars) split into sentence nodes
  - Segment plugin (`src/lib/editor/segment-plugin.ts`) handles ID assignment and sentence splitting
  - Visual segment boundaries shown in editor with subtle left borders
- **Presenter Mode**: Navigate content segment-by-segment with keyboard/click controls
  - ID-based position tracking (stable across live edits from collaborators)
  - Viewer auto-scrolls to active segment

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_*` - Email configuration (MailDev runs on port 1025 locally)
- `APP_URL` - Application URL for email links

## Testing Notes

- Unit tests use Vitest with Playwright browser provider for component tests
- E2E tests require `ALLOW_TEST_ENDPOINTS=true` for test API endpoints
- Run `pnpm db:start` before e2e tests to ensure database and mail services are running
