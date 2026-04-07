import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  avatarUrl: text("avatar_url"),
  interests: text("interests"),
  createdAt: integer("created_at").notNull(),
});

export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  domain: text("domain"),
  saveCount: integer("save_count").default(0).notNull(),
  reportsCount: integer("reports_count").default(0).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const userBookmarks = sqliteTable("user_bookmarks", {
  userId: text("user_id").notNull().references(() => users.id),
  bookmarkId: text("bookmark_id").notNull().references(() => bookmarks.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.bookmarkId] }),
}));

export const bookmarkTags = sqliteTable("bookmark_tags", {
  bookmarkId: text("bookmark_id").notNull().references(() => bookmarks.id),
  tag: text("tag").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.bookmarkId, table.tag] }),
}));

export const globalTags = sqliteTable("global_tags", {
  tag: text("tag").primaryKey(),
  count: integer("count").default(1).notNull(),
});

export const userTags = sqliteTable("user_tags", {
  userId: text("user_id").notNull().references(() => users.id),
  tag: text("tag").notNull(),
  count: integer("count").default(1).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.tag] }),
}));

export const votes = sqliteTable("votes", {
  itemId: text("item_id").primaryKey(),
  count: integer("count").default(0).notNull(),
});

export const userVotes = sqliteTable("user_votes", {
  userId: text("user_id").notNull().references(() => users.id),
  itemId: text("item_id").notNull().references(() => bookmarks.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.itemId] }),
}));

export const reports = sqliteTable("reports", {
  itemId: text("item_id").notNull().references(() => bookmarks.id),
  reason: text("reason").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.itemId, table.reason] }),
}));

export type User = typeof users.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type BookmarkWithTags = Bookmark & { tags: string[] };
