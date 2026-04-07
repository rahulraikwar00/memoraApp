import path from "path";
import { db } from "./drizzle.js";
import {
  DatabaseProvider,
  UpsertBookmarkParams,
  BookmarkRow,
  UserRow,
} from "./provider.js";
import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import * as schema from "./schema.js";

const {
  users,
  bookmarks,
  userBookmarks,
  bookmarkTags,
  globalTags,
  userTags,
  votes,
  userVotes,
  reports,
} = schema;

// ──── Bootstrap ───────────────────────────────────────────────────────────────

// Initialize tables (Drizzle will not auto create, keep init for compatibility)
import type { Database } from "better-sqlite3";
import DatabaseConstructor from "better-sqlite3";
const dbPath = path.resolve(process.cwd(), "database.db");
const rawDb = new DatabaseConstructor(dbPath) as Database;

rawDb.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL)`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT, description TEXT, save_count INTEGER DEFAULT 0, reports_count INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`);
try { rawDb.exec(`ALTER TABLE bookmarks ADD COLUMN image_url TEXT`); } catch {}
try { rawDb.exec(`ALTER TABLE bookmarks ADD COLUMN domain TEXT`); } catch {}
try { rawDb.exec(`ALTER TABLE bookmarks ADD COLUMN reports_count INTEGER DEFAULT 0`); } catch {}
rawDb.exec(`CREATE TABLE IF NOT EXISTS user_bookmarks (user_id TEXT, bookmark_id TEXT, PRIMARY KEY(user_id, bookmark_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id))`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS bookmark_tags (bookmark_id TEXT, tag TEXT, PRIMARY KEY(bookmark_id, tag), FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id))`);
rawDb.exec(`CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag ON bookmark_tags(tag)`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS global_tags (tag TEXT PRIMARY KEY, count INTEGER DEFAULT 1)`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS user_tags (user_id TEXT, tag TEXT, count INTEGER DEFAULT 1, PRIMARY KEY(user_id, tag), FOREIGN KEY(user_id) REFERENCES users(id))`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS votes (item_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS user_votes (user_id TEXT, item_id TEXT, PRIMARY KEY(user_id, item_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(item_id) REFERENCES bookmarks(id))`);
rawDb.exec(`CREATE TABLE IF NOT EXISTS reports (item_id TEXT, reason TEXT, created_at INTEGER, PRIMARY KEY(item_id, reason), FOREIGN KEY(item_id) REFERENCES bookmarks(id))`);

// ──── Query Helpers ───────────────────────────────────────────────────────────

const withTags = db
  .select({
    id: bookmarks.id,
    url: bookmarks.url,
    title: bookmarks.title,
    description: bookmarks.description,
    image_url: bookmarks.imageUrl,
    domain: bookmarks.domain,
    save_count: bookmarks.saveCount,
    reports_count: bookmarks.reportsCount,
    created_at: bookmarks.createdAt,
    tags: sql<string>`COALESCE(json_group_array(${bookmarkTags.tag}), '[]')`.as('tags')
  })
  .from(bookmarks)
  .leftJoin(bookmarkTags, eq(bookmarks.id, bookmarkTags.bookmarkId))
  .where(lt(bookmarks.reportsCount, 3))
  .groupBy(bookmarks.id)
  .as('with_tags');

// ──── Provider Implementation ────────────────────────────────────────────────

export class SqliteProvider implements DatabaseProvider {
  // Users
  getUserById(id: string): UserRow | undefined {
    return db.select().from(users).where(eq(users.id, id)).get() as UserRow | undefined;
  }

  getUserByUsername(username: string): UserRow | undefined {
    return db.select().from(users).where(eq(users.username, username)).get() as UserRow | undefined;
  }

  checkUsernameAvailable(username: string): boolean {
    return !this.getUserByUsername(username);
  }

  registerUser(id: string, username: string, avatarUrl: string | null): void {
    db.insert(users).values({
      id,
      username,
      avatarUrl,
      createdAt: Date.now()
    }).run();
  }

  // Bookmarks
  upsertBookmark(p: UpsertBookmarkParams): void {
    db.insert(bookmarks)
      .values({
        id: p.id,
        url: p.url,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        domain: p.domain,
        saveCount: 0,
        reportsCount: 0,
        createdAt: p.createdAt
      })
      .onConflictDoUpdate({
        target: bookmarks.id,
        set: {
          title: sql`COALESCE(excluded.title, bookmarks.title)`,
          description: sql`COALESCE(excluded.description, bookmarks.description)`,
          imageUrl: sql`COALESCE(excluded.image_url, bookmarks.image_url)`,
          domain: sql`COALESCE(excluded.domain, bookmarks.domain)`
        }
      })
      .run();
  }

