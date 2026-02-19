import { Router } from "express";
import fs from "fs";
import path from "path";
import {
  claimCaptureJobForUserIfUnowned,
  claimScreenshotForUserIfUnowned,
  getScreenshotById,
  getScreenshotByIdForUser,
} from "./db";
import { PRESET_MAP } from "../shared/presets";
import { DATA_DIR } from "./storage";
import { getSessionUserFromRequest } from "./_core/session";
import { embedAltText } from "./pngMeta";

const downloadRouter = Router();

// Individual screenshot download - embeds alt text as PNG metadata if present
downloadRouter.get("/api/download/:screenshotId", async (req, res) => {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const screenshotId = parseInt(req.params.screenshotId);
    if (isNaN(screenshotId)) {
      res.status(400).json({ error: "Invalid screenshot ID" });
      return;
    }

    let screenshot = await getScreenshotByIdForUser(screenshotId, user.id);
    if (!screenshot) {
      const unowned = await getScreenshotById(screenshotId);
      if (unowned && unowned.userId === null) {
        await claimCaptureJobForUserIfUnowned(unowned.jobId, user.id);
        await claimScreenshotForUserIfUnowned(screenshotId, user.id);
        screenshot = await getScreenshotByIdForUser(screenshotId, user.id);
      }
    }
    if (!screenshot) {
      res.status(404).json({ error: "Screenshot not found" });
      return;
    }

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
    res.setHeader("Cache-Control", "no-cache");

    if (screenshot.altText) {
      const rawBuffer = await fs.promises.readFile(filePath);
      const withMeta = embedAltText(rawBuffer, screenshot.altText);
      res.end(withMeta);
    } else {
      res.sendFile(filePath);
    }
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed" });
    }
  }
});

export default downloadRouter;
