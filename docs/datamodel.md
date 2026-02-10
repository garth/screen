# Data Model

## Overview

Chapel Screen uses two complementary data layers:

1. **PostgreSQL database** (managed by Phoenix/Ecto) — stores user accounts, document metadata, access control, Yjs update history, and channels
2. **Yjs documents** (CRDT) — stores live document content synced between clients via Phoenix Channels

## Database Schema (Ecto)

### users

User accounts with authentication support.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| email | citext | UNIQUE, NOT NULL | Case-insensitive |
| hashed_password | string | | Bcrypt-hashed |
| confirmed_at | utc_datetime | | Email confirmation |
| first_name | string | NOT NULL | |
| last_name | string | NOT NULL | |
| discoverable | boolean | default: false | Profile visibility |
| deleted_at | utc_datetime | | Soft delete |
| inserted_at | utc_datetime | NOT NULL | |
| updated_at | utc_datetime | NOT NULL | |

**Indexes:** `email` (unique)

### users_tokens

Session and email authentication tokens.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| user_id | string (24) | FK → users, CASCADE | Token owner |
| token | binary | NOT NULL | Hashed or raw token |
| context | string | NOT NULL | "session", "login", or "change:email" |
| sent_to | string | | Email address for validation |
| authenticated_at | utc_datetime | | Auth timestamp |
| inserted_at | utc_datetime | NOT NULL | |

**Indexes:** `user_id`, unique `(context, token)`

### documents

Core document storage. Documents are Yjs-based with metadata stored in both the database and the Yjs `meta` map.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| user_id | string (24) | FK → users, CASCADE | Document owner |
| name | string | NOT NULL | Display title |
| type | string | NOT NULL | "presentation", "theme", or "event" |
| base_document_id | string (24) | FK → documents, NILIFY | For theme inheritance |
| is_public | boolean | default: false | Public access flag |
| meta | map | default: {} | Serialized Yjs meta |
| deleted_at | utc_datetime | | Soft delete |
| inserted_at | utc_datetime | NOT NULL | |
| updated_at | utc_datetime | NOT NULL | |

**Indexes:** `user_id`, `base_document_id`

### document_updates

Yjs CRDT update history. Each row is a binary Yjs update.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| document_id | string (24) | FK → documents, CASCADE | Parent document |
| user_id | string (24) | FK → users, CASCADE | Update author |
| update | binary | NOT NULL | Encoded Yjs update |
| deleted_at | utc_datetime | | Soft delete |
| inserted_at | utc_datetime | NOT NULL | |
| updated_at | utc_datetime | NOT NULL | |

**Indexes:** `document_id`, `user_id`

### document_users

Access control for shared documents.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| document_id | string (24) | FK → documents, CASCADE | |
| user_id | string (24) | FK → users, CASCADE | Granted user |
| can_write | boolean | default: false | Write permission |
| deleted_at | utc_datetime | | Soft delete |
| inserted_at | utc_datetime | NOT NULL | |
| updated_at | utc_datetime | NOT NULL | |

**Indexes:** unique `(document_id, user_id)`, `user_id`

### channels

Event channels for broadcasting presentations.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string (24) | PK | ExCuid2 |
| user_id | string (24) | FK → users, CASCADE | Channel owner |
| event_document_id | string (24) | FK → documents, CASCADE | Associated event |
| name | string | NOT NULL | Display name |
| slug | string | | URL-friendly identifier |
| deleted_at | utc_datetime | | Soft delete |
| inserted_at | utc_datetime | NOT NULL | |
| updated_at | utc_datetime | NOT NULL | |

**Indexes:** `user_id`, `event_document_id`, unique `slug`

## Yjs Document Models

Each document type stores content as a Yjs CRDT document with a shared `meta` Y.Map for metadata. The meta map is serialized to the database `meta` JSON field on each change.

### Presentation Document

```
Y.Doc
├── meta (Y.Map)
│   ├── title: string
│   ├── themeId: string | null          # Reference to theme document
│   ├── format: string                   # Display format mode
│   ├── font: string | undefined         # Theme override
│   ├── backgroundColor: string | undefined
│   └── textColor: string | undefined
└── content (Y.XmlFragment)              # ProseMirror rich text content
    └── [paragraph, heading, list, image, slide_divider, ...]
```

### Theme Document

```
Y.Doc
└── meta (Y.Map)
    ├── font: string
    ├── backgroundColor: string
    ├── textColor: string
    ├── isSystemTheme: boolean
    ├── viewport: { x, y, width, height } | undefined
    └── backgroundImage: Uint8Array | null
```

Theme inheritance: A theme can reference a `base_document_id` (via the documents table). When a local meta value is empty, it falls back to the base theme's value.

### Event Document

```
Y.Doc
├── meta (Y.Map)
│   ├── presentationCount: number
│   └── channelCount: number
├── presentations (Y.Array<string>)      # Ordered list of presentation document IDs
└── channels (Y.Map<Y.Map>)             # Channel ID → channel data
    └── [channelId] (Y.Map)
        ├── name: string
        ├── order: number
        └── presentations (Y.Array<Y.Map>)
            └── { presentationId, order, themeOverrideId? }
```

### Document List (user-{userId}-documents)

A special Yjs document maintained by the server to provide the user's document list:

```
Y.Doc
└── documents (Y.Map<object>)           # Document ID → metadata
    └── [documentId]
        ├── title: string
        ├── type: "presentation" | "theme" | "event"
        ├── isPublic: boolean
        ├── isOwner: boolean
        ├── canWrite: boolean
        └── updatedAt: string (ISO date)
```

## Relationships Diagram

```
users
  ├──< documents (user_id)
  │     ├──< document_updates (document_id)
  │     ├──< document_users (document_id)
  │     ├──< channels (event_document_id)
  │     └──? documents (base_document_id)  # self-referential for themes
  ├──< document_updates (user_id)
  ├──< document_users (user_id)
  ├──< channels (user_id)
  └──< users_tokens (user_id)
```

## Access Control

1. **Document owner** (`documents.user_id`) — full read/write access
2. **Shared users** (`document_users`) — read-only by default, read/write if `can_write = true`
3. **Public documents** (`documents.is_public = true`) — read-only access for all visitors, no auth required
4. **Private documents** — require authentication and either ownership or a `document_users` entry
