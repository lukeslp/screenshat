import { COOKIE_NAME } from "@shared/const";
import { PRESETS, PRESET_MAP } from "@shared/presets";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { captureScreenshots } from "./screenshotService";
import { storagePut, DATA_DIR } from "./storage";
import {
  claimCaptureJobForUserIfUnowned,
  claimScreenshotForUserIfUnowned,
  claimScreenshotsForJobIfUnowned,
  createCaptureJob,
  getCaptureJobById,
  updateCaptureJobStatus,
  getAllCaptureJobsByUser,
  getCaptureJobByIdForUser,
  createScreenshot,
  getScreenshotById,
  getScreenshotsByJobIdForUser,
  getScreenshotByIdForUser,
  updateScreenshotAnalysis,
  updateScreenshotAltText,
  deleteCaptureJobForUser,
} from "./db";
import { analyzeWithVision } from "./_core/llm";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { storageDeleteMany } from "./storage";
import { ENV } from "./_core/env";
import { consumeRateLimit, getClientIp } from "./_core/rateLimit";
import { assertSafeCaptureUrl } from "./_core/urlSafety";

async function getCaptureJobForUserOrClaim(jobId: number, userId: number) {
  const owned = await getCaptureJobByIdForUser(jobId, userId);
  if (owned) return owned;

  const unowned = await getCaptureJobById(jobId);
  if (!unowned || unowned.userId !== null) return null;

  await claimCaptureJobForUserIfUnowned(jobId, userId);
  await claimScreenshotsForJobIfUnowned(jobId, userId);
  return getCaptureJobByIdForUser(jobId, userId);
}

async function getScreenshotForUserOrClaim(screenshotId: number, userId: number) {
  const owned = await getScreenshotByIdForUser(screenshotId, userId);
  if (owned) return owned;

  const unowned = await getScreenshotById(screenshotId);
  if (!unowned || unowned.userId !== null) return null;

  await claimCaptureJobForUserIfUnowned(unowned.jobId, userId);
  await claimScreenshotForUserIfUnowned(screenshotId, userId);
  return getScreenshotByIdForUser(screenshotId, userId);
}

function buildFallbackAltText(screenshot: {
  presetKey: string;
  width: number;
  height: number;
}) {
  const preset = PRESET_MAP[screenshot.presetKey];
  const format = preset?.label || screenshot.presetKey;
  return `Website screenshot in ${format} format (${screenshot.width}x${screenshot.height}).`;
}

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
    presets: protectedProcedure.query(() => PRESETS),

    start: protectedProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          presetKeys: z.array(z.string()).min(1, "Select at least one preset"),
          waitStrategy: z.enum(["networkidle", "domcontentloaded", "load", "commit"]).default("networkidle"),
          customSelector: z.string().optional(),
          extraWaitMs: z.number().min(0).max(30000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const rateLimit = consumeRateLimit(
          `${getClientIp(ctx.req)}:capture:start`,
          ENV.captureStartLimit,
          ENV.captureStartWindowMs
        );
        if (!rateLimit.allowed) {
          const retryAfter = Math.ceil(rateLimit.retryAfterMs / 1000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Capture rate limit exceeded. Try again in ${retryAfter} seconds.`,
          });
        }

        let normalizedUrl: string;
        try {
          normalizedUrl = (await assertSafeCaptureUrl(input.url)).toString();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "URL failed safety validation";
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
        const validKeys = input.presetKeys.filter(k => PRESET_MAP[k]);
        if (validKeys.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No valid presets selected" });
        }

        const job = await createCaptureJob({
          userId: ctx.user.id,
          url: normalizedUrl,
          presets: validKeys,
          waitStrategy: input.waitStrategy,
          customSelector: input.customSelector ?? null,
          extraWaitMs: input.extraWaitMs ?? 0,
        });

        try {
          await updateCaptureJobStatus(job.id, "processing");

          const results = await captureScreenshots({
            url: normalizedUrl,
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
              userId: ctx.user.id,
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

    getJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input, ctx }) => {
        const job = await getCaptureJobForUserOrClaim(input.jobId, ctx.user.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        const jobScreenshots = await getScreenshotsByJobIdForUser(
          job.id,
          ctx.user.id
        );
        return { ...job, screenshots: jobScreenshots };
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ input, ctx }) => {
        const jobs = await getAllCaptureJobsByUser(ctx.user.id, input?.limit ?? 50);
        const jobsWithCounts = await Promise.all(
          jobs.map(async (job) => {
            const jobScreenshots = await getScreenshotsByJobIdForUser(
              job.id,
              ctx.user.id
            );
            return {
              ...job,
              screenshotCount: jobScreenshots.length,
              thumbnailUrl: jobScreenshots[0]?.fileUrl ?? null,
            };
          })
        );
        return jobsWithCounts;
      }),

    analyze: protectedProcedure
      .input(z.object({ screenshotId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const rateLimit = consumeRateLimit(
          `${getClientIp(ctx.req)}:capture:analyze`,
          ENV.captureAnalyzeLimit,
          ENV.captureAnalyzeWindowMs
        );
        if (!rateLimit.allowed) {
          const retryAfter = Math.ceil(rateLimit.retryAfterMs / 1000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Analysis rate limit exceeded. Try again in ${retryAfter} seconds.`,
          });
        }

        const screenshot = await getScreenshotForUserOrClaim(
          input.screenshotId,
          ctx.user.id
        );
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
6. A concise alt text string (under 125 chars) describing the page for accessibility and file metadata

