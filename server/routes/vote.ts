import { Router, Request, Response } from "express";
import { dbProvider } from "../db/database.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: "item_id required" });
  }

  // Resolve user
  const authHeader = req.headers.authorization;
  let userId = "anonymous";
  if (authHeader?.startsWith("Bearer ")) {
    userId = authHeader.split(" ")[1];
  }

  dbProvider.toggleVote(userId, item_id);
  res.json({ success: true });
});

export default router;
