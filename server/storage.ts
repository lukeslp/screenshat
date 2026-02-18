import fs from "fs";
import path from "path";

// Local file storage - screenshots saved to data/screenshots/
const DATA_DIR = path.resolve(process.cwd(), "data", "screenshots");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// relKey: e.g. "screenshots/<jobId>/<preset>-<id>.png"
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array,
  _contentType = "image/png"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const filePath = path.join(DATA_DIR, key);
  ensureDir(path.dirname(filePath));

  await fs.promises.writeFile(filePath, data);

  // URL will be served via /data/screenshots/<key> Express route
  const url = `/data/screenshots/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  return { key, url: `/data/screenshots/${key}` };
}

export { DATA_DIR };
