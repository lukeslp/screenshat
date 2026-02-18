import { Router } from "express";
import fs from "fs";
import path from "path";
import { getScreenshotById } from "./db";
import { PRESET_MAP } from "../shared/presets";
import { DATA_DIR } from "./storage";

const downloadRouter = Router();

// Individual screenshot download - reads from local storage
downloadRouter.get("/api/download/:screenshotId", async (req, res) => {
  try {
    const screenshotId = parseInt(req.params.screenshotId);
    if (isNaN(screenshotId)) {
      res.status(400).json({ error: "Invalid screenshot ID" });
      return;
    }

    const screenshot = await getScreenshotById(screenshotId);
    if (!screenshot) {
      res.status(404).json({ error: "Screenshot not found" });
      return;
    }

    // fileUrl is like /data/screenshots/screenshots/<jobId>/<preset>-<id>.png
    // fileKey is like screenshots/<jobId>/<preset>-<id>.png
    const filePath = path.join(DATA_DIR, screenshot.fileKey);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    const preset = PRESET_MAP[screenshot.presetKey];
    const filename = `${preset?.label || screenshot.presetKey}-${screenshot.width}x${screenshot.height}.png`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(filePath);
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed" });
    }
  }
});

export default downloadRouter;
