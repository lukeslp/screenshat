# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

- **URL**: https://dr.eamer.dev/screenshat/
- **Port**: 5091
- **Service**: `sm start screenshat` / `sm restart screenshat` / `sm logs screenshat`
- **Caddy**: `handle_path /screenshat/*` → strips prefix, forwards to port 5091
- **DB**: MySQL `screenshat` database (drizzle ORM, auto-creates tables on `pnpm db:push`)
- **Storage**: Local disk at `data/screenshots/` (served as `/data/screenshots/*` by Express)
- **LLM**: Uses local api-gateway at `http://localhost:5200` with `API_GATEWAY_KEY`
- **Vite base**: `/screenshat/` — assets load correctly through Caddy prefix stripping

## Commands

```bash
# Development
pnpm dev             # Start server + Vite dev server (tsx watch)
pnpm build           # Vite build (client) + esbuild (server → dist/)
pnpm start           # Run production build
pnpm check           # TypeScript type check (tsc --noEmit)
pnpm test            # Run tests (vitest run)
pnpm format          # Prettier

# Single test file
pnpm vitest run server/capture.test.ts

# Database
pnpm db:push         # drizzle-kit generate + migrate
```

## Architecture

Full-stack TypeScript monorepo. Express backend + React 19 frontend. tRPC for end-to-end type-safe API. Drizzle ORM with MySQL.

### Directory Layout

| Path | Purpose |
|------|---------|
| `server/` | Express backend + tRPC routers |
| `server/_core/` | Framework boilerplate (trpc, env, context, llm, oauth, vite) |
| `client/src/` | React 19 + Vite frontend |
| `client/src/pages/` | Route-level components (Home, History, CaptureResults) |
| `shared/` | Code shared between server and client (presets, types, const) |
| `drizzle/` | Schema, migrations, relations |

### Path Aliases

- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Data Flow

1. User submits URL + preset selection on `Home` page
2. `capture.start` tRPC mutation fires
3. Server launches Playwright (headless Chromium), captures screenshots per preset
4. Each PNG is uploaded to storage via `storagePut()` in `server/storage.ts`
5. DB records saved to `captureJobs` + `screenshots` tables
6. Client receives job result with screenshot URLs → `CaptureResults` page

### Key Modules

**`server/screenshotService.ts`** — Playwright browser lifecycle. Singleton browser instance, auto-detects system Chromium/Chrome. Each capture uses a fresh browser context per preset, sorted small→large.

**`server/routers.ts`** — All tRPC procedures: `capture.start`, `capture.history`, `capture.getJob`, `capture.analyze`, `capture.deleteJob`, `auth.me`, `auth.logout`.

**`server/storage.ts`** — Storage proxy abstraction over the Forge API (`BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`). `storagePut()` uploads PNGs, `storageGet()` returns presigned download URLs.

**`server/downloadRoute.ts`** — `GET /api/download/:screenshotId` — server-side proxy download to avoid CORS with S3. Sets `Content-Disposition: attachment`.

**`server/zipRoute.ts`** — `GET /api/zip/:jobId` — streams a ZIP of all screenshots for a job using `archiver`.

**`server/_core/llm.ts`** — OpenAI-compatible LLM client. Uses `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`. Currently calls `gemini-2.5-flash` for vision analysis.

**`shared/presets.ts`** — 11 screenshot dimension presets: 7 social (OG/Facebook 1200×630, Twitter 1200×675, LinkedIn 1200×627, Instagram square/portrait/story, Pinterest) + 4 high-res (2K/4K/8K/16K).

### Database Schema

Three tables: `users`, `captureJobs` (status: pending/processing/completed/failed, presets stored as JSON), `screenshots` (fileUrl, fileKey, analysisResult JSON). All via Drizzle ORM with MySQL2.

### Environment Variables

```
DATABASE_URL          # MySQL connection string
JWT_SECRET            # Cookie signing
BUILT_IN_FORGE_API_URL  # Storage + LLM proxy base URL
BUILT_IN_FORGE_API_KEY  # Auth token for storage + LLM
OAUTH_SERVER_URL      # OAuth provider
OWNER_OPEN_ID         # Admin user identifier
PORT                  # Server port (default: 3000, auto-increments if busy)
```

### Tests

Tests live in `server/` alongside the modules they test (`*.test.ts`). Vitest with node environment. Run all: `pnpm test`. Run single: `pnpm vitest run server/<file>.test.ts`.
