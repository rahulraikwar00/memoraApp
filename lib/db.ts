import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  domain: string | null;
  tags: string;
  is_public: number;
  is_favorite: number;
  local_path: string | null;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
  is_deleted: number;
}

export interface SyncQueueItem {
  id: string;
  payload: string;
  operation: string;
  status: string;
  retry_count: number;
  created_at: number;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    try {
      console.log("Opening database...");

      // NOTE: Don't delete the database on each load - that would lose all data!
      // The schema migration in initSchema handles schema updates safely
      // 
      // For manually clearing data (development only), use clearAllData() function
      // or add a specific version check to clear old corrupted databases

      db = await SQLite.openDatabaseAsync("memora.db");
      console.log("Database opened, initializing schema...");
      await initSchema(db);
      console.log("Database ready");
    } catch (error) {
      console.error("Failed to open database:", error);
      throw error;
    }
  }
  return db;
}

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
      is_deleted INTEGER DEFAULT 0
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

  try {
    await database.execAsync(createBookmarks);
    await database.execAsync(createSyncQueue);
    await database.execAsync(createUserTags);

    // Run migrations (columns that might be missing in older versions)
    const migrations = [
      { table: "sync_queue", column: "status", type: "TEXT DEFAULT 'pending'" },
      { table: "sync_queue", column: "retry_count", type: "INTEGER DEFAULT 0" },
      { table: "bookmarks", column: "local_path", type: "TEXT" },
      { table: "bookmarks", column: "is_favorite", type: "INTEGER DEFAULT 0" },
    ];

    for (const m of migrations) {
      try {
        await database.execAsync(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
      } catch {
        // Column already exists
      }
    }

    for (const idx of createIndexes) {
      try {
        await database.execAsync(idx);
      } catch {
        // Index already exists
      }
    }

    console.log("Database schema initialized");
  } catch (error) {
    console.error("Failed to initialize schema:", error);
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const database = await getDb();
  if (!query.trim()) return getBookmarks();

  const searchTerm = `%${query.toLowerCase()}%`;
  const results = await database.getAllAsync<Bookmark>(
    `SELECT * FROM bookmarks 
     WHERE is_deleted = 0 AND (
       LOWER(title) LIKE ? OR 
       LOWER(description) LIKE ? OR 
       LOWER(tags) LIKE ? OR 
       LOWER(domain) LIKE ?
     )
     ORDER BY created_at DESC`,
    [searchTerm, searchTerm, searchTerm, searchTerm],
  );
  return results;
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const database = await getDb();
  const results = await database.getAllAsync<Bookmark>(
    "SELECT * FROM bookmarks WHERE is_deleted = 0 ORDER BY created_at DESC",
  );
  console.log("getBookmarks result:", results.length, "bookmarks");
  return results;
}

export async function getBookmarkById(id: string): Promise<Bookmark | null> {
  const database = await getDb();
  return database.getFirstAsync<Bookmark>(
    "SELECT * FROM bookmarks WHERE id = ?",
    [id],
  );
}

export async function createBookmark(
  data: Omit<
    Bookmark,
    "id" | "created_at" | "updated_at" | "synced_at" | "is_deleted" | "is_favorite"
  >,
): Promise<Bookmark> {
  const database = await getDb();

  const id = Crypto.randomUUID();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO bookmarks (id, url, title, description, image_url, domain, tags, is_public, is_favorite, local_path, created_at, updated_at, synced_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.url,
      data.title,
      data.description,
      data.image_url,
      data.domain,
      data.tags,
      data.is_public,
      0,
      data.local_path || null,
      now,
      now,
      null,
      0,
    ],
  );

  await addToSyncQueue("create", { ...data, id, created_at: now });

  if (data.tags) {
    await updateUserTags(data.tags);
  }

  return {
    id,
    ...data,
    local_path: data.local_path || null,
    created_at: now,
    updated_at: now,
    synced_at: null,
    is_deleted: 0,
    is_favorite: 0,
  };
}

