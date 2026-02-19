# screenshat

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Live](https://img.shields.io/badge/live-dr.eamer.dev%2Fscreenshat-4ade80)](https://dr.eamer.dev/screenshat/)

Screenshot any URL at the exact pixel dimensions each platform expects — social cards, mobile viewports, and print-quality resolutions up to 16K. Captures run through Playwright headless Chromium; the results land in your history with download and ZIP export built in.

## Features

- **Capture 18 presets in one shot** — social cards (OG/Facebook 1200x630, Twitter/X 1200x675, LinkedIn 1200x627, Instagram square/portrait/story, Pinterest 1000x1500), mobile viewports (iPhone 14/15 390x844, Pixel 7 412x915, iPad portrait 768x1024), and high-res landscape + portrait (2K through 16K at correct device pixel ratios)
- **Bulk URL mode** — paste a list of URLs and capture them all against any preset combination
- **Configurable wait strategy** — choose between network idle, page load, DOMContentLoaded, or first server response; add an optional extra delay for late-rendering content
- **Element-targeted capture** — pass a CSS selector to clip the output to a specific DOM node
- **Vision analysis via Claude** — request a quality score, focal point coordinates, suggested crop regions for each social format, and improvement notes for any screenshot
- **Alt text generation** — Claude describes each screenshot in one or two sentences (under 125 characters), stored per-image
- **Alt text embedded in PNG on download** — the `tEXt` chunk is written at download time using the `png-chunk-text` pipeline, so the metadata travels with the file
- **ZIP export with manifest** — download all screenshots from a job as a single ZIP; if any have alt text, an `alt-text.txt` manifest is included
- **Capture history** — every job is persisted in MySQL via Drizzle ORM; browse, re-download, or delete past captures
- **Rate limiting** — per-IP limits on both capture and analysis endpoints keep the service usable under concurrent load
- **URL safety validation** — private IP ranges and localhost are blocked before Playwright touches the request

## Quick Start

```bash
git clone https://github.com/lukeslp/screenshat.git
cd screenshat
pnpm install
cp .env.example .env   # fill in the values below
pnpm db:push           # create MySQL tables via Drizzle
pnpm dev               # Express + Vite dev server on port 5091
```

Production build:

```bash
pnpm build
pnpm start
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@localhost:3306/screenshat` |
| `API_GATEWAY_URL` | Base URL of the local api-gateway that proxies LLM and storage calls |
| `API_GATEWAY_KEY` | Auth token for the api-gateway |
| `JWT_SECRET` | Secret used to sign session cookies |
| `OAUTH_SERVER_URL` | OAuth provider base URL |
| `OWNER_OPEN_ID` | OpenID subject for the admin account |
| `PORT` | Port to listen on (default: 3000, auto-increments if busy) |

## Preset Reference

### Social

| Preset | Dimensions | Ratio |
|--------|-----------|-------|
| OG / Facebook | 1200 x 630 | 1.91:1 |
| Twitter / X | 1200 x 675 | 16:9 |
| LinkedIn | 1200 x 627 | 1.91:1 |
| Instagram Square | 1080 x 1080 | 1:1 |
| Instagram Portrait | 1080 x 1350 | 4:5 |
| Instagram Story | 1080 x 1920 | 9:16 |
| Pinterest | 1000 x 1500 | 2:3 |

### Mobile

| Preset | Dimensions | Device scale |
|--------|-----------|-------------|
| iPhone 14/15 | 390 x 844 | 3x |
| Android (Pixel 7) | 412 x 915 | 3x |
| Tablet Portrait | 768 x 1024 | 2x |

### High Resolution (landscape + portrait)

| Preset | Output pixels | Viewport | Scale |
|--------|-------------|---------|-------|
| 2K QHD | 2560 x 1440 | 1280 x 720 | 2x |
| 4K UHD | 3840 x 2160 | 1920 x 1080 | 2x |
| 8K UHD | 7680 x 4320 | 1920 x 1080 | 4x |
| 16K | 15360 x 8640 | 1920 x 1080 | 8x |
| 2K Portrait | 1440 x 2560 | 720 x 1280 | 2x |
| 4K Portrait | 2160 x 3840 | 1080 x 1920 | 2x |
| 8K Portrait | 4320 x 7680 | 1080 x 1920 | 4x |
| 16K Portrait | 8640 x 15360 | 1080 x 1920 | 8x |

High-res presets use `deviceScaleFactor` instead of a giant viewport, so page content renders at a normal scale and Playwright outputs the full pixel count.

## API

The api-gateway exposes a public endpoint for single-shot capture. Authentication is handled by the gateway; no session cookie is required.

### POST /v1/screenshot/capture

Capture a URL and get the PNG back as base64.

**Request body:**

```json
{
  "url": "https://example.com",
  "preset": "og-facebook"
}
```

**Response:**

```json
{
  "image": "iVBORw0KGgo...",
  "mimeType": "image/png",
  "width": 1200,
  "height": 630,
  "preset": "og-facebook"
}
```

**Example with curl:**

```bash
curl -X POST https://dr.eamer.dev/api-gateway/v1/screenshot/capture \
  -H "Authorization: Bearer $API_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "preset": "twitter"}' | jq '.image' -r | base64 -d > screenshot.png
```

Valid `preset` values are the keys listed in the preset tables above (e.g. `og-facebook`, `twitter`, `4k`, `mobile-iphone`).

## Architecture

Full-stack TypeScript monorepo. Express handles the API and serves the Vite-built React client. tRPC gives end-to-end type safety between client and server without a generated schema file.

```
server/           Express + tRPC routers, Playwright service, download/ZIP routes
server/_core/     Framework wiring: tRPC setup, env, session, LLM client, OAuth
client/src/       React 19 + Vite frontend
client/src/pages/ Home (capture form), History, CaptureResults
shared/           Types, preset definitions, constants shared by both sides
drizzle/          Schema, migrations
```

**Key dependencies:** Playwright 1.58, Drizzle ORM + MySQL2, tRPC 11, React 19, Vite 7, Tailwind 4, Radix UI, Vitest, Zod 4, archiver, png-chunks-extract/encode/text.

## Development

```bash
pnpm dev          # watch mode: tsx (server) + Vite (client)
pnpm check        # TypeScript type check, no emit
pnpm test         # Vitest (node environment)
pnpm format       # Prettier
pnpm db:push      # drizzle-kit generate + migrate
```

Tests live alongside the modules they cover (`server/*.test.ts`). Run a single file:

```bash
pnpm vitest run server/capture.test.ts
```

## License

MIT. See [LICENSE](LICENSE).

---

Built by [Luke Steuber](https://lukesteuber.com) — [@lukesteuber.com](https://bsky.app/profile/lukesteuber.com) on Bluesky.