  addUserBookmark(userId: string, bookmarkId: string): boolean {
    const res = db.insert(userBookmarks)
      .values({ userId, bookmarkId })
      .onConflictDoNothing()
      .run();
    return res.changes > 0;
  }

  incrementSaveCount(bookmarkId: string): void {
    db.update(bookmarks)
      .set({ saveCount: sql`${bookmarks.saveCount} + 1` })
      .where(eq(bookmarks.id, bookmarkId))
      .run();
  }

  // Tags
  addBookmarkTag(bookmarkId: string, tag: string): void {
    db.insert(bookmarkTags)
      .values({ bookmarkId, tag })
      .onConflictDoNothing()
      .run();
  }

  addGlobalTag(tag: string): void {
    db.insert(globalTags)
      .values({ tag, count: 1 })
      .onConflictDoUpdate({
        target: globalTags.tag,
        set: { count: sql`${globalTags.count} + 1` }
      })
      .run();
  }

  addUserTag(userId: string, tag: string): void {
    db.insert(userTags)
      .values({ userId, tag, count: 1 })
      .onConflictDoUpdate({
        target: [userTags.userId, userTags.tag],
        set: { count: sql`${userTags.count} + 1` }
      })
      .run();
  }

  getUserTopTags(userId: string, limit: number): { tag: string }[] {
    return db.select({ tag: userTags.tag })
      .from(userTags)
      .where(eq(userTags.userId, userId))
      .orderBy(desc(userTags.count))
      .limit(limit)
      .all() as { tag: string }[];
  }

  // Feed
  getFeedByTags(tags: string[], limit: number): BookmarkRow[] {
    return db.selectDistinct()
      .from(withTags)
      .innerJoin(bookmarkTags, eq(withTags.id, bookmarkTags.bookmarkId))
      .where(inArray(bookmarkTags.tag, tags))
      .orderBy(desc(withTags.save_count))
      .limit(limit)
      .all() as unknown as BookmarkRow[];
  }

  getFeedTrending(limit: number): BookmarkRow[] {
    return db.select()
      .from(withTags)
      .orderBy(desc(withTags.save_count))
      .limit(limit)
      .all() as unknown as BookmarkRow[];
  }

  getFeedRecent(limit: number): BookmarkRow[] {
    return db.select()
      .from(withTags)
      .orderBy(desc(withTags.created_at))
      .limit(limit)
      .all() as unknown as BookmarkRow[];
  }

  // Votes
  toggleVote(userId: string, itemId: string): void {
    const hasVoted = db.select()
      .from(userVotes)
      .where(and(eq(userVotes.userId, userId), eq(userVotes.itemId, itemId)))
      .get();

    if (hasVoted) {
      // Unvote
      db.delete(userVotes)
        .where(and(eq(userVotes.userId, userId), eq(userVotes.itemId, itemId)))
        .run();
      db.update(votes)
        .set({ count: sql`MAX(0, ${votes.count} - 1)` })
        .where(eq(votes.itemId, itemId))
        .run();
      db.update(bookmarks)
        .set({ saveCount: sql`MAX(0, ${bookmarks.saveCount} - 1)` })
        .where(eq(bookmarks.id, itemId))
        .run();
    } else {
      // Vote
      db.insert(userVotes)
        .values({ userId, itemId })
        .onConflictDoNothing()
        .run();
      db.insert(votes)
        .values({ itemId, count: 1 })
        .onConflictDoUpdate({
          target: votes.itemId,
          set: { count: sql`${votes.count} + 1` }
        })
        .run();
      db.update(bookmarks)
        .set({ saveCount: sql`${bookmarks.saveCount} + 1` })
        .where(eq(bookmarks.id, itemId))
        .run();
    }
  }

  // Reports
  reportItem(itemId: string, reason: string): void {
    const res = db.insert(reports)
      .values({ itemId, reason, createdAt: Date.now() })
      .onConflictDoNothing()
      .run();

    if (res.changes > 0) {
      db.update(bookmarks)
        .set({ reportsCount: sql`${bookmarks.reportsCount} + 1` })
        .where(eq(bookmarks.id, itemId))
        .run();
    }
  }
}

export { rawDb as db };
export const sqliteProvider = new SqliteProvider();
