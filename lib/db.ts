import { getDb } from "./drizzle";
import { bookmarks, syncQueue, userTags } from "./schema";
import { eq, desc, sql, or, like, notInArray, and } from "drizzle-orm";
import * as SQLite from "expo-sqlite";

// Re-export types for backwards compatibility
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

export interface UserTag {
  tag: string;
  count: number;
  last_used: number;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  const db = await getDb();
  if (!query.trim()) return getBookmarks();

  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const expoDb = (db as any).$client as SQLite.SQLiteDatabase;
  
  // First try FTS5 search
  try {
    const ftsQuery = searchTerms.map(term => `"${term}"*`).join(' OR ');
    
    const results = await expoDb.getAllAsync<Bookmark>(`
      SELECT b.* FROM bookmarks b
      INNER JOIN bookmarks_fts fts ON b.rowid = fts.rowid
      WHERE b.is_deleted = 0 AND bookmarks_fts MATCH ?
      ORDER BY b.created_at DESC
    `, [ftsQuery]);

    if (results.length > 0) {
      return results;
    }
  } catch (error) {
    console.log('FTS search failed, trying LIKE fallback:', error);
  }

  // Fallback to LIKE search using direct SQLite
  const searchTerm = `%${query.toLowerCase()}%`;
  try {
    const results = await expoDb.getAllAsync<Bookmark>(
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
  } catch (error) {
    console.error('Search failed completely:', error);
    return [];
  }
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const db = await getDb();

  return db.select({
    id: bookmarks.id,
    url: bookmarks.url,
    title: bookmarks.title,
    description: bookmarks.description,
    image_url: bookmarks.imageUrl,
    domain: bookmarks.domain,
    tags: bookmarks.tags,
    is_public: bookmarks.isPublic,
    is_favorite: bookmarks.isFavorite,
    local_path: bookmarks.localPath,
    created_at: bookmarks.createdAt,
    updated_at: bookmarks.updatedAt,
    synced_at: bookmarks.syncedAt,
    is_deleted: bookmarks.isDeleted,
  })
  .from(bookmarks)
  .where(eq(bookmarks.isDeleted, 0))
  .orderBy(desc(bookmarks.createdAt))
  .all() as unknown as Bookmark[];
}

export async function getBookmarkById(id: string): Promise<Bookmark | null> {
  const db = await getDb();

  const result = await db.select({
    id: bookmarks.id,
    url: bookmarks.url,
    title: bookmarks.title,
    description: bookmarks.description,
    image_url: bookmarks.imageUrl,
    domain: bookmarks.domain,
    tags: bookmarks.tags,
    is_public: bookmarks.isPublic,
    is_favorite: bookmarks.isFavorite,
    local_path: bookmarks.localPath,
    created_at: bookmarks.createdAt,
    updated_at: bookmarks.updatedAt,
    synced_at: bookmarks.syncedAt,
    is_deleted: bookmarks.isDeleted,
  })
  .from(bookmarks)
  .where(eq(bookmarks.id, id))
  .get();

  return result as unknown as Bookmark | null;
}

export async function createBookmark(
  data: Omit<
    Bookmark,
    "id" | "created_at" | "updated_at" | "synced_at" | "is_deleted" | "is_favorite"
  >,
): Promise<Bookmark> {
  const db = await getDb();

  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  const now = Date.now();

  await db.insert(bookmarks).values({
    id,
    url: data.url,
    title: data.title,
    description: data.description,
    imageUrl: data.image_url,
    domain: data.domain,
    tags: data.tags,
    isPublic: data.is_public,
    isFavorite: 0,
    localPath: data.local_path || null,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    isDeleted: 0,
  }).run();

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
  const db = await getDb();
  const now = Date.now();

  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (data.url !== undefined) updateData.url = data.url;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
  if (data.domain !== undefined) updateData.domain = data.domain;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.is_public !== undefined) updateData.isPublic = data.is_public;
  if (data.local_path !== undefined) updateData.localPath = data.local_path;
  if (data.synced_at !== undefined) updateData.syncedAt = data.synced_at;

  await db.update(bookmarks)
    .set(updateData)
    .where(eq(bookmarks.id, id))
    .run();

  await addToSyncQueue("update", { id, ...data, updated_at: now });

