import { Router } from "express";
import { captureScreenshots } from "./screenshotService";
import { assertSafeCaptureUrl } from "./_core/urlSafety";
import { ENV } from "./_core/env";
import { PRESET_MAP, SOCIAL_PRESETS, type WaitStrategy } from "../shared/presets";

const captureApiRouter = Router();

/**
 * POST /api/capture
 *
 * Internal screenshot capture endpoint. Called by the api-gateway via X-Internal-Key auth.
 * Stateless — no DB writes, returns base64 PNG(s) inline.
 *
 * Body: { url, presets?, waitStrategy?, customSelector?, extraWaitMs? }
 * Response: { url, screenshots: [{ preset, label, width, height, mimeType, imageData }] }
 */
captureApiRouter.post("/api/capture", async (req, res) => {
  // Auth: validate internal key
  const key = req.headers["x-internal-key"];
  if (!ENV.internalCaptureKey || key !== ENV.internalCaptureKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { url, presets, waitStrategy = "networkidle", customSelector, extraWaitMs } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // URL safety check — blocks SSRF (localhost, private IPs, .local domains, etc.)
  try {
    await assertSafeCaptureUrl(url);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  // Resolve preset keys — default to all social presets if none specified
  let presetKeys: string[];
  if (Array.isArray(presets) && presets.length > 0) {
    presetKeys = presets.filter((k: unknown) => typeof k === "string" && PRESET_MAP[k as string]);
    if (presetKeys.length === 0) {
      res.status(400).json({ error: "No valid preset keys provided" });
      return;
    }
  } else {
    presetKeys = SOCIAL_PRESETS.map(p => p.key);
  }

  try {
    const results = await captureScreenshots({
      url,
      presetKeys,
      waitStrategy: waitStrategy as WaitStrategy,
      customSelector: customSelector || undefined,
      extraWaitMs: extraWaitMs ? Math.min(Number(extraWaitMs), 30000) : undefined,
    });

    const screenshots = results.map(r => ({
      preset: r.presetKey,
      label: PRESET_MAP[r.presetKey]?.label ?? r.presetKey,
      width: r.width,
      height: r.height,
      mimeType: r.mimeType,
      imageData: r.buffer.toString("base64"),
    }));

    res.json({ url, screenshots });
  } catch (err: unknown) {
    console.error("[captureApiRoute] Capture failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Capture failed" });
  }
});

export default captureApiRouter;
