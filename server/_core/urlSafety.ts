import dns from "dns/promises";
import { isIP } from "net";

type HostLookup = (hostname: string) => Promise<string[]>;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "broadcasthost",
]);

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isBlockedHostname(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  return (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".lan")
  );
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIpv4(normalized.replace("::ffff:", ""));
  }
  return false;
}

function isPrivateAddress(address: string): boolean {
  const ip = normalizeHost(address);
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

async function defaultLookupHost(hostname: string): Promise<string[]> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  return records.map(record => record.address);
}

export async function assertSafeCaptureUrl(
  rawUrl: string,
  lookupHost: HostLookup = defaultLookupHost
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  const hostname = normalizeHost(url.hostname);
  if (!hostname) {
    throw new Error("Invalid URL hostname");
  }

  if (isBlockedHostname(hostname)) {
    throw new Error("Local or internal hostnames are not allowed");
  }

  const hostVersion = isIP(hostname);
  if (hostVersion > 0) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private or loopback IP addresses are not allowed");
    }
    return url;
  }

  let resolvedAddresses: string[];
  try {
    resolvedAddresses = await lookupHost(hostname);
  } catch {
    throw new Error("Unable to resolve hostname");
  }

  if (resolvedAddresses.length === 0) {
    throw new Error("Unable to resolve hostname");
  }

  const hasPrivateAddress = resolvedAddresses.some(address =>
    isPrivateAddress(address)
  );
  if (hasPrivateAddress) {
    throw new Error("Target resolves to a private or loopback IP address");
  }

  return url;
}

