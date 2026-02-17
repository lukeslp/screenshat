import { chromium, type Browser, type Page } from "playwright";
import { PRESET_MAP, type ScreenshotPreset, type WaitStrategy } from "../shared/presets";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
    ],
  });
  return browserInstance;
}

export interface CaptureOptions {
  url: string;
  presetKeys: string[];
  waitStrategy: WaitStrategy;
  customSelector?: string;
  extraWaitMs?: number;
}

export interface CaptureResult {
  presetKey: string;
  width: number;
  height: number;
  buffer: Buffer;
  mimeType: string;
}

async function waitForPageReady(
  page: Page,
  waitStrategy: WaitStrategy,
  customSelector?: string,
  extraWaitMs?: number
): Promise<void> {
  // Wait for the specified strategy
  if (waitStrategy !== "commit") {
    await page.waitForLoadState(waitStrategy, { timeout: 60000 });
  }

  // Always also wait for fonts
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // Wait for custom selector if provided
  if (customSelector) {
    await page.waitForSelector(customSelector, { timeout: 30000, state: "visible" }).catch(() => {
      console.warn(`Custom selector "${customSelector}" not found within timeout`);
    });
  }

  // Wait for images to load
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll("img"));
    await Promise.allSettled(
      images
        .filter(img => !img.complete)
        .map(
          img =>
            new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve());
              img.addEventListener("error", () => resolve());
              setTimeout(() => resolve(), 5000);
            })
        )
    );
  }).catch(() => {});

  // Wait for canvas elements to render (important for data visualizations)
  await page.evaluate(async () => {
    const canvases = document.querySelectorAll("canvas");
    if (canvases.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }).catch(() => {});

  // Wait for any remaining animations
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }).catch(() => {});

  // Extra wait time
  if (extraWaitMs && extraWaitMs > 0) {
    await page.waitForTimeout(Math.min(extraWaitMs, 30000));
  }

  // Small buffer for final rendering
  await page.waitForTimeout(500);
}

export async function captureScreenshots(options: CaptureOptions): Promise<CaptureResult[]> {
  const { url, presetKeys, waitStrategy, customSelector, extraWaitMs } = options;
  const browser = await getBrowser();
  const results: CaptureResult[] = [];

  // Sort presets: do smaller ones first, larger ones last
  const sortedPresets = presetKeys
    .map(key => PRESET_MAP[key])
    .filter((p): p is ScreenshotPreset => !!p)
    .sort((a, b) => (a.width * a.height) - (b.width * b.height));

  for (const preset of sortedPresets) {
    let context;
    try {
      context = await browser.newContext({
        viewport: { width: preset.width, height: preset.height },
        deviceScaleFactor: preset.deviceScaleFactor,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();

      // Navigate to URL
      await page.goto(url, {
        waitUntil: waitStrategy === "commit" ? "commit" : "domcontentloaded",
        timeout: 60000,
      });

      // Wait for page to be fully ready
      await waitForPageReady(page, waitStrategy, customSelector, extraWaitMs);

      // Take screenshot
      const buffer = await page.screenshot({
        type: "png",
        fullPage: false,
        animations: "disabled",
      });

      results.push({
        presetKey: preset.key,
        width: preset.width,
        height: preset.height,
        buffer: Buffer.from(buffer),
        mimeType: "image/png",
      });
    } catch (error) {
      console.error(`Failed to capture ${preset.key}:`, error);
      // Continue with other presets even if one fails
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  return results;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

// Graceful shutdown
process.on("SIGTERM", closeBrowser);
process.on("SIGINT", closeBrowser);