export async function updateBookmark(
  id: string,
  data: Partial<Omit<Bookmark, "id" | "created_at">>,
): Promise<void> {
  const database = await getDb();

  const now = Date.now();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.url !== undefined) {
    fields.push("url = ?");
    values.push(data.url);
  }
  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.image_url !== undefined) {
    fields.push("image_url = ?");
    values.push(data.image_url);
  }
  if (data.domain !== undefined) {
    fields.push("domain = ?");
    values.push(data.domain);
  }
  if (data.tags !== undefined) {
    fields.push("tags = ?");
    values.push(data.tags);
  }
  if (data.is_public !== undefined) {
    fields.push("is_public = ?");
    values.push(data.is_public);
  }
  if (data.local_path !== undefined) {
    fields.push("local_path = ?");
    values.push(data.local_path);
  }
  if (data.synced_at !== undefined) {
    fields.push("synced_at = ?");
    values.push(data.synced_at);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await database.runAsync(
    `UPDATE bookmarks SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );

  await addToSyncQueue("update", { id, ...data, updated_at: now });

  if (data.tags) {
    await updateUserTags(data.tags);
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  const database = await getDb();

  const now = Date.now();
  await database.runAsync(
    "UPDATE bookmarks SET is_deleted = 1, updated_at = ? WHERE id = ?",
    [now, id],
  );

  await addToSyncQueue("delete", { id, deleted_at: now });
}

export async function toggleBookmarkPublic(
  id: string,
): Promise<Bookmark | null> {
  const bookmark = await getBookmarkById(id);
  if (!bookmark) return null;

  const newPublic = bookmark.is_public ? 0 : 1;
  await updateBookmark(id, { is_public: newPublic });

  return getBookmarkById(id);
}

export async function toggleBookmarkFavorite(
  id: string,
): Promise<Bookmark | null> {
  const bookmark = await getBookmarkById(id);
  if (!bookmark) return null;

  const newFavorite = bookmark.is_favorite ? 0 : 1;
  await updateBookmark(id, { is_favorite: newFavorite });

  return getBookmarkById(id);
}

export async function addToSyncQueue(
  operation: string,
  payload: object,
): Promise<void> {
  const database = await getDb();
  const id = Crypto.randomUUID();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO sync_queue (id, payload, operation, status, retry_count, created_at)
     VALUES (?, ?, ?, 'pending', 0, ?)`,
    [id, JSON.stringify(payload), operation, now],
  );
}

export async function getPendingSyncItems(
  limit: number = 50,
): Promise<SyncQueueItem[]> {
  const database = await getDb();
  return database.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [limit],
  );
}

export async function markSyncItemComplete(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE sync_queue SET status = 'completed' WHERE id = ?`,
    [id],
  );
}

export async function incrementSyncRetry(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`,
    [id],
  );
}

export async function clearCompletedSyncItems(): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM sync_queue WHERE status = 'completed'`);
}

export async function getBookmarksCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM bookmarks WHERE is_deleted = 0",
  );
  return result?.count ?? 0;
}

export async function clearAllData(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    DELETE FROM bookmarks;
    DELETE FROM sync_queue;
    DELETE FROM user_tags;
  `);
}

export interface UserTag {
  tag: string;
  count: number;
  last_used: number;
}

export async function updateUserTags(tags: string): Promise<void> {
  const database = await getDb();
  const tagsArray = JSON.parse(tags || "[]") as string[];
  const now = Date.now();

  for (const tag of tagsArray) {
    const normalizedTag = tag.toLowerCase().trim();
    if (!normalizedTag) continue;

    await database.runAsync(
      `INSERT INTO user_tags (tag, count, last_used) VALUES (?, 1, ?)
       ON CONFLICT(tag) DO UPDATE SET count = count + 1, last_used = ?`,
      [normalizedTag, now, now],
    );
  }
}

export async function getUserTopTags(limit: number = 10): Promise<UserTag[]> {
  const database = await getDb();
  return database.getAllAsync<UserTag>(
    `SELECT tag, count, last_used FROM user_tags ORDER BY count DESC LIMIT ?`,
    [limit],
  );
}

export async function getDiscoverFeed(userTags: string[]): Promise<Bookmark[]> {
  const database = await getDb();
  
  if (userTags.length === 0) {
    return database.getAllAsync<Bookmark>(
      `SELECT * FROM bookmarks 
       WHERE is_deleted = 0 AND domain NOT IN ('local-image', 'local-note', 'local-voice')
       ORDER BY created_at DESC LIMIT 50`,
    );
  }

  const placeholders = userTags.map(() => `LOWER(tags) LIKE ?`).join(" OR ");
  const params = userTags.map((tag) => `%${tag.toLowerCase()}%`);

  return database.getAllAsync<Bookmark>(
    `SELECT * FROM bookmarks 
     WHERE is_deleted = 0 
     AND domain NOT IN ('local-image', 'local-note', 'local-voice')
     AND (${placeholders})
     ORDER BY created_at DESC LIMIT 50`,
    params,
  );
}
