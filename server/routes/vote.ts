import { Router, Request, Response } from "express";
import { dbProvider } from "../db/database.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: "item_id required" });
  }

  dbProvider.vote(item_id);
  res.json({ success: true });
});

export default router;
