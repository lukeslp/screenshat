import { deleteCaptureJob, getAllCaptureJobs, getScreenshotsByJobId } from "../db";
import { storageDeleteMany } from "../storage";
import { ENV } from "./env";

export type CaptureCleanupResult = {
  scannedJobs: number;
  deletedJobs: number;
  deletedFiles: number;
  missingFiles: number;
  fileDeleteErrors: number;
};

export async function runCaptureCleanup(nowMs: number = Date.now()): Promise<CaptureCleanupResult> {
  const jobs = await getAllCaptureJobs(5000);
  const cutoffMs = nowMs - (ENV.captureMaxAgeDays * 24 * 60 * 60 * 1000);
  const staleJobs = jobs.filter(job => {
    const createdAtMs = new Date(job.createdAt).getTime();
    return Number.isFinite(createdAtMs) && createdAtMs < cutoffMs;
  });

  let deletedJobs = 0;
  let deletedFiles = 0;
  let missingFiles = 0;
  let fileDeleteErrors = 0;

  for (const job of staleJobs) {
    const screenshots = await getScreenshotsByJobId(job.id);
    const fileKeys = screenshots.map(ss => ss.fileKey).filter(Boolean);

    if (fileKeys.length > 0) {
      const fileResult = await storageDeleteMany(fileKeys);
      deletedFiles += fileResult.deleted;
      missingFiles += fileResult.missing;
      fileDeleteErrors += fileResult.errors;
    }

    await deleteCaptureJob(job.id);
    deletedJobs += 1;
  }

  return {
    scannedJobs: jobs.length,
    deletedJobs,
    deletedFiles,
    missingFiles,
    fileDeleteErrors,
  };
}

export function startCaptureCleanupScheduler(): void {
  if (!ENV.captureCleanupEnabled) {
    console.log("[Cleanup] Capture cleanup scheduler disabled");
    return;
  }

  const intervalMs = ENV.captureCleanupIntervalMinutes * 60 * 1000;

  const run = async () => {
    try {
      const result = await runCaptureCleanup();
      if (result.deletedJobs > 0 || result.fileDeleteErrors > 0) {
        console.log(
          `[Cleanup] scanned=${result.scannedJobs} deletedJobs=${result.deletedJobs} deletedFiles=${result.deletedFiles} missingFiles=${result.missingFiles} fileDeleteErrors=${result.fileDeleteErrors}`
        );
      }
    } catch (error) {
      console.error("[Cleanup] Capture cleanup failed:", error);
    }
  };

  void run();

  const timer = setInterval(() => {
    void run();
  }, intervalMs);

  timer.unref();
}

