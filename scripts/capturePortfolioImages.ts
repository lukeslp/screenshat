#!/usr/bin/env tsx
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { captureScreenshots, closeBrowser } from "../server/screenshotService";
import { PRESETS, type WaitStrategy } from "../shared/presets";

type TargetKind = "datavis" | "frontend";
type CaptureStatus = "ok" | "partial" | "failed";

interface CaptureTarget {
  kind: TargetKind;
  slug: string;
  url: string;
  sourcePath: string;
  outputDir: string;
  presetKeys: string[];
}

interface CaptureRecord {
  kind: TargetKind;
  slug: string;
  url: string;
  sourcePath: string;
  outputDir: string;
  status: CaptureStatus;
  requestedPresets: string[];
  capturedPresets: string[];
  missingPresets: string[];
  elapsedMs: number;
  error?: string;
}

interface StoredManifest {
  generatedAt: string;
  outputDir: string;
  options: {
    datavisRoot: string;
    siteRoot: string;
    datavisBaseUrl: string;
    siteBaseUrl: string;
    sections: string[];
    includeDatavis: boolean;
    includeOtherFrontends: boolean;
    outputBaseUrl: string;
    indexPath: string | null;
    writeIndex: boolean;
    waitStrategy: WaitStrategy;
    extraWaitMs: number;
    customSelector: string | null;
    limit: number | null;
    offset: number;
    concurrency: number;
    presets: string[];
  };
  summary: {
    targetsDiscovered: number;
    targetsCaptured: number;
    ok: number;
    partial: number;
    failed: number;
  };
  records: CaptureRecord[];
}

interface CliOptions {
  datavisRoot: string;
  siteRoot: string;
  datavisBaseUrl: string;
  siteBaseUrl: string;
  outputDir: string;
  outputBaseUrl: string;
  indexPath?: string;
  sections: string[];
  includeDatavis: boolean;
  includeOtherFrontends: boolean;
  writeIndex: boolean;
  waitStrategy: WaitStrategy;
  extraWaitMs: number;
  customSelector?: string;
  dryRun: boolean;
  limit?: number;
  offset: number;
  concurrency: number;
  presets: string[];
  showHelp: boolean;
}

const VALID_WAIT_STRATEGIES = new Set<WaitStrategy>([
  "networkidle",
  "domcontentloaded",
  "load",
  "commit",
]);

const DATAVIS_SKIP_DIRS = new Set([
  ".git",
  ".claude",
  ".playwright-mcp",
  ".pytest_cache",
  ".logs",
  "__pycache__",
  "node_modules",
  "dist",
]);

const FRONTEND_SKIP_DIRS = new Set([
  "datavis",
  ".git",
  ".claude",
  ".playwright-mcp",
  "node_modules",
]);

const DEFAULT_CAPTURE_PRESET_KEY = "8k";
const DEFAULT_CAPTURE_PRESET_KEYS = [DEFAULT_CAPTURE_PRESET_KEY];

