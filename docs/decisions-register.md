# Decisions Register

This document records significant architectural, technical, and scope decisions for the Chapel Screen project.

## Decision Index

| ID | Date | Decision | Status |
|----|------|----------|--------|
| DEC-001 | 2026-01-11 | Use Phoenix as sole backend, client as static SPA | Active |
| DEC-002 | 2026-01-11 | Use y-phoenix-channel for Yjs sync | Active |
| DEC-003 | 2026-01-11 | Use Phoenix Channels for all live data (no REST) | Active |
| DEC-004 | 2026-01-11 | Phoenix LiveView handles all auth pages | Active |
| DEC-005 | 2026-01-11 | Use ExCuid2 for all primary keys | Active |
| DEC-006 | 2026-01-11 | Soft deletes via deleted_at on all major entities | Active |

---

## DEC-001: Use Phoenix as sole backend, client as static SPA

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** The project originally had a full-stack SvelteKit app with Prisma/PostgreSQL, Hocuspocus for Yjs sync, and server-side auth. A Phoenix server was added as an alternative backend with Yex NIF bindings for Yjs.
- **Decision:** Consolidate on Phoenix as the sole backend. Convert the SvelteKit client to a pure static SPA using adapter-static. Remove all server-side code from the client (Prisma, Hocuspocus, auth routes, API routes).
- **Rationale:** Eliminates duplicate backends. Phoenix provides better real-time capabilities via Channels. Yex NIF bindings are more performant than Node.js Hocuspocus. Simpler deployment (one server process).
- **Consequences:** Client has no server-side rendering. All data flows through Phoenix Channels. Auth pages are Phoenix LiveView, not SvelteKit.

## DEC-002: Use y-phoenix-channel for Yjs sync

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** The client previously used HocuspocusProvider for Yjs sync and y-webrtc for awareness.
- **Decision:** Use y-phoenix-channel (PhoenixChannelProvider) for both Yjs sync and awareness. Remove HocuspocusProvider and y-webrtc.
- **Rationale:** y-phoenix-channel is by the same author as Yex (used by the Phoenix server). It provides native binary WebSocket frames, full y-protocols sync, and built-in awareness support over Phoenix Channels.
- **Consequences:** No separate awareness transport needed. Cross-tab sync via BroadcastChannel built-in.

## DEC-003: Use Phoenix Channels for all live data (no REST)

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** Need to provide user profile, document list, theme list, and mutation capabilities to the SPA.
- **Decision:** Use Phoenix Channels for all data exchange. User channel (`user:{userId}`) provides profile, themes, and handles mutations. Document channels provide Yjs sync.
- **Rationale:** Real-time by default — changes push to clients automatically. Consistent transport (WebSocket) for everything. No need for REST endpoints or polling.
- **Consequences:** All client data access goes through channels. No REST API to maintain.

## DEC-004: Phoenix LiveView handles all auth pages

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** Auth pages (login, register, forgot/reset password, email verification) were previously SvelteKit routes with server-side form handling.
- **Decision:** Auth pages are served by Phoenix LiveView. The SPA redirects to Phoenix URLs for auth flows.
- **Rationale:** Phoenix gen.auth provides secure, well-tested auth out of the box. Server-rendered auth pages are more secure (no client-side password handling). Simpler SPA (no auth forms to maintain).
- **Consequences:** Auth pages have Phoenix LiveView styling, not SvelteKit styling. Navigating between auth and app involves full page loads.

## DEC-005: Use ExCuid2 for all primary keys

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** Need distributed-friendly, sortable identifiers.
- **Decision:** Use ExCuid2 (24-character string IDs) for all database primary keys.
- **Rationale:** Sortable by creation time, distributed (no DB sequence contention), URL-safe, human-readable length.
- **Consequences:** String PKs instead of integer/UUID. Slightly larger storage than integers but better distribution characteristics.

## DEC-006: Soft deletes via deleted_at on all major entities

- **Date:** 2026-01-11
- **Status:** Active
- **Context:** Need ability to recover deleted data and maintain referential integrity.
- **Decision:** All major entities (users, documents, document_updates, document_users, channels) have a `deleted_at` timestamp field. Queries filter by `deleted_at IS NULL` by default.
- **Rationale:** Allows data recovery, maintains audit trail, prevents cascade deletion issues.
- **Consequences:** All queries must include soft-delete filter. Storage grows over time with soft-deleted records.

---

## Decision Template

```markdown
## DEC-XXX: [Title]

- **Date:** YYYY-MM-DD
- **Status:** Active | Superseded by DEC-XXX | Deprecated
- **Context:** What is the situation that requires a decision?
- **Decision:** What is the decision that was made?
- **Rationale:** Why was this decision made? What alternatives were considered?
- **Consequences:** What are the positive and negative consequences?
```
