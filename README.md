# Chapel Screen

A real-time collaborative presentation editor with presenter mode, offline support, and PWA capabilities.

## Features

- Rich text editor with headings, lists, images, blockquotes
- Real-time collaboration via Hocuspocus server and WebRTC P2P
- Automatic content segmentation for presenter navigation
- Presenter mode with keyboard/click segment navigation
- Stable segment IDs that persist across live edits
- Long paragraphs automatically split into sentences
- Slide dividers for multi-slide presentations
- Theme customization
- **Offline editing** with IndexedDB persistence
- **PWA support** - install as a native app on mobile/desktop
- **Presenter sync** - viewers follow presenter position in real-time

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS
- **Editor**: ProseMirror with custom schema
- **Collaboration**: Yjs, y-prosemirror, Hocuspocus (server), y-webrtc (P2P), y-indexeddb (offline)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Custom session-based with Argon2 password hashing
- **PWA**: vite-plugin-pwa with Workbox service worker
- **Testing**: Vitest (unit), Playwright (e2e)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL and MailDev)

### Setup

```bash
# Install dependencies
pnpm install

# Start database and mail services
pnpm db:start

# Copy environment file and configure
cp .env.example .env

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Commands

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

### Presentation Segmentation

The presentation editor automatically segments content for presenter navigation:

1. **Segment Nodes**: Paragraphs, headings, list items, images, and blockquotes are segments
2. **Stable IDs**: Each segment gets a UUID (e.g., `seg-a1b2c3d4`) stored as an attribute
3. **Sentence Splitting**: Paragraphs over 100 characters are split into sentence nodes
4. **Visual Boundaries**: Subtle left borders indicate segment boundaries in the editor
5. **ID-Based Navigation**: Presenter tracks position by segment ID, not index, so live edits from collaborators don't disrupt viewing

### Real-Time Collaboration

- Yjs provides CRDT-based conflict-free merging
- y-prosemirror bridges ProseMirror and Yjs
- Hocuspocus server for reliable document sync and persistence
- y-webrtc for P2P awareness sync (presenter position, cursors)
- y-indexeddb for offline persistence and fast initial loads

### Offline Support & PWA

- Documents cached locally via IndexedDB
- Service worker caches static assets for offline access
- PWA manifest enables "Add to Home Screen" on mobile
- Dual-provider architecture: Hocuspocus (primary) + WebRTC (fallback)
- Automatic sync when connection is restored

## License

MIT
