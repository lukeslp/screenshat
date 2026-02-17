export type PresetCategory = "social" | "highres";

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
  // High Resolution Presets
  {
    key: "2k",
    label: "2K QHD",
    width: 2560,
    height: 1440,
    category: "highres",
    description: "2560 x 1440 Quad HD",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 1,
  },
  {
    key: "4k",
    label: "4K UHD",
    width: 3840,
    height: 2160,
    category: "highres",
    description: "3840 x 2160 Ultra HD",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 1,
  },
  {
    key: "8k",
    label: "8K UHD",
    width: 7680,
    height: 4320,
    category: "highres",
    description: "7680 x 4320 Full Ultra HD",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 1,
  },
  {
    key: "16k",
    label: "16K",
    width: 15360,
    height: 8640,
    category: "highres",
    description: "15360 x 8640 Maximum Resolution",
    icon: "monitor",
    aspectRatio: "16:9",
    deviceScaleFactor: 1,
  },
];

export const PRESET_MAP = Object.fromEntries(PRESETS.map(p => [p.key, p]));

export const SOCIAL_PRESETS = PRESETS.filter(p => p.category === "social");
export const HIGHRES_PRESETS = PRESETS.filter(p => p.category === "highres");

export type WaitStrategy = "networkidle" | "domcontentloaded" | "load" | "commit";

export const WAIT_STRATEGIES: { value: WaitStrategy; label: string; description: string }[] = [
  { value: "networkidle", label: "Network Idle", description: "Wait until no network requests for 500ms (best for JS-heavy sites)" },
  { value: "load", label: "Page Load", description: "Wait for the load event to fire" },
  { value: "domcontentloaded", label: "DOM Ready", description: "Wait for DOMContentLoaded event" },
  { value: "commit", label: "First Response", description: "Wait for first server response (fastest)" },
];
