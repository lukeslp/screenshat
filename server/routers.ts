import { COOKIE_NAME } from "@shared/const";
import { PRESETS, PRESET_MAP } from "@shared/presets";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { captureScreenshots } from "./screenshotService";
import { storagePut } from "./storage";
import {
  createCaptureJob,
  updateCaptureJobStatus,
  getAllCaptureJobs,
  getCaptureJobById,
  createScreenshot,
  getScreenshotsByJobId,
  getScreenshotById,
  updateScreenshotAnalysis,
  updateScreenshotAltText,
  deleteCaptureJob,
} from "./db";
import { analyzeWithVision } from "./_core/llm";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  capture: router({
    presets: publicProcedure.query(() => PRESETS),

    start: publicProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          presetKeys: z.array(z.string()).min(1, "Select at least one preset"),
          waitStrategy: z.enum(["networkidle", "domcontentloaded", "load", "commit"]).default("networkidle"),
          customSelector: z.string().optional(),
          extraWaitMs: z.number().min(0).max(30000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const validKeys = input.presetKeys.filter(k => PRESET_MAP[k]);
        if (validKeys.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No valid presets selected" });
        }

        const job = await createCaptureJob({
          url: input.url,
          presets: validKeys,
          waitStrategy: input.waitStrategy,
          customSelector: input.customSelector ?? null,
          extraWaitMs: input.extraWaitMs ?? 0,
        });

        try {
          await updateCaptureJobStatus(job.id, "processing");

          const results = await captureScreenshots({
            url: input.url,
            presetKeys: validKeys,
            waitStrategy: input.waitStrategy,
            customSelector: input.customSelector,
            extraWaitMs: input.extraWaitMs,
          });

          const screenshotRecords = [];
          for (const result of results) {
            const fileKey = `screenshots/${job.id}/${result.presetKey}-${nanoid(8)}.png`;
            const { url: fileUrl } = await storagePut(fileKey, result.buffer, result.mimeType);

            const record = await createScreenshot({
              jobId: job.id,
              presetKey: result.presetKey,
              width: result.width,
              height: result.height,
              fileUrl,
              fileKey,
              fileSizeBytes: result.buffer.length,
            });
            screenshotRecords.push(record);
          }

          await updateCaptureJobStatus(job.id, "completed");

          return {
            jobId: job.id,
            status: "completed" as const,
            screenshots: screenshotRecords,
            capturedCount: screenshotRecords.length,
            requestedCount: validKeys.length,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown capture error";
          await updateCaptureJobStatus(job.id, "failed", errorMsg);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Capture failed: ${errorMsg}`,
          });
        }
      }),

    getJob: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const job = await getCaptureJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        const jobScreenshots = await getScreenshotsByJobId(job.id);
        return { ...job, screenshots: jobScreenshots };
      }),

    history: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ input }) => {
        const jobs = await getAllCaptureJobs(input?.limit ?? 50);
        const jobsWithCounts = await Promise.all(
          jobs.map(async (job) => {
            const jobScreenshots = await getScreenshotsByJobId(job.id);
            return {
              ...job,
              screenshotCount: jobScreenshots.length,
              thumbnailUrl: jobScreenshots[0]?.fileUrl ?? null,
            };
          })
        );
        return jobsWithCounts;
      }),

    analyze: publicProcedure
      .input(z.object({ screenshotId: z.number() }))
      .mutation(async ({ input }) => {
        const screenshot = await getScreenshotById(input.screenshotId);
        if (!screenshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }

        try {
          const prompt = `Analyze this screenshot (${screenshot.width}x${screenshot.height}px, preset: ${screenshot.presetKey}) and provide:
1. A brief description of the content
2. The primary focal point coordinates (as percentage from top-left)
3. Suggested crop regions for different social formats (OG 1.91:1, Twitter 16:9, Instagram 1:1, Instagram 4:5, Story 9:16, Pinterest 2:3)
4. A quality score (1-10) for how well this screenshot works as a social share image
5. Suggestions for improvement

Return ONLY valid JSON with keys: description (string), focalPoint {x, y} (numbers 0-100), cropSuggestions [{format, x, y, width, height}] (numbers 0-100), qualityScore (number 1-10), suggestions (string[])`;

          // Read the file locally and pass as base64 so the LLM can analyze it
          const { DATA_DIR } = await import("./storage");
          const filePath = path.join(DATA_DIR, screenshot.fileKey);
          const fileBuffer = await fs.promises.readFile(filePath);
          const base64Image = `data:image/png;base64,${fileBuffer.toString("base64")}`;
          const content = await analyzeWithVision(base64Image, prompt);
          let analysis = null;
          try {
            // Strip markdown code fences if present
            const cleaned = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
            analysis = JSON.parse(cleaned);
          } catch {
            console.error("Failed to parse LLM JSON response:", content);
          }

          if (analysis) {
            await updateScreenshotAnalysis(screenshot.id, analysis);
          }

          return analysis;
        } catch (error) {
          console.error("LLM analysis failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to analyze screenshot",
          });
        }
      }),

    generateAltText: publicProcedure
      .input(z.object({ screenshotId: z.number() }))
      .mutation(async ({ input }) => {
        const screenshot = await getScreenshotById(input.screenshotId);
        if (!screenshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }

        try {
          const prompt = `Generate concise, descriptive alt text for this screenshot.
The image is a ${screenshot.width}×${screenshot.height}px screenshot of a webpage (preset: ${screenshot.presetKey}).
Write 1-2 sentences describing what the page shows: the layout, main content, and purpose.
Keep it under 125 characters. Return ONLY the alt text string — no quotes, no JSON, no explanation.`;

          const { DATA_DIR } = await import("./storage");
          const filePath = path.join(DATA_DIR, screenshot.fileKey);
          const fileBuffer = await fs.promises.readFile(filePath);
          const base64Image = `data:image/png;base64,${fileBuffer.toString("base64")}`;
          const altText = (await analyzeWithVision(base64Image, prompt)).trim();

          await updateScreenshotAltText(screenshot.id, altText);
          return { altText };
        } catch (error) {
          console.error("Alt text generation failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate alt text",
          });
        }
      }),

    updateAltText: publicProcedure
      .input(z.object({ screenshotId: z.number(), altText: z.string().max(500) }))
      .mutation(async ({ input }) => {
        const screenshot = await getScreenshotById(input.screenshotId);
        if (!screenshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }
        await updateScreenshotAltText(screenshot.id, input.altText.trim() || null);
        return { success: true };
      }),

    deleteJob: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        const job = await getCaptureJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        await deleteCaptureJob(input.jobId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
