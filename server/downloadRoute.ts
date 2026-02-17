import { Router } from "express";
import { getScreenshotById } from "./db";
import { PRESET_MAP } from "../shared/presets";

const downloadRouter = Router();

// Individual screenshot download - proxies the S3 file through the server
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

    // Fetch the image from S3
    const response = await fetch(screenshot.fileUrl);
    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch screenshot from storage" });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const preset = PRESET_MAP[screenshot.presetKey];
    const filename = `${preset?.label || screenshot.presetKey}-${screenshot.width}x${screenshot.height}.png`
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed" });
    }
  }
});

export default downloadRouter;
