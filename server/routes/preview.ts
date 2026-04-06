import { Router, Request, Response } from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
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

export default router;
