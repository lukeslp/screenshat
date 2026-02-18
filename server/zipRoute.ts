import { Router } from "express";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import { getScreenshotsByJobId, getCaptureJobById } from "./db";
import { PRESET_MAP } from "../shared/presets";
import { DATA_DIR } from "./storage";

const zipRouter = Router();

zipRouter.get("/api/download-zip/:jobId", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getCaptureJobById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const screenshots = await getScreenshotsByJobId(jobId);
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

      archive.file(filePath, { name });
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