Return ONLY valid JSON with keys: description (string), focalPoint {x, y} (numbers 0-100), cropSuggestions [{format, x, y, width, height}] (numbers 0-100), qualityScore (number 1-10), suggestions (string[]), altText (string)`;

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
            // Also save altText if the model returned one
            if (analysis.altText && typeof analysis.altText === "string") {
              await updateScreenshotAltText(screenshot.id, analysis.altText.trim());
            }
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

    generateAltText: protectedProcedure
      .input(z.object({ screenshotId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const screenshot = await getScreenshotForUserOrClaim(
          input.screenshotId,
          ctx.user.id
        );
        if (!screenshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }

        let altText: string;
        try {
          const prompt = `Generate concise, descriptive alt text for this screenshot.
The image is a ${screenshot.width}×${screenshot.height}px screenshot of a webpage (preset: ${screenshot.presetKey}).
Write 1-2 sentences describing what the page shows: the layout, main content, and purpose.
Keep it under 125 characters. Return ONLY the alt text string — no quotes, no JSON, no explanation.`;

          const filePath = path.join(DATA_DIR, screenshot.fileKey);
          const fileBuffer = await fs.promises.readFile(filePath);
          const base64Image = `data:image/png;base64,${fileBuffer.toString("base64")}`;
          altText = (await analyzeWithVision(base64Image, prompt)).trim();
          if (!altText) {
            throw new Error("LLM returned empty alt text");
          }
        } catch (error) {
          console.warn(
            "[AltText] Vision generation failed, using fallback:",
            error
          );
          altText = buildFallbackAltText(screenshot);
        }

        await updateScreenshotAltText(screenshot.id, altText);
        return { altText };
      }),

    updateAltText: protectedProcedure
      .input(z.object({ screenshotId: z.number(), altText: z.string().max(500) }))
      .mutation(async ({ input, ctx }) => {
        const screenshot = await getScreenshotForUserOrClaim(
          input.screenshotId,
          ctx.user.id
        );
        if (!screenshot) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }
        await updateScreenshotAltText(screenshot.id, input.altText.trim() || null);
        return { success: true };
      }),

    deleteJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const job = await getCaptureJobForUserOrClaim(input.jobId, ctx.user.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }

        const screenshots = await getScreenshotsByJobIdForUser(job.id, ctx.user.id);
        const fileDeleteResult = await storageDeleteMany(
          screenshots.map(screenshot => screenshot.fileKey)
        );
        await deleteCaptureJobForUser(input.jobId, ctx.user.id);
        return { success: true, fileDeleteResult };
      }),
  }),
});

export type AppRouter = typeof appRouter;
