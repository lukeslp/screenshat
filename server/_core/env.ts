function parseNumber(value: string | undefined, fallback: number, min: number = 1): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  apiGatewayUrl: process.env.API_GATEWAY_URL ?? "http://localhost:5200",
  apiGatewayKey: process.env.API_GATEWAY_KEY ?? "",
  captureStartLimit: parseNumber(process.env.CAPTURE_START_LIMIT, 20),
  captureStartWindowMs: parseNumber(
    process.env.CAPTURE_START_WINDOW_MS,
    15 * 60 * 1000
  ),
  captureAnalyzeLimit: parseNumber(process.env.CAPTURE_ANALYZE_LIMIT, 30),
  captureAnalyzeWindowMs: parseNumber(
    process.env.CAPTURE_ANALYZE_WINDOW_MS,
    60 * 60 * 1000
  ),
  captureCleanupEnabled: parseBoolean(
    process.env.CAPTURE_CLEANUP_ENABLED,
    Boolean(process.env.DATABASE_URL)
  ),
  captureCleanupIntervalMinutes: parseNumber(
    process.env.CAPTURE_CLEANUP_INTERVAL_MINUTES,
    60
  ),
  captureMaxAgeDays: parseNumber(process.env.CAPTURE_MAX_AGE_DAYS, 30),
  // Legacy stubs for unused Manus _core modules
  forgeApiUrl: "",
  forgeApiKey: "",
  appId: "",
  ownerOpenId: "",
  oAuthServerUrl: "",
  cookieSecret: "",
};
