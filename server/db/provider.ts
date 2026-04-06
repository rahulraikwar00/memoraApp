/**
 * DatabaseProvider — abstract interface for the Memora backend.
 *
 * Implementing this for SQLite, PostgreSQL, or any other store lets you
 * swap databases with a single config change.
 */

export interface UpsertBookmarkParams {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  createdAt: number;
}

export interface BookmarkRow {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  domain: string | null;
  save_count: number;
  reports_count: number;
  created_at: number;
  tags: string; // JSON array string from aggregation
}

export interface UserRow {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: number;
}

export interface DatabaseProvider {
  // ── Users ───────────────────────────────────────────────────────────────
  getUserById(id: string): UserRow | undefined;
  getUserByUsername(username: string): UserRow | undefined;
  checkUsernameAvailable(username: string): boolean;
  registerUser(id: string, username: string, avatarUrl: string | null): void;

  // ── Bookmarks ───────────────────────────────────────────────────────────
  upsertBookmark(params: UpsertBookmarkParams): void;
  addUserBookmark(userId: string, bookmarkId: string): boolean; // returns true if newly inserted
  incrementSaveCount(bookmarkId: string): void;

  // ── Tags ────────────────────────────────────────────────────────────────
  addBookmarkTag(bookmarkId: string, tag: string): void;
  addGlobalTag(tag: string): void;
  addUserTag(userId: string, tag: string): void;
  getUserTopTags(userId: string, limit: number): { tag: string }[];

  // ── Feed ────────────────────────────────────────────────────────────────
  getFeedByTags(tags: string[], limit: number): BookmarkRow[];
  getFeedTrending(limit: number): BookmarkRow[];
  getFeedRecent(limit: number): BookmarkRow[];

  // ── Votes ───────────────────────────────────────────────────────────────
  vote(itemId: string): void;

  // ── Reports ──────────────────────────────────────────────────────────────
  reportItem(itemId: string, reason: string): void;
}
