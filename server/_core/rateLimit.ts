type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RequestLike = {
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

const WINDOW_STATE = new Map<string, RateLimitEntry>();
const MAX_STATE_ENTRIES = 10_000;

function getHeaderValue(headers: RequestLike["headers"], key: string): string | undefined {
  if (!headers) return undefined;
  const value = headers[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find(item => typeof item === "string");
  return undefined;
}

function pruneExpired(nowMs: number): void {
  WINDOW_STATE.forEach((entry, key) => {
    if (entry.resetAt <= nowMs) {
      WINDOW_STATE.delete(key);
    }
  });
}

function trimStateIfNeeded(): void {
  if (WINDOW_STATE.size <= MAX_STATE_ENTRIES) return;
  const overflow = WINDOW_STATE.size - MAX_STATE_ENTRIES;
  const keys = Array.from(WINDOW_STATE.keys());
  for (let i = 0; i < overflow; i += 1) {
    const key = keys[i];
    if (key) WINDOW_STATE.delete(key);
  }
}

export function getClientIp(req: RequestLike): string {
  const forwardedFor = getHeaderValue(req.headers, "x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    const value = first?.trim();
    if (value) return value;
  }

  if (typeof req.ip === "string" && req.ip.trim()) return req.ip.trim();
  if (typeof req.socket?.remoteAddress === "string" && req.socket.remoteAddress.trim()) {
    return req.socket.remoteAddress.trim();
  }

  return "unknown";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  nowMs: number = Date.now()
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  pruneExpired(nowMs);
  trimStateIfNeeded();

  if (limit <= 0 || windowMs <= 0) {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, retryAfterMs: 0 };
  }

  const entry = WINDOW_STATE.get(key);
  if (!entry) {
    WINDOW_STATE.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterMs: 0 };
  }

  if (entry.resetAt <= nowMs) {
    WINDOW_STATE.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(entry.resetAt - nowMs, 1) };
  }

  entry.count += 1;
  WINDOW_STATE.set(key, entry);
  return {
    allowed: true,
    remaining: Math.max(limit - entry.count, 0),
    retryAfterMs: 0,
  };
}

export function resetRateLimiterState(): void {
  WINDOW_STATE.clear();
}
