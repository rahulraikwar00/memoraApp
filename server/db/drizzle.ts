import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import * as schema from "./schema.js";

const dbPath = path.resolve(process.cwd(), "database.db");
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
export { schema };
