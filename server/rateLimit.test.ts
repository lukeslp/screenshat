import { describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimiterState,
} from "./_core/rateLimit";

describe("rateLimit", () => {
  it("allows requests until limit is reached", () => {
    resetRateLimiterState();

    const first = consumeRateLimit("ip1:capture:start", 2, 60_000, 1_000);
    const second = consumeRateLimit("ip1:capture:start", 2, 60_000, 1_001);
    const third = consumeRateLimit("ip1:capture:start", 2, 60_000, 1_002);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets counters after the window expires", () => {
    resetRateLimiterState();

    consumeRateLimit("ip1:capture:start", 1, 1_000, 10_000);
    const blocked = consumeRateLimit("ip1:capture:start", 1, 1_000, 10_500);
    const reset = consumeRateLimit("ip1:capture:start", 1, 1_000, 11_001);

    expect(blocked.allowed).toBe(false);
    expect(reset.allowed).toBe(true);
  });

  it("extracts client IP from forwarded header when available", () => {
    const ip = getClientIp({
      headers: { "x-forwarded-for": "198.51.100.25, 10.0.0.1" },
      ip: "127.0.0.1",
    });
    expect(ip).toBe("198.51.100.25");
  });

  it("falls back to req.ip and socket address", () => {
    const fromReqIp = getClientIp({ ip: "203.0.113.8" });
    const fromSocket = getClientIp({ socket: { remoteAddress: "203.0.113.9" } });

    expect(fromReqIp).toBe("203.0.113.8");
    expect(fromSocket).toBe("203.0.113.9");
  });
});

