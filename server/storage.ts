import fs from "fs";
import path from "path";

// Local file storage - screenshots saved to data/screenshots/
const DATA_DIR = path.resolve(process.cwd(), "data", "screenshots");
const DATA_DIR_RESOLVED = path.resolve(DATA_DIR);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function toStoragePath(relKey: string): { key: string; filePath: string } {
  const key = relKey.replace(/^\/+/, "");
  const filePath = path.resolve(DATA_DIR, key);
  const storageRootPrefix = `${DATA_DIR_RESOLVED}${path.sep}`;

  if (
    filePath !== DATA_DIR_RESOLVED &&
    !filePath.startsWith(storageRootPrefix)
  ) {
    throw new Error("Invalid storage key path");
  }

  return { key, filePath };
}

async function pruneEmptyParentDirs(filePath: string): Promise<void> {
  let dir = path.dirname(filePath);
  while (dir !== DATA_DIR_RESOLVED) {
    let entries: string[];
    try {
      entries = await fs.promises.readdir(dir);
    } catch {
      return;
    }
    if (entries.length > 0) {
      return;
    }
    try {
      await fs.promises.rmdir(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
}

// relKey: e.g. "screenshots/<jobId>/<preset>-<id>.png"
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array,
  _contentType = "image/png"
): Promise<{ key: string; url: string }> {
  const { key, filePath } = toStoragePath(relKey);
  ensureDir(path.dirname(filePath));

  await fs.promises.writeFile(filePath, data);

  // URL includes the app base path so browser can load images correctly
  // Caddy strips /screenshat prefix, Express serves /data/screenshots/<key>
  const url = `/screenshat/data/screenshots/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { key } = toStoragePath(relKey);
  return { key, url: `/screenshat/data/screenshots/${key}` };
}

export async function storageDelete(relKey: string): Promise<boolean> {
  const { filePath } = toStoragePath(relKey);
  try {
    await fs.promises.unlink(filePath);
    await pruneEmptyParentDirs(filePath);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

export async function storageDeleteMany(
  relKeys: string[]
): Promise<{ deleted: number; missing: number; errors: number }> {
  let deleted = 0;
  let missing = 0;
  let errors = 0;

  for (const relKey of relKeys) {
    try {
      const didDelete = await storageDelete(relKey);
      if (didDelete) {
        deleted += 1;
      } else {
        missing += 1;
      }
    } catch (error) {
      errors += 1;
      console.warn("[Storage] Failed to delete file:", relKey, error);
    }
  }

  return { deleted, missing, errors };
}

export { DATA_DIR };
