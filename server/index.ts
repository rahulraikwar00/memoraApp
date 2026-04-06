import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

// Import routes
import authRoutes from "./routes/auth.js";
import feedRoutes from "./routes/feed.js";
import voteRoutes from "./routes/vote.js";
import syncRoutes from "./routes/sync.js";
import previewRoutes from "./routes/preview.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

// Apply routes
app.use("/api/auth", authRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/preview", previewRoutes);

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
