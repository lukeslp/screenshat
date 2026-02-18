import { describe, expect, it } from "vitest";
import { assertSafeCaptureUrl } from "./_core/urlSafety";

describe("assertSafeCaptureUrl", () => {
  it("allows public https URLs", async () => {
    const result = await assertSafeCaptureUrl("https://example.com", async () => [
      "93.184.216.34",
    ]);
    expect(result.hostname).toBe("example.com");
    expect(result.protocol).toBe("https:");
  });

  it("rejects localhost hostnames", async () => {
    await expect(
      assertSafeCaptureUrl("http://localhost:3000", async () => ["127.0.0.1"])
    ).rejects.toThrow("Local or internal hostnames are not allowed");
  });

  it("rejects private IPv4 hosts", async () => {
    await expect(
      assertSafeCaptureUrl("http://192.168.1.10/dashboard", async () => [
        "192.168.1.10",
      ])
    ).rejects.toThrow("Private or loopback IP addresses are not allowed");
  });

  it("rejects hostnames that resolve to private addresses", async () => {
    await expect(
      assertSafeCaptureUrl("https://intranet.example", async () => [
        "10.10.10.10",
      ])
    ).rejects.toThrow("Target resolves to a private or loopback IP address");
  });

  it("rejects URLs with non-http protocols", async () => {
    await expect(assertSafeCaptureUrl("file:///etc/passwd")).rejects.toThrow(
      "Only http and https URLs are allowed"
    );
  });
});

