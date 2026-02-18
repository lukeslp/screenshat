# Repository Guidelines

## Project Structure & Module Organization
- `client/`: React + Vite frontend (pages, components, hooks, styles).
- `server/`: Express + tRPC backend, screenshot/download routes, storage, and tests.
- `shared/`: shared constants, types, and preset definitions used by client and server.
- `drizzle/`: Drizzle schema, SQL migrations, and migration metadata.
- `data/screenshots/`: local screenshot output served by the backend.
- `dist/`: production build output (generated; do not edit directly).
- `src/` also exists for older/alternate modules; current runtime entrypoints are `client/src/main.tsx` and `server/_core/index.ts`.

## Build, Test, and Development Commands
- `pnpm dev`: starts the backend with `tsx watch`; Vite middleware serves the frontend in development.
- `pnpm build`: builds frontend assets and bundles the server into `dist/`.
- `pnpm start`: runs the production server from `dist/index.js`.
- `pnpm check`: TypeScript type-check (`tsc --noEmit`).
- `pnpm test`: runs Vitest tests (`server/**/*.test.ts` and `server/**/*.spec.ts`).
- `pnpm format`: formats the repo with Prettier.
- `pnpm db:push`: generates and applies Drizzle migrations (requires `DATABASE_URL`).

## Coding Style & Naming Conventions
- Language: TypeScript (ESM, strict mode enabled).
- Formatting (Prettier): 2 spaces, semicolons, double quotes, max width 80.
- Naming: React components use `PascalCase` (e.g., `CaptureResults.tsx`), hooks use `useXxx`, utility modules use `camelCase` filenames.
- Tests: name files `*.test.ts` or `*.spec.ts` under `server/`.
- Use aliases consistently: `@/` for `client/src`, `@shared/` for shared modules.

## Testing Guidelines
- Framework: Vitest with `node` environment.
- Add or update tests for route behavior, preset logic, and bug fixes.
- Run `pnpm test` and `pnpm check` before opening a PR.
- There is no enforced coverage gate yet; prioritize meaningful assertions over snapshot-heavy tests.

## Commit & Pull Request Guidelines
- Existing history uses frequent checkpoints (for example, `session checkpoint: 2026-02-18 01:24`) plus descriptive `Checkpoint: ...` commits.
- Preferred commit style: concise, imperative summary of behavioral change.
- PRs should include:
  - what changed and why,
  - validation steps run (`pnpm test`, `pnpm check`, etc.),
  - screenshots/GIFs for UI changes,
  - migration notes when `drizzle/` or DB schema changes.

## Security & Configuration Tips
- Keep secrets in `.env`; never commit credentials or tokens.
- Key env vars: `DATABASE_URL`, `PORT`, `API_GATEWAY_URL`, `API_GATEWAY_KEY`.
- `drizzle.config.ts` requires `DATABASE_URL`; set it before running DB commands.
