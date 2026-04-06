/**
 * Database entry point.
 *
 * Change the active provider here to swap between SQLite, PostgreSQL, etc.
 * Every route imports `dbProvider` from this file.
 */

import { sqliteProvider, db } from "./sqlite-provider.js";
import type { DatabaseProvider, BookmarkRow } from "./provider.js";

// ── Active provider (swap this line for Postgres, Redis, etc.) ───────────
export const dbProvider: DatabaseProvider = sqliteProvider;

// Re-export types for convenience
export type { DatabaseProvider, BookmarkRow };
export type { UpsertBookmarkParams, UserRow } from "./provider.js";

// Also export raw db for any legacy direct access
export default db;
