import { COOKIE_NAME } from "@shared/const";
import { PRESETS, PRESET_MAP } from "@shared/presets";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { captureScreenshots } from "./screenshotService";
import { storagePut } from "./storage";
import {
  createCaptureJob,
  updateCaptureJobStatus,
  getCaptureJobsByUser,
  getCaptureJobById,
  createScreenshot,
  getScreenshotsByJobId,
  getScreenshotById,
  updateScreenshotAnalysis,
} from "./db";
import { invokeLLM } from "./_core/llm";
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
    // Get available presets
    presets: publicProcedure.query(() => {
      return PRESETS;
    }),

    // Start a capture job
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
      .mutation(async ({ ctx, input }) => {
        // Validate preset keys
        const validKeys = input.presetKeys.filter(k => PRESET_MAP[k]);
        if (validKeys.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No valid presets selected" });
        }

        // Create the job record
        const job = await createCaptureJob({
          userId: ctx.user.id,
          url: input.url,
          presets: validKeys,
          waitStrategy: input.waitStrategy,
          customSelector: input.customSelector ?? null,
          extraWaitMs: input.extraWaitMs ?? 0,
        });

        // Process the capture (run in background-ish but we await for the response)
        try {
          await updateCaptureJobStatus(job.id, "processing");

          const results = await captureScreenshots({
            url: input.url,
            presetKeys: validKeys,
            waitStrategy: input.waitStrategy,
            customSelector: input.customSelector,
            extraWaitMs: input.extraWaitMs,
          });

          // Upload each screenshot to S3
          const screenshotRecords = [];
          for (const result of results) {
            const fileKey = `screenshots/${ctx.user.id}/${job.id}/${result.presetKey}-${nanoid(8)}.png`;
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

    // Get job details with screenshots
    getJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await getCaptureJobById(input.jobId);
        if (!job || job.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        const jobScreenshots = await getScreenshotsByJobId(job.id);
        return { ...job, screenshots: jobScreenshots };
      }),

    // Get capture history
    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const jobs = await getCaptureJobsByUser(ctx.user.id, input?.limit ?? 50);
        // For each job, get screenshot count
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

    // Analyze a screenshot with LLM vision
    analyze: protectedProcedure
      .input(z.object({ screenshotId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const screenshot = await getScreenshotById(input.screenshotId);
        if (!screenshot || screenshot.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Screenshot not found" });
        }

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert visual analyst specializing in social media content optimization. Analyze the provided screenshot and suggest optimal crop regions for different social media formats. Consider the visual hierarchy, focal points, text placement, and key content areas. Return a JSON response with your analysis.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this screenshot (${screenshot.width}x${screenshot.height}px, preset: ${screenshot.presetKey}) and provide:
1. A brief description of the content
2. The primary focal point coordinates (as percentage from top-left)
3. Suggested crop regions for different social formats (OG 1.91:1, Twitter 16:9, Instagram 1:1, Instagram 4:5, Story 9:16, Pinterest 2:3)
4. A quality score (1-10) for how well this screenshot works as a social share image
5. Suggestions for improvement

Return as JSON with keys: description, focalPoint {x, y}, cropSuggestions [{format, x, y, width, height}], qualityScore, suggestions[]`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: screenshot.fileUrl,
                      detail: "high",
                    },
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "screenshot_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    focalPoint: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                      },
                      required: ["x", "y"],
                      additionalProperties: false,
                    },
                    cropSuggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          format: { type: "string" },
                          x: { type: "number" },
                          y: { type: "number" },
                          width: { type: "number" },
                          height: { type: "number" },
                        },
                        required: ["format", "x", "y", "width", "height"],
                        additionalProperties: false,
                      },
                    },
                    qualityScore: { type: "number" },
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["description", "focalPoint", "cropSuggestions", "qualityScore", "suggestions"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          const analysis = typeof content === "string" ? JSON.parse(content) : null;

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

    // Delete a job and its screenshots
    deleteJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getCaptureJobById(input.jobId);
        if (!job || job.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        // We don't delete from S3 for now, just mark as deleted or we could add soft delete
        // For simplicity, we'll keep the records but this endpoint exists for future use
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