  if (data.tags) {
    await updateUserTags(data.tags);
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  await db.update(bookmarks)
    .set({ isDeleted: 1, updatedAt: now })
    .where(eq(bookmarks.id, id))
    .run();

  await addToSyncQueue("delete", { id, deleted_at: now });
}

export async function toggleBookmarkPublic(id: string): Promise<Bookmark | null> {
  const bookmark = await getBookmarkById(id);
  if (!bookmark) return null;

  const newPublic = bookmark.is_public ? 0 : 1;
  await updateBookmark(id, { is_public: newPublic });

  return getBookmarkById(id);
}

export async function toggleBookmarkFavorite(id: string): Promise<Bookmark | null> {
  const bookmark = await getBookmarkById(id);
  if (!bookmark) return null;

  const newFavorite = bookmark.is_favorite ? 0 : 1;
  await updateBookmark(id, { is_favorite: newFavorite });

  return getBookmarkById(id);
}

export async function addToSyncQueue(operation: string, payload: object): Promise<void> {
  const db = await getDb();
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  const now = Date.now();

  await db.insert(syncQueue).values({
    id,
    payload: JSON.stringify(payload),
    operation,
    status: "pending",
    retryCount: 0,
    createdAt: now,
  }).run();
}

export async function getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
  const db = await getDb();

  return db.select({
    id: syncQueue.id,
    payload: syncQueue.payload,
    operation: syncQueue.operation,
    status: syncQueue.status,
    retry_count: syncQueue.retryCount,
    created_at: syncQueue.createdAt,
  })
  .from(syncQueue)
  .where(eq(syncQueue.status, "pending"))
  .orderBy(syncQueue.createdAt)
  .limit(limit)
  .all() as unknown as SyncQueueItem[];
}

export async function markSyncItemComplete(id: string): Promise<void> {
  const db = await getDb();
  await db.update(syncQueue).set({ status: "completed" }).where(eq(syncQueue.id, id)).run();
}

export async function incrementSyncRetry(id: string): Promise<void> {
  const db = await getDb();
  await db.update(syncQueue)
    .set({ retryCount: sql`${syncQueue.retryCount} + 1` })
    .where(eq(syncQueue.id, id))
    .run();
}

export async function clearCompletedSyncItems(): Promise<void> {
  const db = await getDb();
  await db.delete(syncQueue).where(eq(syncQueue.status, "completed")).run();
}

export async function getBookmarksCount(): Promise<number> {
  const db = await getDb();
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.isDeleted, 0))
    .get();

  return result?.count ?? 0;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.delete(bookmarks).run();
  await db.delete(syncQueue).run();
  await db.delete(userTags).run();
}

export async function updateUserTags(tags: string): Promise<void> {
  const db = await getDb();
  const tagsArray = JSON.parse(tags || "[]") as string[];
  const now = Date.now();

  for (const tag of tagsArray) {
    if (!tag) continue;
    const normalizedTag = tag.toLowerCase().trim();
    if (!normalizedTag) continue;

    await db.insert(userTags)
      .values({ tag: normalizedTag, count: 1, lastUsed: now })
      .onConflictDoUpdate({
        target: userTags.tag,
        set: { count: sql`${userTags.count} + 1`, lastUsed: now }
      })
      .run();
  }
}

export async function getUserTopTags(limit: number = 10): Promise<UserTag[]> {
  const db = await getDb();
  const expoDb = (db as any).$client as SQLite.SQLiteDatabase;

  return expoDb.getAllAsync<UserTag>(
    `SELECT tag, count, last_used FROM user_tags ORDER BY count DESC LIMIT ?`,
    [limit],
  );
}

export async function getDiscoverFeed(userTags: string[]): Promise<Bookmark[]> {
  const db = await getDb();
  const expoDb = (db as any).$client as SQLite.SQLiteDatabase;

  if (userTags.length === 0) {
    return expoDb.getAllAsync<Bookmark>(
      `SELECT * FROM bookmarks 
       WHERE is_deleted = 0 AND domain NOT IN ('local-image', 'local-note', 'local-voice')
       ORDER BY created_at DESC LIMIT 50`,
    );
  }

  const placeholders = userTags.filter(Boolean).map(() => `LOWER(tags) LIKE ?`).join(" OR ");
  const params = userTags.filter(Boolean).map((tag) => `%${tag.toLowerCase()}%`);

  return expoDb.getAllAsync<Bookmark>(
    `SELECT * FROM bookmarks 
     WHERE is_deleted = 0 
     AND domain NOT IN ('local-image', 'local-note', 'local-voice')
     AND (${placeholders})
     ORDER BY created_at DESC LIMIT 50`,
    params,
  );
}
