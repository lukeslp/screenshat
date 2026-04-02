// Runtime base path detection — returns "/" on dedicated domains (screenshat.pics),
// "/screenshat/" on dr.eamer.dev. Vite's BASE_URL is still "/screenshat/" for
// built asset paths in HTML, which both Caddy configs handle via prefix stripping.

const DEDICATED_DOMAINS = ["screenshat.pics"];

function isDedicatedDomain(): boolean {
  if (typeof window === "undefined") return false;
  return DEDICATED_DOMAINS.includes(window.location.hostname);
}

/** Base path without trailing slash: "" or "/screenshat" */
export function getBasePath(): string {
  return isDedicatedDomain() ? "" : "/screenshat";
}

/** Base URL with trailing slash: "/" or "/screenshat/" */
export function getBaseUrl(): string {
  return isDedicatedDomain() ? "/" : "/screenshat/";
}
