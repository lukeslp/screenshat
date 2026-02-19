# screenshat

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Live](https://img.shields.io/badge/live-dr.eamer.dev%2Fscreenshat-4ade80)](https://dr.eamer.dev/screenshat/)

Screenshot any URL at the exact pixel dimensions each platform expects — social cards, mobile viewports, and print-quality resolutions up to 16K. Captures run through Playwright headless Chromium; the results land in your history with download and ZIP export built in.

![screenshat capture page](docs/screenshots/home.png)

<details>
<summary>More screenshots</summary>

![Results page with alt text and analysis](docs/screenshots/results.png)

![Capture history](docs/screenshots/history.png)

</details>

## Features

- **Capture 19 presets in one shot** — social cards (OG/Facebook 1200×630, Twitter/X 1200×675, LinkedIn 1200×627, Instagram square/portrait/story, Pinterest 1000×1500), mobile viewports (iPhone 14/15 390×844, Pixel 7 412×915, iPad portrait 768×1024), and high-res landscape + portrait (2K through 16K at correct device pixel ratios)
- **Configurable wait strategy** — choose between network idle, page load, DOMContentLoaded, or first server response; add an optional extra delay for late-rendering content
- **Element-targeted capture** — pass a CSS selector to clip the output to a specific DOM node
- **Vision analysis** — request a quality score, focal point coordinates, suggested crop regions for each social format, and improvement notes for any screenshot
- **Alt text generation** — describes each screenshot in one or two sentences (under 125 characters), stored per-image and editable inline
- **Alt text embedded in PNG on download** — the `tEXt` chunk is written at download time using the `png-chunk-text` pipeline, so the metadata travels with the file
- **ZIP export with manifest** — download all screenshots from a job as a single ZIP; if any have alt text, an `alt-text.txt` manifest is included
- **Capture history** — every job is persisted in MySQL via Drizzle ORM; browse, re-download, or delete past captures
- **Rate limiting** — per-IP limits on both capture and analysis endpoints keep the service usable under concurrent load
- **URL safety validation** — private IP ranges and localhost are blocked before Playwright touches the request
- **Multi-provider LLM** — switch between a local api-gateway, OpenAI, Anthropic, or Google with one env var

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

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | MySQL connection string, e.g. `mysql://user:pass@localhost:3306/screenshat` |
| `INTERNAL_CAPTURE_KEY` | yes | Secret for internal capture API routes |
| `PORT` | no | Port to listen on (default: 3000, auto-increments if busy) |
| `LLM_PROVIDER` | no | `gateway` (default), `openai`, `anthropic`, or `google` |
| `LLM_API_KEY` | if direct provider | API key for the chosen provider |
| `LLM_MODEL` | no | Override the default model for the chosen provider |
| `API_GATEWAY_URL` | if gateway | Base URL of the local api-gateway that proxies LLM calls |
| `API_GATEWAY_KEY` | if gateway | Auth token for the api-gateway |
| `JWT_SECRET` | no | Secret used to sign session cookies |
| `OAUTH_SERVER_URL` | no | OAuth provider base URL |
| `OWNER_OPEN_ID` | no | OpenID subject for the admin account |

## LLM Setup

Vision analysis and alt text generation are optional — captures work without them. When you run analysis, the server sends the screenshot to whichever provider `LLM_PROVIDER` points at.

### Option 1 — Local api-gateway (default)

Leave `LLM_PROVIDER` unset or set it to `gateway`. Set `API_GATEWAY_URL` and `API_GATEWAY_KEY` to point at a running api-gateway instance.

```env
LLM_PROVIDER=gateway
API_GATEWAY_URL=http://localhost:5200
API_GATEWAY_KEY=your-gateway-key
```

### Option 2 — Direct provider

Set `LLM_PROVIDER` to `openai`, `anthropic`, or `google`, then supply a key. The model defaults are `gpt-5.2`, `claude-sonnet-4-6`, and `gemini-3-flash-preview`. Override with `LLM_MODEL`.

```env
# OpenAI
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-5.2          # optional — this is the default

# Anthropic
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...

# Google
LLM_PROVIDER=google
LLM_API_KEY=AIza...
```

## Preset Reference

### Social

| Preset | Dimensions | Ratio |
|--------|-----------|-------|
| OG / Facebook | 1200 × 630 | 1.91:1 |
| Twitter / X | 1200 × 675 | 16:9 |
| LinkedIn | 1200 × 627 | 1.91:1 |
| Instagram Square | 1080 × 1080 | 1:1 |
| Instagram Portrait | 1080 × 1350 | 4:5 |
| Instagram Story | 1080 × 1920 | 9:16 |
| Pinterest | 1000 × 1500 | 2:3 |

### Mobile

| Preset | Dimensions | Device scale |
|--------|-----------|-------------|
| iPhone 14/15 | 390 × 844 | 3× |
| Android (Pixel 7) | 412 × 915 | 3× |
| Tablet Portrait | 768 × 1024 | 2× |

### High Resolution (landscape + portrait)

| Preset | Output pixels | Viewport | Scale |
|--------|-------------|---------|-------|
| 2K QHD | 2560 × 1440 | 1280 × 720 | 2× |
| 4K UHD | 3840 × 2160 | 1920 × 1080 | 2× |
| 8K UHD | 7680 × 4320 | 1920 × 1080 | 4× |
| 16K | 15360 × 8640 | 1920 × 1080 | 8× |
| 2K Portrait | 1440 × 2560 | 720 × 1280 | 2× |
| 4K Portrait | 2160 × 3840 | 1080 × 1920 | 2× |
| 8K Portrait | 4320 × 7680 | 1080 × 1920 | 4× |
| 16K Portrait | 8640 × 15360 | 1080 × 1920 | 8× |

High-res presets use `deviceScaleFactor` instead of a giant viewport, so page content renders at a normal scale and Playwright outputs the full pixel count.

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
