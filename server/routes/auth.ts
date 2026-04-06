import { Router, Request, Response } from "express";
import { z } from "zod";
import { dbProvider } from "../db/database.js";

const checkUsernameSchema = z.object({ username: z.string().min(1) });
const registerSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  avatar_url: z.string().url().optional().nullable(),
});

const router = Router();

router.get("/check-username", (req: Request, res: Response) => {
  const parsed = checkUsernameSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid username" });

  const username = parsed.data.username.toLowerCase().trim();
  res.json({ available: dbProvider.checkUsernameAvailable(username) });
});

router.post("/register", (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { id, avatar_url } = parsed.data;
  const username = parsed.data.username.toLowerCase().trim();

  // Check if device ID already registered
  if (dbProvider.getUserById(id)) {
    return res.status(409).json({ error: "Device already registered", username });
  }

  if (!dbProvider.checkUsernameAvailable(username)) {
    return res.status(400).json({ error: "Username already taken" });
  }

  try {
    dbProvider.registerUser(id, username, avatar_url || null);
    res.json({ success: true, username });
  } catch (err: any) {
    console.log("[REGISTER] Error:", err.message);
    res.status(500).json({ error: "Failed to register" });
  }
});

export default router;
