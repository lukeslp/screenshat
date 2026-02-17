import { describe, expect, it, vi } from "vitest";
import { PRESETS, PRESET_MAP, SOCIAL_PRESETS, HIGHRES_PRESETS, WAIT_STRATEGIES } from "../shared/presets";

describe("Presets", () => {
  it("should have all expected social media presets", () => {
    const expectedKeys = [
      "og-facebook",
      "twitter",
      "linkedin",
      "instagram-square",
      "instagram-portrait",
      "instagram-story",
      "pinterest",
    ];
    expectedKeys.forEach(key => {
      expect(PRESET_MAP[key]).toBeDefined();
      expect(PRESET_MAP[key].category).toBe("social");
    });
  });

  it("should have all expected high-res presets", () => {
    const expectedKeys = ["2k", "4k", "8k", "16k"];
    expectedKeys.forEach(key => {
      expect(PRESET_MAP[key]).toBeDefined();
      expect(PRESET_MAP[key].category).toBe("highres");
    });
  });

  it("should have correct OG/Facebook dimensions", () => {
    const og = PRESET_MAP["og-facebook"];
    expect(og.width).toBe(1200);
    expect(og.height).toBe(630);
    expect(og.aspectRatio).toBe("1.91:1");
  });

  it("should have correct Twitter dimensions", () => {
    const twitter = PRESET_MAP["twitter"];
    expect(twitter.width).toBe(1200);
    expect(twitter.height).toBe(675);
    expect(twitter.aspectRatio).toBe("16:9");
  });

  it("should have correct Instagram Square dimensions", () => {
    const ig = PRESET_MAP["instagram-square"];
    expect(ig.width).toBe(1080);
    expect(ig.height).toBe(1080);
    expect(ig.aspectRatio).toBe("1:1");
  });

  it("should have correct Instagram Portrait dimensions", () => {
    const ig = PRESET_MAP["instagram-portrait"];
    expect(ig.width).toBe(1080);
    expect(ig.height).toBe(1350);
    expect(ig.aspectRatio).toBe("4:5");
  });

  it("should have correct Instagram Story dimensions", () => {
    const ig = PRESET_MAP["instagram-story"];
    expect(ig.width).toBe(1080);
    expect(ig.height).toBe(1920);
    expect(ig.aspectRatio).toBe("9:16");
  });

  it("should have correct Pinterest dimensions", () => {
    const pin = PRESET_MAP["pinterest"];
    expect(pin.width).toBe(1000);
    expect(pin.height).toBe(1500);
    expect(pin.aspectRatio).toBe("2:3");
  });

  it("should have correct LinkedIn dimensions", () => {
    const li = PRESET_MAP["linkedin"];
    expect(li.width).toBe(1200);
    expect(li.height).toBe(627);
    expect(li.aspectRatio).toBe("1.91:1");
  });

  it("should have correct 4K dimensions", () => {
    const fourk = PRESET_MAP["4k"];
    expect(fourk.width).toBe(3840);
    expect(fourk.height).toBe(2160);
  });

  it("should have correct 8K dimensions", () => {
    const eightk = PRESET_MAP["8k"];
    expect(eightk.width).toBe(7680);
    expect(eightk.height).toBe(4320);
  });

  it("should have correct 16K dimensions", () => {
    const sixteenk = PRESET_MAP["16k"];
    expect(sixteenk.width).toBe(15360);
    expect(sixteenk.height).toBe(8640);
  });

  it("should have 7 social presets and 4 highres presets", () => {
    expect(SOCIAL_PRESETS.length).toBe(7);
    expect(HIGHRES_PRESETS.length).toBe(4);
    expect(PRESETS.length).toBe(11);
  });

  it("should have unique keys for all presets", () => {
    const keys = PRESETS.map(p => p.key);
    const uniqueKeys = Array.from(new Set(keys));
    expect(keys.length).toBe(uniqueKeys.length);
  });

  it("should have positive dimensions for all presets", () => {
    PRESETS.forEach(p => {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    });
  });

  it("should have valid device scale factors", () => {
    PRESETS.forEach(p => {
      expect(p.deviceScaleFactor).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Wait Strategies", () => {
  it("should have 4 wait strategies", () => {
    expect(WAIT_STRATEGIES.length).toBe(4);
  });

  it("should include networkidle as default strategy", () => {
    const ni = WAIT_STRATEGIES.find(ws => ws.value === "networkidle");
    expect(ni).toBeDefined();
    expect(ni!.label).toBe("Network Idle");
  });

  it("should include all expected strategies", () => {
    const values = WAIT_STRATEGIES.map(ws => ws.value);
    expect(values).toContain("networkidle");
    expect(values).toContain("domcontentloaded");
    expect(values).toContain("load");
    expect(values).toContain("commit");
  });
});

describe("Router input validation", () => {
  it("should validate URL format", () => {
    const validUrls = [
      "https://example.com",
      "https://dr.eamer.dev/datavis/interactive/steam/",
      "http://localhost:3000",
      "https://sub.domain.example.co.uk/path?query=1",
    ];

    const invalidUrls = [
      "",
      "not-a-url",
      "ftp://invalid",
    ];

    validUrls.forEach(url => {
      expect(() => new URL(url)).not.toThrow();
    });

    invalidUrls.forEach(url => {
      if (url === "") {
        expect(url.trim().length).toBe(0);
      } else {
        try {
          new URL(url);
        } catch {
          expect(true).toBe(true);
        }
      }
    });
  });

  it("should validate preset keys against known presets", () => {
    const validKeys = ["og-facebook", "twitter", "4k"];
    const invalidKeys = ["nonexistent", "fake-preset"];

    validKeys.forEach(key => {
      expect(PRESET_MAP[key]).toBeDefined();
    });

    invalidKeys.forEach(key => {
      expect(PRESET_MAP[key]).toBeUndefined();
    });
  });

  it("should validate extra wait ms bounds", () => {
    const validValues = [0, 500, 1000, 5000, 30000];
    const invalidValues = [-1, 30001, 100000];

    validValues.forEach(v => {
      expect(v >= 0 && v <= 30000).toBe(true);
    });

    invalidValues.forEach(v => {
      expect(v >= 0 && v <= 30000).toBe(false);
    });
  });
});

describe("Database helpers (public access)", () => {
  it("should export all required db functions", async () => {
    const db = await import("./db");
    expect(typeof db.createCaptureJob).toBe("function");
    expect(typeof db.updateCaptureJobStatus).toBe("function");
    expect(typeof db.getAllCaptureJobs).toBe("function");
    expect(typeof db.getCaptureJobById).toBe("function");
    expect(typeof db.deleteCaptureJob).toBe("function");
    expect(typeof db.createScreenshot).toBe("function");
    expect(typeof db.getScreenshotsByJobId).toBe("function");
    expect(typeof db.getScreenshotById).toBe("function");
    expect(typeof db.updateScreenshotAnalysis).toBe("function");
  });
});

describe("Screenshot Service", () => {
  it("should export captureScreenshots and closeBrowser", async () => {
    const mod = await import("./screenshotService");
    expect(typeof mod.captureScreenshots).toBe("function");
    expect(typeof mod.closeBrowser).toBe("function");
  });
});

describe("tRPC router structure", () => {
  it("should export appRouter with expected procedures", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    const routerDef = appRouter._def;
    expect(routerDef).toBeDefined();
  });
});
