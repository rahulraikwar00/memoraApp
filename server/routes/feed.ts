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

  const limitNum = Math.min(parseInt(req.query.limit as string) || 30, 50);
  console.log(`[FEED][${username}] Limit=${limitNum}`);

  const heroItems = dbProvider.getFeedTrending(1);
  const personalizedItems = dbProvider.getPersonalizedMix(tokenStr, 10);
  const flashbackItems = dbProvider.getFlashbackBookmarks(tokenStr, 4);
  const recentItems = dbProvider.getFeedRecent(10);

  // Helper to dedup and ensure no overlap with Hero
  const heroId = heroItems[0]?.id;
  const dedup = (items: BookmarkRow[]) => items.filter(i => i.id !== heroId);

  res.json({
    sections: [
      { id: "hero", type: "hero", title: "Top Trending", items: heroItems },
      { id: "personalized", type: "grid", title: "For You", items: dedup(personalizedItems) },
      { id: "flashback", type: "highlight", title: "Blast from the past", items: dedup(flashbackItems) },
      { id: "recent", type: "grid", title: "Recently Discovered", items: dedup(recentItems) }
    ]
  });
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
