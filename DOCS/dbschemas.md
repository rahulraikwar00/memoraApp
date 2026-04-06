# Database Schemas

This document describes the database schemas for both the frontend (local SQLite) and backend (server SQLite).

---

## Frontend (Local SQLite)

Database file: `memora.db`

### Tables

#### `bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `url` | TEXT NOT NULL | Bookmark URL |
| `title` | TEXT | Page title |
| `description` | TEXT | Page description |
| `image_url` | TEXT | Preview image URL |
| `domain` | TEXT | Domain name |
| `tags` | TEXT DEFAULT '[]' | JSON array of tags |
| `is_public` | INTEGER DEFAULT 0 | Visibility flag (0=private, 1=public) |
| `created_at` | INTEGER | Unix timestamp |
| `updated_at` | INTEGER | Unix timestamp |
| `synced_at` | INTEGER | Last sync timestamp |
| `is_deleted` | INTEGER DEFAULT 0 | Soft delete flag |
| `is_favorite` | INTEGER DEFAULT 0 | Favorite flag |
| `local_path` | TEXT | Local file path for images/notes |

#### `sync_queue`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique identifier |
| `payload` | TEXT NOT NULL | JSON payload for sync |
| `operation` | TEXT NOT NULL | Operation type (create, update, delete) |
| `status` | TEXT DEFAULT 'pending' | Sync status (pending, completed) |
| `retry_count` | INTEGER DEFAULT 0 | Number of retry attempts |
| `created_at` | INTEGER | Unix timestamp |

#### `user_tags`

| Column | Type | Description |
|--------|------|-------------|
| `tag` | TEXT PRIMARY KEY | Tag name |
| `count` | INTEGER DEFAULT 0 | Usage count |
| `last_used` | INTEGER | Last used timestamp |

### Indexes

- `idx_bookmarks_created_at` - ON `bookmarks(created_at DESC)`
- `idx_bookmarks_is_deleted` - ON `bookmarks(is_deleted)`
- `idx_sync_queue_status` - ON `sync_queue(status)`

---

## Backend (Server SQLite)

Database file: `database.db`

### Tables

#### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Device ID (from client) |
| `username` | TEXT UNIQUE NOT NULL | Username |
| `avatar_url` | TEXT | Avatar image URL |
| `created_at` | INTEGER NOT NULL | Unix timestamp |

#### `bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Bookmark ID |
| `url` | TEXT NOT NULL | Bookmark URL |
| `title` | TEXT | Page title |
| `description` | TEXT | Page description |
| `save_count` | INTEGER DEFAULT 0 | Number of users who saved this bookmark |
| `created_at` | INTEGER NOT NULL | Unix timestamp |

#### `user_bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT | Foreign key to users |
| `bookmark_id` | TEXT | Foreign key to bookmarks |
| PRIMARY KEY | (`user_id`, `bookmark_id`) | Composite key |

#### `bookmark_tags`

| Column | Type | Description |
|--------|------|-------------|
| `bookmark_id` | TEXT | Foreign key to bookmarks |
| `tag` | TEXT | Tag name |
| PRIMARY KEY | (`bookmark_id`, `tag`) | Composite key |

#### `global_tags`

| Column | Type | Description |
|--------|------|-------------|
| `tag` | TEXT PRIMARY KEY | Tag name |
| `count` | INTEGER DEFAULT 1 | Global usage count |

#### `user_tags`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT | Foreign key to users |
| `tag` | TEXT | Tag name |
| `count` | INTEGER DEFAULT 1 | User's usage count |
| PRIMARY KEY | (`user_id`, `tag`) | Composite key |

#### `votes`

| Column | Type | Description |
|--------|------|-------------|
| `item_id` | TEXT PRIMARY KEY | Item ID being voted on |
| `count` | INTEGER DEFAULT 0 | Vote count |

### Indexes

- `idx_bookmark_tags_tag` - ON `bookmark_tags(tag)`

---

## Schema Differences

| Aspect | Frontend | Backend |
|--------|----------|---------|
| Storage | Local device | Server |
| Sync | Async via sync_queue | Direct writes |
| Soft deletes | Yes (`is_deleted`) | No (permanent) |
| Public visibility | `is_public` flag | Via user_bookmarks table |
| Favorites | `is_favorite` flag | Not stored |
| Conflict resolution | Last-write-wins | Upsert with coalesce |

