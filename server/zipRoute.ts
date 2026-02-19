import { Router } from "express";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import {
  claimCaptureJobForUserIfUnowned,
  claimScreenshotsForJobIfUnowned,
  getCaptureJobById,
  getCaptureJobByIdForUser,
  getScreenshotsByJobIdForUser,
} from "./db";
import { PRESET_MAP } from "../shared/presets";
import { DATA_DIR } from "./storage";
import { getSessionUserFromRequest } from "./_core/session";
import { embedAltText } from "./pngMeta";

const zipRouter = Router();

zipRouter.get("/api/download-zip/:jobId", async (req, res) => {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    let job = await getCaptureJobByIdForUser(jobId, user.id);
    if (!job) {
      const unowned = await getCaptureJobById(jobId);
      if (unowned && unowned.userId === null) {
        await claimCaptureJobForUserIfUnowned(jobId, user.id);
        await claimScreenshotsForJobIfUnowned(jobId, user.id);
        job = await getCaptureJobByIdForUser(jobId, user.id);
      }
    }
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const screenshots = await getScreenshotsByJobIdForUser(jobId, user.id);
    if (screenshots.length === 0) {
      res.status(404).json({ error: "No screenshots found" });
      return;
    }

    const sanitizedUrl = (job.url as string)
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 50);
    const filename = `screenshots-${sanitizedUrl}-${jobId}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(res);

    for (const ss of screenshots) {
      const filePath = path.join(DATA_DIR, ss.fileKey);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found on disk: ${filePath}`);
        continue;
      }

      const preset = PRESET_MAP[ss.presetKey];
      const name = `${preset?.label || ss.presetKey}-${ss.width}x${ss.height}.png`
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      if (ss.altText) {
        const rawBuffer = await fs.promises.readFile(filePath);
        const withMeta = embedAltText(rawBuffer, ss.altText);
        archive.append(withMeta, { name });
      } else {
        archive.file(filePath, { name });
      }
    }

    // Include an alt-text manifest in the ZIP
    const hasAnyAltText = screenshots.some(ss => ss.altText);
    if (hasAnyAltText) {
      const manifest = screenshots
        .map(ss => {
          const preset = PRESET_MAP[ss.presetKey];
          const name = `${preset?.label || ss.presetKey}-${ss.width}x${ss.height}.png`
            .replace(/[^a-zA-Z0-9._-]/g, "_");
          return `${name}: ${ss.altText ?? "(no alt text)"}`;
        })
        .join("\n");
      archive.append(Buffer.from(manifest, "utf8"), { name: "alt-text.txt" });
    }

    await archive.finalize();
  } catch (error) {
    console.error("ZIP download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create ZIP" });
    }
  }
});

export default zipRouter;
