import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  domain: text("domain"),
  tags: text("tags").default("[]").notNull(),
  isPublic: integer("is_public").default(0).notNull(),
  isFavorite: integer("is_favorite").default(0).notNull(),
  localPath: text("local_path"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
  syncedAt: integer("synced_at"),
  isDeleted: integer("is_deleted").default(0).notNull(),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  operation: text("operation").notNull(),
  status: text("status").default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: integer("created_at"),
});

export const userTags = sqliteTable("user_tags", {
  tag: text("tag").primaryKey(),
  count: integer("count").default(0).notNull(),
  lastUsed: integer("last_used"),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type UserTag = typeof userTags.$inferSelect;