---

## Compatibility Analysis

### Compatible Aspects

1. **Bookmark Core Fields**: Both schemas share `id`, `url`, `title`, `description`, `created_at` - essential for sync
2. **Tags**: Frontend stores as JSON string, backend normalizes to relational tables - compatible via sync transformation
3. **User Identification**: Frontend uses device ID, backend maps it to `users.id` - compatible

### Incompatible Aspects (Handled by Sync)

1. **Soft Deletes**: Frontend uses `is_deleted` flag, backend has no soft delete. The sync endpoint treats incoming bookmarks as upserts, so deleted items are simply not synced
2. **Local-only Fields**: `is_favorite`, `local_path`, `synced_at` are frontend-only and not sent to server
3. **Image/Note Bookmarks**: Frontend uses `local-*` domain prefixes for local content. Backend skips URL hashing for these, keeping client-generated IDs

### Verdict: **COMPATIBLE**

The schemas are designed for offline-first sync and are compatible. Key design decisions:
- Frontend is the source of truth for user-specific state (favorites, local paths)
- Backend is the source of truth for shared state (public bookmarks, tags, save counts)
- Sync transforms handle the differences (JSON tags → relational tags, soft deletes → no-op)

---

## API Routes

### Frontend API Client (`lib/api.ts`)

Base URL: `http://10.0.2.2:3000` (Android) or `http://localhost:3000` (iOS/Web)

#### Auth API

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| GET | `/api/auth/check-username?username=:username` | - | `{ available: boolean }` | Check username availability |
| POST | `/api/auth/register` | `{ id: string, username: string, avatar_url?: string }` | `{ success: boolean, username: string }` | Register new user/device |

#### Feed API

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| GET | `/api/feed?tags=:tags&limit=:limit` | - | `{ trending: FeedItem[], recent: FeedItem[] }` | Get personalized feed |
| POST | `/api/vote` | `{ item_id: string }` | `{ success: boolean }` | Upvote a bookmark |

#### Sync API

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| POST | `/api/sync` | `{ bookmarks: SyncBookmark[], queue?: any[] }` | `{ success: boolean, synced: number }` | Sync local bookmarks to server |

#### Metadata API

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| GET | `/api/preview?url=:url` | - | `{ title: string, description: string, image_url: string, domain: string, url: string }` | Fetch OpenGraph metadata |

### Backend Routes

#### Auth Routes (`server/routes/auth.ts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/auth/check-username` | `checkUsernameSchema` | Returns `{ available: boolean }` |
| POST | `/api/auth/register` | `registerSchema` | Registers user, returns `{ success: boolean, username: string }` or 409 if device already registered |

#### Feed Routes (`server/routes/feed.ts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/feed` | Query: `tags?: string`, `limit?: number` | Returns `{ trending: BookmarkRow[], recent: BookmarkRow[] }`. Uses user's top tags for personalization if authenticated |

#### Sync Routes (`server/routes/sync.ts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/sync` | `{ bookmarks: SyncBookmark[] }` | Upserts bookmarks, links to user, updates tags. Returns `{ success: boolean, synced: number }` |

#### Vote Routes (`server/routes/vote.ts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | `/api/vote` | `{ item_id: string }` | Increments vote count for a bookmark. Returns `{ success: boolean }` |

#### Preview Routes (`server/routes/preview.ts`)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | `/api/preview` | Query: `url: string` | Scrapes OpenGraph metadata. Returns `{ title, description, image_url, domain, url }` |

### Authentication

All endpoints support optional Bearer token authentication. The token is the user's device ID, which is looked up in the `users` table.

---

## Data Flow

1. **Create Bookmark**: Client saves to local SQLite → adds to sync_queue → syncs to server
2. **Update Bookmark**: Client updates local → adds to sync_queue → syncs to server  
3. **Delete Bookmark**: Client marks `is_deleted=1` → adds to sync_queue → syncs to server
4. **Feed Discovery**: Server aggregates public bookmarks by tags and save_count
