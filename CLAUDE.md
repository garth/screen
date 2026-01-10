# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chapel Screen (Elastic Time) is a time tracking web application built with SvelteKit 2, Svelte 5, TypeScript, and PostgreSQL via Prisma ORM. It features user authentication, document management, and email verification.

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
- `prisma/` - Database schema and migrations
- `e2e/` - Playwright end-to-end tests

### Database Models

User → Session (auth), Document → DocumentUpdate (change tracking), DocumentUser (sharing/collaboration)

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_*` - Email configuration (MailDev runs on port 1025 locally)
- `APP_URL` - Application URL for email links

## Testing Notes

- Unit tests use Vitest with Playwright browser provider for component tests
- E2E tests require `ALLOW_TEST_ENDPOINTS=true` for test API endpoints
- Run `pnpm db:start` before e2e tests to ensure database and mail services are running
