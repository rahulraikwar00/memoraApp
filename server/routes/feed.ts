import { Router, Request, Response } from "express";
import { dbProvider, BookmarkRow } from "../db/database.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  // Resolve user
  const authHeader = req.headers.authorization;
  let username = "anonymous";
  let tokenStr: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    tokenStr = authHeader.split(" ")[1];
    const user = dbProvider.getUserById(tokenStr);
    if (user?.username) username = user.username;
  }

  // Personalized tags from user profile
  let feedTags: string | undefined = req.query.tags as string;
  if (tokenStr) {
    const userTags = dbProvider.getUserTopTags(tokenStr, 5);
    if (userTags.length > 0) {
      feedTags = userTags.map(t => t.tag).join(",");
      console.log(`[FEED][${username}] Personalized tags:`, feedTags);
    }
  }

  const limitNum = Math.min(parseInt(req.query.limit as string) || 50, 100);
  console.log(`[FEED][${username}] Tags=${feedTags || "none"} Limit=${limitNum}`);

  let trending: BookmarkRow[];
  let recent: BookmarkRow[];

  if (feedTags) {
    const tagList = feedTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    if (tagList.length > 0) {
      trending = dbProvider.getFeedByTags(tagList, limitNum);
      recent = trending; // personalized feed combines both
    } else {
      trending = dbProvider.getFeedTrending(limitNum);
      recent = dbProvider.getFeedRecent(limitNum);
    }
  } else {
    trending = dbProvider.getFeedTrending(limitNum);
    recent = dbProvider.getFeedRecent(limitNum);
  }

  res.json({ trending, recent });
});

router.post("/report", (req: Request, res: Response) => {
  const { item_id, reason } = req.body;
  if (!item_id || !reason) {
    return res.status(400).json({ error: "item_id and reason required" });
  }

  try {
    // Increment report count
    dbProvider.reportItem(item_id, reason);
    res.json({ success: true });
  } catch (e) {
    console.error("Report error:", e);
    res.status(500).json({ error: "Failed to report" });
  }
});

export default router;
