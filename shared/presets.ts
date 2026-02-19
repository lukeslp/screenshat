export type PresetCategory = "social" | "highres" | "mobile";

export interface ScreenshotPreset {
  key: string;
  label: string;
  width: number;
  height: number;
  category: PresetCategory;
  description: string;
  icon: string;
  aspectRatio: string;
  deviceScaleFactor: number;
}

export const PRESETS: ScreenshotPreset[] = [
  // Social Media Presets
  {
    key: "og-facebook",
    label: "OG / Facebook",
    width: 1200,
    height: 630,
    category: "social",
    description: "Open Graph & Facebook share card",
    icon: "facebook",
    aspectRatio: "1.91:1",
    deviceScaleFactor: 1,
  },
  {
    key: "twitter",
    label: "Twitter / X",
    width: 1200,
    height: 675,
    category: "social",
    description: "Twitter summary large image card",
    icon: "twitter",
    aspectRatio: "16:9",
    deviceScaleFactor: 1,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    width: 1200,
    height: 627,
    category: "social",
    description: "LinkedIn share post image",
    icon: "linkedin",
    aspectRatio: "1.91:1",
    deviceScaleFactor: 1,
  },
  {
    key: "instagram-square",
    label: "Instagram Square",
    width: 1080,
    height: 1080,
    category: "social",
    description: "Instagram feed square post",
    icon: "instagram",
    aspectRatio: "1:1",
    deviceScaleFactor: 1,
  },
  {
    key: "instagram-portrait",
    label: "Instagram Portrait",
    width: 1080,
    height: 1350,
    category: "social",
    description: "Instagram feed portrait post",
    icon: "instagram",
    aspectRatio: "4:5",
    deviceScaleFactor: 1,
  },
  {
    key: "instagram-story",
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    category: "social",
    description: "Instagram story / reel cover",
    icon: "instagram",
    aspectRatio: "9:16",
    deviceScaleFactor: 1,
  },
  {
    key: "pinterest",
    label: "Pinterest",
    width: 1000,
    height: 1500,
    category: "social",
    description: "Pinterest pin image",
    icon: "pinterest",
    aspectRatio: "2:3",
    deviceScaleFactor: 1,
  },
  // Mobile Portrait Presets
  {
    key: "mobile-iphone",
    label: "Mobile (iPhone)",
    width: 390,
    height: 844,
    category: "mobile",
    description: "iPhone 14/15 viewport — standard mobile portrait",
    icon: "smartphone",
    aspectRatio: "9:19.5",
    deviceScaleFactor: 3,
  },
  {
    key: "mobile-android",
    label: "Mobile (Android)",
    width: 412,
    height: 915,
    category: "mobile",
    description: "Pixel 7 viewport — standard Android portrait",
    icon: "smartphone",
    aspectRatio: "9:20",
    deviceScaleFactor: 3,
  },
  {
    key: "tablet-portrait",
    label: "Tablet Portrait",
    width: 768,
    height: 1024,
    category: "mobile",
    description: "iPad portrait — 768 × 1024",
    icon: "tablet",
    aspectRatio: "3:4",
    deviceScaleFactor: 2,
  },
  // High Resolution Presets
  // deviceScaleFactor = DPR: CSS viewport is width/DPR × height/DPR, output pixels are width × height
  // This zooms content proportionately rather than rendering in miniature at a huge viewport.
  {
    key: "2k",
    label: "2K QHD",
    width: 2560,
    height: 1440,
    category: "highres",
    description: "2560 × 1440 — 2× pixel density on 1280×720 viewport",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 2,
  },
  {
    key: "4k",
    label: "4K UHD",
    width: 3840,
    height: 2160,
    category: "highres",
    description: "3840 × 2160 — 2× pixel density on 1920×1080 viewport",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 2,
  },
  {
    key: "8k",
    label: "8K UHD",
    width: 7680,
    height: 4320,
    category: "highres",
    description: "7680 × 4320 — 4× pixel density on 1920×1080 viewport",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 4,
  },
  {
    key: "16k",
    label: "16K",
    width: 15360,
    height: 8640,
    category: "highres",
    description: "15360 × 8640 — 8× pixel density on 1920×1080 viewport",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 8,
  },
  // High Resolution Portrait Presets (same DPR, portrait viewport)
  {
    key: "2k-portrait",
    label: "2K Portrait",
    width: 1440,
    height: 2560,
    category: "highres",
    description: "1440 × 2560 — 2× pixel density on 720×1280 portrait viewport",
    icon: "monitor",
    aspectRatio: "9:16",
    deviceScaleFactor: 2,
  },
  {
    key: "4k-portrait",
    label: "4K Portrait",
    width: 2160,
    height: 3840,
    category: "highres",
    description: "2160 × 3840 — 2× pixel density on 1080×1920 portrait viewport",
    icon: "monitor",
    aspectRatio: "9:16",
    deviceScaleFactor: 2,
  },
  {
    key: "8k-portrait",
    label: "8K Portrait",
    width: 4320,
    height: 7680,
    category: "highres",
    description: "4320 × 7680 — 4× pixel density on 1080×1920 portrait viewport",
    icon: "monitor",
    aspectRatio: "9:16",
    deviceScaleFactor: 4,
  },
  {
    key: "16k-portrait",
    label: "16K Portrait",
    width: 8640,
    height: 15360,
    category: "highres",
    description: "8640 × 15360 — 8× pixel density on 1080×1920 portrait viewport",
    icon: "monitor",
    aspectRatio: "9:16",
    deviceScaleFactor: 8,
  },
];

export const PRESET_MAP = Object.fromEntries(PRESETS.map(p => [p.key, p]));

export const SOCIAL_PRESETS = PRESETS.filter(p => p.category === "social");
export const HIGHRES_PRESETS = PRESETS.filter(p => p.category === "highres");
export const MOBILE_PRESETS = PRESETS.filter(p => p.category === "mobile");

export type WaitStrategy = "networkidle" | "domcontentloaded" | "load" | "commit";

export const WAIT_STRATEGIES: { value: WaitStrategy; label: string; description: string }[] = [
  { value: "networkidle", label: "Network Idle", description: "Wait until no network requests for 500ms (best for JS-heavy sites)" },
  { value: "load", label: "Page Load", description: "Wait for the load event to fire" },
  { value: "domcontentloaded", label: "DOM Ready", description: "Wait for DOMContentLoaded event" },
  { value: "commit", label: "First Response", description: "Wait for first server response (fastest)" },
];
