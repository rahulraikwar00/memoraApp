import Database, { type Database as SQLiteDatabase } from "better-sqlite3";
import path from "path";
import {
  DatabaseProvider,
  UpsertBookmarkParams,
  BookmarkRow,
  UserRow,
} from "./provider.js";

// ── Bootstrap ────────────────────────────────────────────────────────────────

const dbPath = path.resolve(process.cwd(), "database.db");
const db: SQLiteDatabase = new Database(dbPath);

// Schema
db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL)`);
db.exec(`CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT, description TEXT, save_count INTEGER DEFAULT 0, reports_count INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`);
try {
  db.exec(`ALTER TABLE bookmarks ADD COLUMN image_url TEXT`);
} catch {} // Ignore if column already exists
try {
  db.exec(`ALTER TABLE bookmarks ADD COLUMN domain TEXT`);
} catch {} // Ignore if column already exists
try {
  db.exec(`ALTER TABLE bookmarks ADD COLUMN reports_count INTEGER DEFAULT 0`);
} catch {} // Ignore if column already exists
db.exec(`CREATE TABLE IF NOT EXISTS user_bookmarks (user_id TEXT, bookmark_id TEXT, PRIMARY KEY(user_id, bookmark_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id))`);
db.exec(`CREATE TABLE IF NOT EXISTS bookmark_tags (bookmark_id TEXT, tag TEXT, PRIMARY KEY(bookmark_id, tag), FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id))`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag ON bookmark_tags(tag)`);
db.exec(`CREATE TABLE IF NOT EXISTS global_tags (tag TEXT PRIMARY KEY, count INTEGER DEFAULT 1)`);
db.exec(`CREATE TABLE IF NOT EXISTS user_tags (user_id TEXT, tag TEXT, count INTEGER DEFAULT 1, PRIMARY KEY(user_id, tag), FOREIGN KEY(user_id) REFERENCES users(id))`);
db.exec(`CREATE TABLE IF NOT EXISTS votes (item_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`);
db.exec(`CREATE TABLE IF NOT EXISTS reports (item_id TEXT, reason TEXT, created_at INTEGER, PRIMARY KEY(item_id, reason), FOREIGN KEY(item_id) REFERENCES bookmarks(id))`);

// ── Prepared statements (cached for performance) ────────────────────────────

const stmts = {
  getUserById: db.prepare("SELECT * FROM users WHERE id = ?"),
  getUserByUsername: db.prepare("SELECT * FROM users WHERE username = ?"),
  registerUser: db.prepare("INSERT INTO users (id, username, avatar_url, created_at) VALUES (?, ?, ?, ?)"),

  upsertBookmark: db.prepare(`
    INSERT INTO bookmarks (id, url, title, description, save_count, reports_count, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)
    ON CONFLICT(id) DO UPDATE SET title = COALESCE(excluded.title, bookmarks.title), description = COALESCE(excluded.description, bookmarks.description)
  `),
  addUserBookmark: db.prepare("INSERT OR IGNORE INTO user_bookmarks (user_id, bookmark_id) VALUES (?, ?)"),
  incrementSaveCount: db.prepare("UPDATE bookmarks SET save_count = save_count + 1 WHERE id = ?"),
  incrementReportsCount: db.prepare("UPDATE bookmarks SET reports_count = reports_count + 1 WHERE id = ?"),

  addBookmarkTag: db.prepare("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag) VALUES (?, ?)"),
  addGlobalTag: db.prepare("INSERT INTO global_tags (tag, count) VALUES (?, 1) ON CONFLICT(tag) DO UPDATE SET count = count + 1"),
  addUserTag: db.prepare("INSERT INTO user_tags (user_id, tag, count) VALUES (?, ?, 1) ON CONFLICT(user_id, tag) DO UPDATE SET count = count + 1"),
  getUserTopTags: db.prepare("SELECT tag FROM user_tags WHERE user_id = ? ORDER BY count DESC LIMIT ?"),

  vote: db.prepare("INSERT INTO votes (item_id, count) VALUES (?, 1) ON CONFLICT(item_id) DO UPDATE SET count = count + 1"),
  reportItem: db.prepare("INSERT INTO reports (item_id, reason, created_at) VALUES (?, ?, ?) ON CONFLICT(item_id, reason) DO NOTHING"),
};

