# screenshat

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Live](https://img.shields.io/badge/live-screenshat.pics-4ade80?style=flat-square)](https://screenshat.pics/)

Capture any site. Screenshots and social cards up to 16K, with alt text baked into the PNG. Pick your presets, grab the files, done.

**[→ Try it live at screenshat.pics](https://screenshat.pics/)** · also at [dr.eamer.dev/screenshat](https://dr.eamer.dev/screenshat/)

![screenshat capture page](https://raw.githubusercontent.com/lukeslp/screenshat/main/docs/screenshots/home.png)

<details>
<summary>Sample output + more screenshots</summary>

**OG/Facebook card** captured from lukesteuber.com:

![Sample OG card output](https://raw.githubusercontent.com/lukeslp/screenshat/main/docs/screenshots/sample-og.png)

**2K portrait** captured from dr.eamer.dev/datavis/interactive/consensus:

![Sample 2K portrait output](https://raw.githubusercontent.com/lukeslp/screenshat/main/docs/screenshots/sample-2k-portrait.png)

**Results page** with alt text and analysis:

![Results page](https://raw.githubusercontent.com/lukeslp/screenshat/main/docs/screenshots/results.png)

**Capture history:**

![Capture history](https://raw.githubusercontent.com/lukeslp/screenshat/main/docs/screenshots/history.png)

</details>

## Features

- **18 presets in one shot** -- social cards (OG, Twitter/X, LinkedIn, Instagram, Pinterest), mobile viewports (iPhone, Pixel, iPad), and high-res from 2K through 16K
- **Wait strategies** -- network idle, load, DOMContentLoaded, or custom delay for late-rendering content
- **Element targeting** -- pass a CSS selector to clip the output to one DOM node
- **Vision analysis** -- quality score, focal point, crop suggestions per format, improvement notes
- **Alt text** -- generated per screenshot, editable inline, embedded as a PNG `tEXt` chunk on download so it travels with the file
- **ZIP export** -- all screenshots from a job in one archive, with an `alt-text.txt` manifest
- **History** -- browse, re-download, or delete past captures
- **Rate limiting** -- per-IP on capture and analysis endpoints
- **SSRF protection** -- private IPs and localhost blocked before the browser touches the request
- **Multi-provider LLM** -- swap between a local gateway, OpenAI, Anthropic, or Google with one env var

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

Vision analysis and alt text are optional -- captures work fine without them. When you run analysis, the server sends the screenshot to whichever provider `LLM_PROVIDER` points at.

### Option 1: Local api-gateway (default)

Leave `LLM_PROVIDER` unset or set it to `gateway`. Set `API_GATEWAY_URL` and `API_GATEWAY_KEY` to point at a running api-gateway instance.

```env
LLM_PROVIDER=gateway
API_GATEWAY_URL=http://localhost:5200
API_GATEWAY_KEY=your-gateway-key
```

### Option 2: Direct provider

Set `LLM_PROVIDER` to `openai`, `anthropic`, or `google`, then supply a key. The model defaults are `gpt-5.2`, `claude-sonnet-4-6`, and `gemini-3-flash-preview`. Override with `LLM_MODEL`.

```env
# OpenAI
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-5.2          # optional, this is the default

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

High-res presets use `deviceScaleFactor` rather than oversized viewports, so content renders at normal scale while Playwright outputs the full pixel count.

## Architecture

TypeScript monorepo. Express serves the API and the Vite-built React client. tRPC handles type safety between the two without a generated schema.

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

## API

### Internal Capture API

`POST /api/capture` — stateless endpoint for programmatic use. Authenticate with `X-Internal-Key` header.

```bash
curl -X POST https://screenshat.pics/api/capture \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: $INTERNAL_CAPTURE_KEY" \
  -d '{"url": "https://example.com", "presets": ["og-facebook", "twitter-x"]}'
```

Returns base64-encoded PNGs inline. The public endpoint `POST /v1/screenshot/capture` on the [api-gateway](https://dr.eamer.dev) proxies to this.

### tRPC Procedures

The React client talks to the server through these tRPC procedures at `/api/trpc`:

| Procedure | Type | Purpose |
|-----------|------|---------|
| `capture.start` | mutation | Start a screenshot job |
| `capture.analyze` | mutation | Run vision analysis on a screenshot |
| `capture.generateAltText` | mutation | Generate alt text for a screenshot |
| `capture.updateAltText` | mutation | Edit stored alt text |
| `capture.history` | query | List past capture jobs |
| `capture.deleteJob` | mutation | Delete a job and its files |

## Roadmap

- [ ] **GIF capture** - record a short animated GIF of the page (scroll, hover states, transitions)
- [ ] **Video capture** - export a short MP4 of the page rendering or scrolling
- [ ] Scheduled captures / change detection
- [ ] Bulk URL mode

## License

MIT. See [LICENSE](LICENSE).

---

Built by [Luke Steuber](https://lukesteuber.com) - [@lukesteuber.com](https://bsky.app/profile/lukesteuber.com) on Bluesky.