function expandHome(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function htmlPathToRoute(relativeHtmlPath: string): string {
  if (relativeHtmlPath.endsWith("/index.html")) {
    return relativeHtmlPath.slice(0, -("index.html".length));
  }
  return relativeHtmlPath;
}

function htmlPathToStem(relativeHtmlPath: string): string {
  if (relativeHtmlPath.endsWith("/index.html")) {
    return relativeHtmlPath
      .slice(0, -("/index.html".length))
      .replace(/\/+$/, "");
  }
  return relativeHtmlPath;
}

function formatDuration(ms: number): string {
  if (ms < 1_000) {
    return `${ms}ms`;
  }
  return `${(ms / 1_000).toFixed(1)}s`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dedupeTargets(targets: CaptureTarget[]): CaptureTarget[] {
  const seen = new Set<string>();
  const unique: CaptureTarget[] = [];

  for (const target of targets) {
    const key = `${target.kind}|${target.url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(target);
  }

  return unique.sort((a, b) => a.url.localeCompare(b.url));
}

async function walkHtmlFiles(
  rootDir: string,
  skipDirs: Set<string>
): Promise<string[]> {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) {
          continue;
        }
        if (skipDirs.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

async function discoverDatavisTargets(
  options: CliOptions
): Promise<CaptureTarget[]> {
  const targets: CaptureTarget[] = [];

  for (const section of options.sections) {
    const sectionRoot = path.join(options.datavisRoot, section);
    if (!existsSync(sectionRoot)) {
      console.warn(`[warn] Missing datavis section: ${sectionRoot}`);
      continue;
    }

    const htmlFiles = await walkHtmlFiles(sectionRoot, DATAVIS_SKIP_DIRS);
    const sectionPrefix = `${section}/`;

    for (const filePath of htmlFiles) {
      const relativeHtml = toPosixPath(
        path.relative(options.datavisRoot, filePath)
      );
      const urlRoute = htmlPathToRoute(relativeHtml);
      const stem = htmlPathToStem(relativeHtml);
      const sectionStem = stem.startsWith(sectionPrefix)
        ? stem.slice(sectionPrefix.length)
        : stem === section
          ? ""
          : stem;

      const normalizedSectionStem = sectionStem || "__index";
      const outputDir = path.join(
        options.outputDir,
        "datavis",
        section,
        ...normalizedSectionStem.split("/")
      );
      const url = new URL(
        urlRoute,
        ensureTrailingSlash(options.datavisBaseUrl)
      ).toString();

      targets.push({
        kind: "datavis",
        slug: `${section}/${normalizedSectionStem}`,
        url,
        sourcePath: filePath,
        outputDir,
        presetKeys: options.presets,
      });
    }
  }

  return dedupeTargets(targets);
}

async function discoverFrontendTargets(
  options: CliOptions
): Promise<CaptureTarget[]> {
  const targets: CaptureTarget[] = [];

  const rootIndex = path.join(options.siteRoot, "index.html");
  if (await pathExists(rootIndex)) {
    targets.push({
      kind: "frontend",
      slug: "root",
      url: ensureTrailingSlash(options.siteBaseUrl),
      sourcePath: rootIndex,
      outputDir: path.join(options.outputDir, "frontends", "root"),
      presetKeys: options.presets,
    });
  }

  const entries = await fs.readdir(options.siteRoot, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }
    if (FRONTEND_SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const indexPath = path.join(options.siteRoot, entry.name, "index.html");
    if (!(await pathExists(indexPath))) {
      continue;
    }

    const url = new URL(
      `${entry.name}/`,
      ensureTrailingSlash(options.siteBaseUrl)
    ).toString();

    targets.push({
      kind: "frontend",
      slug: entry.name,
      url,
      sourcePath: indexPath,
      outputDir: path.join(options.outputDir, "frontends", entry.name),
      presetKeys: options.presets,
    });
  }

  return dedupeTargets(targets);
}

async function captureTarget(
  target: CaptureTarget,
  options: CliOptions,
  index: number,
  total: number
): Promise<CaptureRecord> {
  const startedAt = Date.now();

  console.log(
    `[${index}/${total}] ${target.kind} ${target.slug} -> ${target.url}`
  );

  try {
    const results = await captureScreenshots({
      url: target.url,
      presetKeys: target.presetKeys,
      waitStrategy: options.waitStrategy,
      customSelector: options.customSelector,
      extraWaitMs: options.extraWaitMs,
    });

    await fs.mkdir(target.outputDir, { recursive: true });
    for (const result of results) {
      const imagePath = path.join(target.outputDir, `${result.presetKey}.png`);
      await fs.writeFile(imagePath, result.buffer);
    }

    const capturedPresets = [...new Set(results.map(result => result.presetKey))]
      .sort();
    const capturedSet = new Set(capturedPresets);
    const missingPresets = target.presetKeys.filter(
      presetKey => !capturedSet.has(presetKey)
    );

    if (target.kind === "frontend") {
      const aliasSourcePreset = ["og-facebook", "8k", "twitter"].find(
        presetKey => capturedSet.has(presetKey)
      );

      if (aliasSourcePreset) {
        const sourcePath = path.join(target.outputDir, `${aliasSourcePreset}.png`);
        if (existsSync(sourcePath)) {
          await fs.copyFile(sourcePath, path.join(target.outputDir, "github-social.png"));
          await fs.copyFile(sourcePath, path.join(target.outputDir, "social-share.png"));
        }
      }
    }

    const status: CaptureStatus =
      capturedPresets.length === 0
        ? "failed"
        : missingPresets.length > 0
          ? "partial"
          : "ok";

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `  ${capturedPresets.length}/${target.presetKeys.length} presets (${status}) in ${formatDuration(elapsedMs)}`
    );

    return {
      kind: target.kind,
      slug: target.slug,
      url: target.url,
      sourcePath: target.sourcePath,
      outputDir: target.outputDir,
      status,
      requestedPresets: [...target.presetKeys],
      capturedPresets,
      missingPresets,
      elapsedMs,
    };
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  failed in ${formatDuration(elapsedMs)}: ${message}`);

    return {
      kind: target.kind,
      slug: target.slug,
      url: target.url,
      sourcePath: target.sourcePath,
      outputDir: target.outputDir,
      status: "failed",
      requestedPresets: [...target.presetKeys],
      capturedPresets: [],
      missingPresets: [...target.presetKeys],
      elapsedMs,
      error: message,
    };
  }
}

function printHelp(): void {
  console.log(`
Batch capture script for datavis + frontend social/GitHub images.

Usage:
  pnpm capture:portfolio -- [options]

Options:
  --datavis-root <path>      Datavis root (default: ~/html/datavis)
  --site-root <path>         Frontend root (default: ~/html)
  --datavis-base-url <url>   Base URL for datavis routes
                             (default: https://dr.eamer.dev/datavis)
  --site-base-url <url>      Base URL for frontend routes
                             (default: https://dr.eamer.dev)
  --output-dir <path>        Output root
                             (default: ~/html/datavis/screenshots/generated)
                             (captures are 8k by default)
  --output-base-url <url>    Public base URL for generated images
                             (default: https://dr.eamer.dev/datavis/screenshots/generated)
  --index-path <path>        HTML index output path
                             (default: ~/html/datavis/gallery/vizs/captures/index.html)
  --no-index                 Skip index generation
  --sections <list>          Comma list of datavis sections
                             (default: interactive,poems,gallery,dev)
  --wait-strategy <value>    networkidle | domcontentloaded | load | commit
  --extra-wait-ms <number>   Extra render wait (default: 8000)
  --selector <css>           Optional CSS selector to wait for
  --limit <number>           Limit number of targets (for test runs)
  --offset <number>          Skip first N discovered targets (for batch runs)
  --concurrency <number>     Number of targets to process in parallel (default: 2)
  --presets <comma-list>     Preset keys to capture (default: 8k)
                             e.g. --presets 8k,8k-portrait
  --dry-run                  Discover only; do not capture
  --no-datavis               Skip datavis captures
  --no-frontends             Skip other frontend captures
  --help                     Show this message
`.trim());
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    datavisRoot: "~/html/datavis",
    siteRoot: "~/html",
    datavisBaseUrl: "https://dr.eamer.dev/datavis",
    siteBaseUrl: "https://dr.eamer.dev",
    outputDir: "~/html/datavis/screenshots/generated",
    outputBaseUrl: "https://dr.eamer.dev/datavis/screenshots/generated",
    indexPath: "~/html/datavis/gallery/vizs/captures/index.html",
    sections: ["interactive", "poems", "gallery", "dev"],
    includeDatavis: true,
    includeOtherFrontends: true,
    writeIndex: true,
    waitStrategy: "networkidle",
    extraWaitMs: 8_000,
    customSelector: undefined,
    dryRun: false,
    limit: undefined,
    offset: 0,
    concurrency: 2,
    presets: ["8k"],
    showHelp: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    const requireNext = (flag: string): string => {
      if (!next || next.startsWith("--")) {
        throw new Error(`${flag} requires a value`);
      }
      i += 1;
      return next;
    };

    if (token === "--") {
      continue;
    } else if (token === "--help" || token === "-h") {
      options.showHelp = true;
    } else if (token === "--dry-run") {
      options.dryRun = true;
    } else if (token === "--no-index") {
      options.writeIndex = false;
    } else if (token === "--no-datavis") {
      options.includeDatavis = false;
    } else if (token === "--no-frontends") {
      options.includeOtherFrontends = false;
    } else if (token === "--datavis-root") {
      options.datavisRoot = requireNext(token);
    } else if (token === "--site-root") {
      options.siteRoot = requireNext(token);
    } else if (token === "--datavis-base-url") {
      options.datavisBaseUrl = requireNext(token);
    } else if (token === "--site-base-url") {
      options.siteBaseUrl = requireNext(token);
    } else if (token === "--output-dir") {
      options.outputDir = requireNext(token);
    } else if (token === "--output-base-url") {
      options.outputBaseUrl = requireNext(token);
    } else if (token === "--index-path") {
      options.indexPath = requireNext(token);
    } else if (token === "--sections") {
      const raw = requireNext(token);
      options.sections = raw
        .split(",")
        .map(section => section.trim())
        .filter(Boolean);
    } else if (token === "--wait-strategy") {
      const strategy = requireNext(token) as WaitStrategy;
      if (!VALID_WAIT_STRATEGIES.has(strategy)) {
        throw new Error(`Invalid wait strategy: ${strategy}`);
      }
      options.waitStrategy = strategy;
    } else if (token === "--extra-wait-ms") {
      const value = Number.parseInt(requireNext(token), 10);
      if (Number.isNaN(value) || value < 0) {
        throw new Error("--extra-wait-ms must be a non-negative integer");
      }
      options.extraWaitMs = value;
    } else if (token === "--selector") {
      options.customSelector = requireNext(token);
    } else if (token === "--limit") {
      const value = Number.parseInt(requireNext(token), 10);
      if (Number.isNaN(value) || value < 1) {
        throw new Error("--limit must be an integer greater than 0");
      }
      options.limit = value;
    } else if (token === "--offset") {
      const value = Number.parseInt(requireNext(token), 10);
      if (Number.isNaN(value) || value < 0) {
        throw new Error("--offset must be a non-negative integer");
      }
      options.offset = value;
    } else if (token === "--concurrency") {
      const value = Number.parseInt(requireNext(token), 10);
      if (Number.isNaN(value) || value < 1) {
        throw new Error("--concurrency must be an integer greater than 0");
      }
      options.concurrency = value;
    } else if (token === "--presets") {
      const raw = requireNext(token);
      const keys = raw.split(",").map(k => k.trim()).filter(Boolean);
      for (const key of keys) {
        if (!PRESETS.some(p => p.key === key)) {
          throw new Error(`Unknown preset: ${key}. Valid: ${PRESETS.map(p => p.key).join(", ")}`);
        }
      }
      options.presets = keys;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  options.datavisRoot = path.resolve(expandHome(options.datavisRoot));
  options.siteRoot = path.resolve(expandHome(options.siteRoot));
  options.outputDir = path.resolve(expandHome(options.outputDir));
  if (options.indexPath) {
    options.indexPath = path.resolve(expandHome(options.indexPath));
  }

  return options;
}

function mergeRecords(
  existingRecords: CaptureRecord[],
  newRecords: CaptureRecord[]
): CaptureRecord[] {
  const merged = new Map<string, CaptureRecord>();

  for (const record of existingRecords) {
    const key = `${record.kind}|${record.url}`;
    merged.set(key, record);
  }

  for (const record of newRecords) {
    const key = `${record.kind}|${record.url}`;
    merged.set(key, record);
  }

  return [...merged.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function readExistingManifest(
  manifestPath: string
): Promise<StoredManifest | null> {
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as StoredManifest;
    if (!Array.isArray(parsed.records)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeManifest(
  outputDir: string,
  options: CliOptions,
  targets: CaptureTarget[],
  records: CaptureRecord[]
): Promise<{ manifestPath: string; allRecords: CaptureRecord[] }> {
  await fs.mkdir(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, "manifest.json");
  const existing = await readExistingManifest(manifestPath);
  const allRecords = mergeRecords(existing?.records ?? [], records);

  const ok = allRecords.filter(record => record.status === "ok").length;
  const partial = allRecords.filter(record => record.status === "partial").length;
  const failed = allRecords.filter(record => record.status === "failed").length;

  const manifest: StoredManifest = {
    generatedAt: new Date().toISOString(),
    outputDir,
    options: {
      datavisRoot: options.datavisRoot,
      siteRoot: options.siteRoot,
      datavisBaseUrl: options.datavisBaseUrl,
      siteBaseUrl: options.siteBaseUrl,
      sections: options.sections,
      includeDatavis: options.includeDatavis,
      includeOtherFrontends: options.includeOtherFrontends,
      outputBaseUrl: options.outputBaseUrl,
      indexPath: options.indexPath ?? null,
      writeIndex: options.writeIndex,
      waitStrategy: options.waitStrategy,
      extraWaitMs: options.extraWaitMs,
      customSelector: options.customSelector ?? null,
      limit: options.limit ?? null,
      offset: options.offset,
      concurrency: options.concurrency,
      presets: options.presets,
    },
    summary: {
      targetsDiscovered: (existing?.summary.targetsDiscovered ?? 0) + targets.length,
      targetsCaptured: allRecords.length,
      ok,
      partial,
      failed,
    },
    records: allRecords,
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifestPath, allRecords };
}

function pickPreviewPreset(record: CaptureRecord): string | null {
  const preferred = record.kind === "frontend"
    ? ["github-social", "social-share", "og-facebook", "twitter"]
    : ["og-facebook", "twitter", "linkedin", "2k"];

  for (const candidate of preferred) {
    if (record.capturedPresets.includes(candidate)) {
      return candidate;
    }
  }

  return record.capturedPresets[0] ?? null;
}

function buildPublicImageUrl(
  outputBaseUrl: string,
  outputDir: string,
  recordOutputDir: string,
  filename: string
): string {
  const relativeDir = toPosixPath(path.relative(outputDir, recordOutputDir));
  const relativePath = relativeDir && relativeDir !== "."
    ? `${relativeDir}/${filename}`
    : filename;
  return new URL(relativePath, ensureTrailingSlash(outputBaseUrl)).toString();
}

async function writeIndexPage(
  options: CliOptions,
  records: CaptureRecord[]
): Promise<string | null> {
  if (!options.writeIndex || !options.indexPath) {
    return null;
  }

  const rows = records
    .map(record => {
      const previewPreset = pickPreviewPreset(record);
      const previewFilename = previewPreset ? `${previewPreset}.png` : null;
      const previewSrc = previewFilename
        ? buildPublicImageUrl(
            options.outputBaseUrl,
            options.outputDir,
            record.outputDir,
            previewFilename
          )
        : "";
      const pageHref = record.url;
      const folderRel = toPosixPath(path.relative(options.outputDir, record.outputDir));

      return `
      <tr>
        <td>${escapeHtml(record.kind)}</td>
        <td>${escapeHtml(record.slug)}</td>
        <td><span class="pill ${escapeHtml(record.status)}">${escapeHtml(record.status)}</span></td>
        <td>${record.capturedPresets.length}/${record.requestedPresets.length}</td>
        <td><a href="${escapeHtml(pageHref)}" target="_blank" rel="noreferrer">open</a></td>
        <td><code>${escapeHtml(folderRel)}</code></td>
        <td>${
          previewSrc
            ? `<a href="${escapeHtml(previewSrc)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(previewSrc)}" alt="${escapeHtml(record.slug)} preview" /></a>`
            : "<span class=\"muted\">none</span>"
        }</td>
      </tr>
    `.trim();
    })
    .join("\n");

  const ok = records.filter(record => record.status === "ok").length;
  const partial = records.filter(record => record.status === "partial").length;
  const failed = records.filter(record => record.status === "failed").length;
  const generatedAt = new Date().toISOString();

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Portfolio Capture Index</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f7f8fa; color: #111827; }
    .wrap { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .meta { margin: 0 0 16px; color: #4b5563; font-size: 14px; }
    .stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; font-size: 14px; }
    .table-wrap { overflow: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; min-width: 980px; }
    th, td { border-bottom: 1px solid #f1f5f9; padding: 10px; text-align: left; font-size: 13px; vertical-align: middle; }
    th { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
    tr:hover td { background: #f8fafc; }
    img { width: 200px; height: auto; border-radius: 6px; border: 1px solid #e5e7eb; display: block; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .pill { border-radius: 999px; padding: 2px 8px; font-size: 12px; text-transform: uppercase; }
    .pill.ok { background: #dcfce7; color: #166534; }
    .pill.partial { background: #fef3c7; color: #92400e; }
    .pill.failed { background: #fee2e2; color: #991b1b; }
    .muted { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Portfolio Capture Index</h1>
    <p class="meta">Generated ${escapeHtml(generatedAt)}</p>
    <div class="stats">
      <div class="card">Targets: <strong>${records.length}</strong></div>
      <div class="card">OK: <strong>${ok}</strong></div>
      <div class="card">Partial: <strong>${partial}</strong></div>
      <div class="card">Failed: <strong>${failed}</strong></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Kind</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Presets</th>
            <th>Page</th>
            <th>Output Folder</th>
            <th>Preview</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  await fs.mkdir(path.dirname(options.indexPath), { recursive: true });
  await fs.writeFile(options.indexPath, html);
  return options.indexPath;
}

async function captureTargets(
  targets: CaptureTarget[],
  options: CliOptions
): Promise<CaptureRecord[]> {
  if (targets.length === 0) {
    return [];
  }

  const records: CaptureRecord[] = new Array(targets.length);
  let nextIndex = 0;
  const workerCount = Math.min(options.concurrency, targets.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= targets.length) {
        return;
      }

      const target = targets[currentIndex];
      records[currentIndex] = await captureTarget(
        target,
        options,
        currentIndex + 1,
        targets.length
      );
    }
  });

  await Promise.all(workers);
  return records;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.showHelp) {
    printHelp();
    return;
  }

  if (!options.includeDatavis && !options.includeOtherFrontends) {
    throw new Error("Both capture groups are disabled.");
  }

  if (options.presets.length === 0) {
    throw new Error("--presets must specify at least one preset key");
  }
  for (const key of options.presets) {
    if (!PRESETS.some(preset => preset.key === key)) {
      throw new Error(`Unknown preset: ${key}. Valid: ${PRESETS.map(p => p.key).join(", ")}`);
    }
  }

  const datavisTargets = options.includeDatavis
    ? await discoverDatavisTargets(options)
    : [];
  const frontendTargets = options.includeOtherFrontends
    ? await discoverFrontendTargets(options)
    : [];

  let targets = [...datavisTargets, ...frontendTargets];

  if (options.offset > 0) {
    targets = targets.slice(options.offset);
  }

  if (options.limit) {
    targets = targets.slice(0, options.limit);
  }

  const datavisCount = targets.filter(t => t.kind === "datavis").length;
  const frontendCount = targets.filter(t => t.kind === "frontend").length;

  console.log(
    `Discovered ${targets.length} targets (${datavisCount} datavis, ${frontendCount} frontends)`
  );

  if (targets.length === 0) {
    console.log("Nothing to capture.");
    return;
  }

  if (options.dryRun) {
    for (const target of targets) {
      console.log(
        `- [${target.kind}] ${target.url} -> ${target.outputDir} (${target.presetKeys.length} presets)`
      );
    }
    console.log("Dry run complete.");
    return;
  }

  const records = await captureTargets(targets, options);

  const { manifestPath, allRecords } = await writeManifest(
    options.outputDir,
    options,
    targets,
    records
  );
  const indexPath = await writeIndexPage(options, allRecords);

  const ok = allRecords.filter(record => record.status === "ok").length;
  const partial = allRecords.filter(record => record.status === "partial").length;
  const failed = allRecords.filter(record => record.status === "failed").length;

  console.log(`Capture complete. ok=${ok}, partial=${partial}, failed=${failed}`);
  console.log(`Manifest: ${manifestPath}`);
  if (indexPath) {
    console.log(`Index: ${indexPath}`);
  }
}

main()
  .catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fatal: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser().catch(() => {});
  });
