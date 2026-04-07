import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  const createBookmarks = `
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      image_url TEXT,
      domain TEXT,
      tags TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      synced_at INTEGER,
      is_deleted INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      local_path TEXT
    )
  `;

  const createSyncQueue = `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      operation TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `;

  const createUserTags = `
    CREATE TABLE IF NOT EXISTS user_tags (
      tag TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      last_used INTEGER
    )
  `;

  const createIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_is_deleted ON bookmarks(is_deleted)`,
    `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)`,
  ];

  const createFtsTable = `
    DROP TABLE IF EXISTS bookmarks_fts;
    CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
      bookmark_id,
      title,
      description,
      tags,
      domain,
      is_favorite
    )
  `;

  const createFtsTriggers = [
    `CREATE TRIGGER IF NOT EXISTS bookmarks_ai AFTER INSERT ON bookmarks BEGIN
       INSERT INTO bookmarks_fts(bookmark_id, title, description, tags, domain, is_favorite)
       VALUES (NEW.id, NEW.title, NEW.description, NEW.tags, NEW.domain, NEW.is_favorite);
     END`,
    `CREATE TRIGGER IF NOT EXISTS bookmarks_ad AFTER DELETE ON bookmarks BEGIN
       DELETE FROM bookmarks_fts WHERE bookmark_id = OLD.id;
     END`,
    `CREATE TRIGGER IF NOT EXISTS bookmarks_au AFTER UPDATE ON bookmarks BEGIN
       DELETE FROM bookmarks_fts WHERE bookmark_id = OLD.id;
       INSERT INTO bookmarks_fts(bookmark_id, title, description, tags, domain, is_favorite)
       VALUES (NEW.id, NEW.title, NEW.description, NEW.tags, NEW.domain, NEW.is_favorite);
     END`,
  ];

  try {
    await database.execAsync(createBookmarks);
    await database.execAsync(createSyncQueue);
    await database.execAsync(createUserTags);
    await database.execAsync(createFtsTable);

    // Populate FTS table with existing data
    try {
      await database.execAsync(`
        INSERT INTO bookmarks_fts(bookmark_id, title, description, tags, domain, is_favorite)
        SELECT id, title, description, tags, domain, COALESCE(is_favorite, 0) FROM bookmarks
        WHERE title IS NOT NULL OR description IS NOT NULL OR tags IS NOT NULL OR domain IS NOT NULL
      `);
    } catch (e) {
      console.log('FTS population skipped:', e);
    }

    for (const trigger of createFtsTriggers) {
      try {
        await database.execAsync(trigger);
      } catch {}
    }

    // Migrations
    try {
      await database.execAsync(
        `ALTER TABLE sync_queue ADD COLUMN status TEXT DEFAULT 'pending'`,
      );
    } catch {}
    try {
      await database.execAsync(
        `ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0`,
      );
    } catch {}
    try {
      await database.execAsync(
        `ALTER TABLE bookmarks ADD COLUMN local_path TEXT`,
      );
    } catch {}
    try {
      await database.execAsync(
        `ALTER TABLE bookmarks ADD COLUMN is_deleted INTEGER DEFAULT 0`,
      );
    } catch {}

    for (const idx of createIndexes) {
      try {
        await database.execAsync(idx);
      } catch {}
    }

    console.log("Database schema initialized");
  } catch (error) {
    console.error("Failed to initialize schema:", error);
    throw error;
  }
}

export async function getDb(): Promise<
  ReturnType<typeof drizzle<typeof schema>>
> {
  if (!db) {
    console.log("Opening database...");
    const expoDb = await SQLite.openDatabaseAsync("memora.db");
    console.log("Database opened, initializing schema...");
    await initSchema(expoDb);
    db = drizzle(expoDb, { schema });
    console.log("Database ready");
  }
  return db;
}

export { schema };