// ── Select helpers for feed ─────────────────────────────────────────────────

const feedSelect = `
  SELECT b.id, b.url, b.title, b.description, b.image_url, b.domain, b.save_count, b.reports_count, b.created_at,
          COALESCE(json_group_array(bt.tag), '[]') as tags
  FROM bookmarks b
  LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
  WHERE b.reports_count < 3
`;
const feedGroup = "GROUP BY b.id";

// ── Provider implementation ─────────────────────────────────────────────────

export class SqliteProvider implements DatabaseProvider {
  // Users
  getUserById(id: string): UserRow | undefined {
    return stmts.getUserById.get(id) as UserRow | undefined;
  }
  getUserByUsername(username: string): UserRow | undefined {
    return stmts.getUserByUsername.get(username) as UserRow | undefined;
  }
  checkUsernameAvailable(username: string): boolean {
    return !this.getUserByUsername(username);
  }
  registerUser(id: string, username: string, avatarUrl: string | null): void {
    stmts.registerUser.run(id, username, avatarUrl, Date.now());
  }

  // Bookmarks
  upsertBookmark(p: UpsertBookmarkParams): void {
    stmts.upsertBookmark.run(p.id, p.url, p.title, p.description, p.createdAt);
  }
  addUserBookmark(userId: string, bookmarkId: string): boolean {
    const res = stmts.addUserBookmark.run(userId, bookmarkId);
    return res.changes > 0;
  }
  incrementSaveCount(bookmarkId: string): void {
    stmts.incrementSaveCount.run(bookmarkId);
  }

  // Tags
  addBookmarkTag(bookmarkId: string, tag: string): void {
    stmts.addBookmarkTag.run(bookmarkId, tag);
  }
  addGlobalTag(tag: string): void {
    stmts.addGlobalTag.run(tag);
  }
  addUserTag(userId: string, tag: string): void {
    stmts.addUserTag.run(userId, tag);
  }
  getUserTopTags(userId: string, limit: number): { tag: string }[] {
    return stmts.getUserTopTags.all(userId, limit) as { tag: string }[];
  }

  // Feed
  getFeedByTags(tags: string[], limit: number): BookmarkRow[] {
    const conditions = tags.map(() => "bt_filter.tag = ?").join(" OR ");
    const sql = `
      ${feedSelect}
      INNER JOIN bookmark_tags bt_filter ON b.id = bt_filter.bookmark_id
      WHERE ${conditions}
      ${feedGroup}
      ORDER BY b.save_count DESC LIMIT ?
    `;
    return db.prepare(sql).all(...tags, limit) as BookmarkRow[];
  }
  getFeedTrending(limit: number): BookmarkRow[] {
    return db.prepare(`${feedSelect} ${feedGroup} ORDER BY b.save_count DESC LIMIT ?`).all(limit) as BookmarkRow[];
  }
  getFeedRecent(limit: number): BookmarkRow[] {
    return db.prepare(`${feedSelect} ${feedGroup} ORDER BY b.created_at DESC LIMIT ?`).all(limit) as BookmarkRow[];
  }

  // Votes
  vote(itemId: string): void {
    stmts.vote.run(itemId);
  }

  // Reports
  reportItem(itemId: string, reason: string): void {
    const result = stmts.reportItem.run(itemId, reason, Date.now());
    if (result.changes > 0) {
      stmts.incrementReportsCount.run(itemId);
    }
  }
}

// Export both the raw db (for edge cases) and the provider
export { db };
export const sqliteProvider = new SqliteProvider();
