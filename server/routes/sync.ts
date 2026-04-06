import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { dbProvider } from "../db/database.js";

const syncBookmarkSchema = z.object({
  id: z.string().min(1),
  url: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  created_at: z.number().optional().nullable(),
});

const syncSchema = z.object({
  bookmarks: z.array(syncBookmarkSchema),
  queue: z.any().optional(),
});

const router = Router();

router.post("/", (req: Request, res: Response) => {
  // Resolve user
  const authHeader = req.headers.authorization;
  let username = "anonymous";
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    userId = token;
    const user = dbProvider.getUserById(token);
    if (user?.username) username = user.username;
  }

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log(`[SYNC][${username}] ERROR: Invalid payload`, parsed.error.issues);
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
  }

  const { bookmarks: incoming } = parsed.data;
  console.log(`[SYNC][${username}] Received ${incoming.length} bookmarks`);

  let synced = 0;
  let errors = 0;

  for (const bm of incoming) {
    if (!bm.id) continue;
    try {
      const urlStr = bm.url || "";
      const isLocal = !urlStr || urlStr.startsWith("local-");
      const serverId = isLocal
        ? bm.id
        : crypto.createHash("sha256").update(urlStr).digest("hex");

      // 1. Upsert bookmark
      dbProvider.upsertBookmark({
        id: serverId,
        url: urlStr,
        title: bm.title || null,
        description: bm.description || null,
        createdAt: bm.created_at || Date.now(),
      });

      // 2. Ownership + deduplicated save count
      if (userId) {
        const isNew = dbProvider.addUserBookmark(userId, serverId);
        if (isNew) dbProvider.incrementSaveCount(serverId);
      } else {
        dbProvider.incrementSaveCount(serverId);
      }

      // 3. Tags
      const tagsArr = typeof bm.tags === "string"
        ? JSON.parse(bm.tags || "[]")
        : (bm.tags || []);

      if (Array.isArray(tagsArr)) {
        for (const tag of tagsArr) {
          const t = String(tag).toLowerCase().trim();
          if (!t) continue;
          dbProvider.addBookmarkTag(serverId, t);
          dbProvider.addGlobalTag(t);
          if (userId) dbProvider.addUserTag(userId, t);
        }
      }

      synced++;
    } catch (err: any) {
      errors++;
      console.log("[SYNC] ERROR:", bm.id, err.message);
    }
  }

  console.log(`[SYNC][${username}] Done. synced=${synced} errors=${errors}`);
  res.json({ success: true, synced });
});

export default router;
