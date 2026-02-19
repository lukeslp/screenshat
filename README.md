[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Live](https://img.shields.io/badge/live-dr.eamer.dev%2Fscreenshat-brightgreen)](https://dr.eamer.dev/screenshat/)

# screenshat

Paste a URL, get screenshots at every social media dimension in seconds. One capture job covers OG cards, Twitter/X, LinkedIn, Instagram (square, portrait, story), Pinterest, mobile viewports, and high-res up to 16K — all via headless Chromium.

<!-- screenshot -->

## Features

- **Capture any URL across 19 presets** — 7 social formats, 3 mobile viewports (iPhone, Android, tablet), and 8 high-res sizes (2K–16K, landscape and portrait)
- **Vision analysis** — quality score out of 10, focal point coordinates, per-format crop suggestions, and improvement tips, returned as structured JSON
- **Alt text generation** — writes a concise description under 125 chars; edit it inline, then download with the text embedded in PNG metadata (`tEXt` chunk)
- **ZIP download** — stream all screenshots for a job as a single archive
- **Capture history** — paginated list of past jobs with thumbnails
- **Advanced capture controls** — choose wait strategy (network idle, DOM ready, page load, or first response), target a CSS selector before screenshotting, add an extra delay for animations or lazy-loaded content
- **SSRF protection** — URL safety validation resolves hostnames and blocks private/loopback IP ranges before Playwright touches them
- **Rate limiting** — per-IP sliding-window limits on captures and analysis calls
- **Multi-provider LLM** — switch between a local api-gateway, OpenAI, Anthropic, or Google with one env var

## Quick Start

```bash
git clone https://github.com/lukeslp/screenshat
cd screenshat
pnpm install
```

Copy the example env file and fill in the required values:

```bash
cp .env.example .env
```

Minimum required variables:

```env
DATABASE_URL=mysql://screenshat:password@localhost:3306/screenshat
INTERNAL_CAPTURE_KEY=any-random-hex-string
PORT=5091
```

Push the database schema (auto-creates tables):

```bash
pnpm db:push
```

Start the dev server:

```bash
pnpm dev
```

The app runs at `http://localhost:5091` by default.

You need Chromium or Chrome installed. Playwright will use whatever it finds at common system paths (`/usr/bin/chromium-browser`, `/usr/bin/google-chrome`, etc.). If nothing is found automatically:

```bash
npx playwright install chromium
```

## LLM Setup

Vision analysis is optional — captures work without it. When you run analysis, the server sends the screenshot to whichever provider `LLM_PROVIDER` points at.

### Option 1 — Local api-gateway (default)

Leave `LLM_PROVIDER` unset or set it to `gateway`. Set `API_GATEWAY_URL` and `API_GATEWAY_KEY` to point at a running api-gateway instance. The gateway call goes to Anthropic claude-sonnet by default.

```env
LLM_PROVIDER=gateway
API_GATEWAY_URL=http://localhost:5200
API_GATEWAY_KEY=your-gateway-key
```

### Option 2 — Direct provider

Set `LLM_PROVIDER` to `openai`, `anthropic`, or `google`, then supply a key. Override the model with `LLM_MODEL`.

```env
# OpenAI
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-5.2          # optional — this is the default

# Anthropic
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
# defaults to claude-sonnet-4-6

# Google
LLM_PROVIDER=google
LLM_API_KEY=AIza...
# defaults to gemini-3-flash-preview
```

## Self-Hosting / Deployment

The production instance runs on port `5091` behind Caddy with prefix stripping:

```caddyfile
handle_path /screenshat/* {
    reverse_proxy localhost:5091
}
```

Build and start:

```bash
pnpm build    # Vite (client) + esbuild (server → dist/)
pnpm start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | MySQL connection string |
| `INTERNAL_CAPTURE_KEY` | yes | Secret for internal API routes |
| `PORT` | no | Server port — defaults to 3000, auto-increments if busy |
| `LLM_PROVIDER` | no | `gateway` (default), `openai`, `anthropic`, or `google` |
| `LLM_API_KEY` | if direct provider | API key for the chosen provider |
| `LLM_MODEL` | no | Override the default model for the chosen provider |
| `API_GATEWAY_URL` | if gateway | Base URL of the local api-gateway |
| `API_GATEWAY_KEY` | if gateway | Auth key for the api-gateway |
| `JWT_SECRET` | no | Cookie signing secret |
| `OAUTH_SERVER_URL` | no | OAuth provider base URL |
| `OWNER_OPEN_ID` | no | OpenID identifier for the admin user |

### Vite base path

The client is built with `base: '/screenshat/'`. If you serve it at a different path prefix, update `vite.config.ts` before building.

### Database

MySQL only. Run `pnpm db:push` after any schema change — Drizzle generates and applies migrations automatically. Three tables: `users`, `captureJobs`, `screenshots`.

### Storage

Screenshots are stored on local disk at `data/screenshots/` and served directly by Express. No object storage required.

## Development

```bash
pnpm dev        # tsx watch (server) + Vite dev server (client)
pnpm check      # TypeScript type check
pnpm test       # Vitest (all *.test.ts files in server/)
pnpm format     # Prettier
```

Run a single test file:

```bash
pnpm vitest run server/capture.test.ts
```

## License

MIT

---

Built by [Luke Steuber](https://lukesteuber.com) — [@lukesteuber.com](https://bsky.app/profile/lukesteuber.com) on Bluesky
