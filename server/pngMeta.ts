// PNG tEXt chunk embedding for alt text metadata
// Uses png-chunks-* (pure JS, no native deps)
// Embeds at download time so edits are always reflected without rewriting stored files.

import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import text from "png-chunk-text";

const ALT_TEXT_KEYWORD = "Description";

/**
 * Embed alt text into a PNG buffer as a tEXt chunk.
 * Returns a new buffer with the Description tEXt chunk inserted before IEND.
 * If altText is empty/null, returns the original buffer unchanged.
 */
export function embedAltText(pngBuffer: Buffer, altText: string | null | undefined): Buffer {
  if (!altText?.trim()) return pngBuffer;

  try {
    const chunks = extract(pngBuffer);

    // Remove any existing Description chunks to avoid duplicates
    const filtered = chunks.filter(
      chunk =>
        !(chunk.name === "tEXt" &&
          Buffer.from(chunk.data).toString("latin1").startsWith(ALT_TEXT_KEYWORD + "\0"))
    );

    // Insert new Description chunk before IEND
    const iendIdx = filtered.findIndex(c => c.name === "IEND");
    const insertAt = iendIdx >= 0 ? iendIdx : filtered.length;

    // Sanitize: tEXt keyword uses latin1; truncate if needed, strip null bytes
    const safe = altText.replace(/\0/g, "").substring(0, 32000);
    filtered.splice(insertAt, 0, text.encode(ALT_TEXT_KEYWORD, safe));

    return Buffer.from(encode(filtered));
  } catch (err) {
    // Never break a download over metadata — return original
    console.error("[pngMeta] Failed to embed alt text:", err);
    return pngBuffer;
  }
}
