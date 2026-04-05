import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const db = new Database("database.db");

// Users table for username management
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    save_count INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    item_id TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  )
`);

interface Bookmark {
  id: string;
  url: string;
  title?: string;
  description?: string;
  save_count: number;
  created_at: number;
}

interface Vote {
  item_id: string;
  count: number;
}

// Username validation and registration
app.get("/api/auth/check-username", (req: Request, res: Response) => {
  const { username } = req.query;
  
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "username required" });
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(normalizedUsername);
  
  res.json({ available: !existing });
});

app.post("/api/auth/register", (req: Request, res: Response) => {
  const { id, username, avatar_url } = req.body;
  
  if (!id || !username) {
    return res.status(400).json({ error: "id and username required" });
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  
  // Check if username is taken
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(normalizedUsername);
  
  if (existing) {
    return res.status(400).json({ error: "Username already taken" });
  }
  
  try {
    db.prepare(`
      INSERT INTO users (id, username, avatar_url, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, normalizedUsername, avatar_url || null, Date.now());
    
    res.json({ success: true, username: normalizedUsername });
  } catch (err: any) {
    console.log("[REGISTER] Error:", err.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.get("/api/feed", (req: Request, res: Response) => {
  const bookmarks = db
    .prepare("SELECT * FROM bookmarks ORDER BY save_count DESC LIMIT 10")
    .all() as Bookmark[];
  const recent = db
    .prepare("SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT 20")
    .all() as Bookmark[];

  res.json({ trending: bookmarks, recent });
});

app.post("/api/vote", (req: Request, res: Response) => {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: "item_id required" });
  }

  const existing = db
    .prepare("SELECT count FROM votes WHERE item_id = ?")
    .get(item_id) as Vote | undefined;

  if (existing) {
    db.prepare("UPDATE votes SET count = count + 1 WHERE item_id = ?").run(
      item_id,
    );
  } else {
    db.prepare("INSERT INTO votes (item_id, count) VALUES (?, 1)").run(item_id);
  }

  res.json({ success: true });
});

app.post("/api/sync", (req: Request, res: Response) => {
  const { bookmarks: newBookmarks, queue } = req.body;
  console.log("[SYNC] Received request with", newBookmarks?.length || 0, "bookmarks");
  console.log("[SYNC] Full payload:", JSON.stringify(req.body).slice(0, 500));

  if (!Array.isArray(newBookmarks)) {
    console.log("[SYNC] ERROR: Invalid payload - not an array");
    return res.status(400).json({ error: "Invalid payload" });
  }

  let synced = 0;
  let errors = 0;

  for (const bookmark of newBookmarks) {
    if (bookmark.id) {
      console.log("[SYNC] Processing bookmark:", bookmark.id, bookmark.url);
      try {
        const insertStmt = db.prepare(`
          INSERT INTO bookmarks (id, url, title, description, save_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET save_count = save_count + 1
        `);
        insertStmt.run(
          bookmark.id,
          bookmark.url,
          bookmark.title || null,
          bookmark.description || null,
          1,
          bookmark.created_at || Date.now(),
        );
        synced++;
        console.log("[SYNC] SUCCESS: Inserted/updated bookmark:", bookmark.id);
      } catch (err: any) {
        errors++;
        console.log("[SYNC] ERROR inserting bookmark:", bookmark.id, err.message);
      }
    }
  }

  console.log("[SYNC] Completed. synced:", synced, "errors:", errors);
  res.json({ success: true, synced });
});

app.get("/api/preview", async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  console.log("[PREVIEW] Fetching metadata for:", url);

  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MemoraBot/1.0)",
      },
    });
    const $ = cheerio.load(data);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      "";

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";

    const domain = new URL(url).hostname;

    console.log("[PREVIEW] Got metadata:", { title: title?.slice(0, 30), description: description?.slice(0, 30), image: !!image });

    res.json({ 
      title: title?.trim() || null, 
      description: description?.trim() || null, 
      image_url: image || null, 
      domain,
      url 
    });
  } catch (err: any) {
    console.log("[PREVIEW] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch preview" });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`- GET /api/feed`);
  console.log(`- GET /api/preview?url=...`);
  console.log(`- POST /api/vote { item_id }`);
  console.log(`- POST /api/sync { bookmarks: [...] }`);
});
