import { Browser } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { generateAltText } from './llm'; // Hypothetical LLM integration

export async function captureScreenshot(
  browser: Browser,
  url: string,
  outputDir: string
): Promise<{ filePath: string, altText: string }> {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const fileName = `${Date.now()}-${url.replace(/[^a-z0-9]/gi, '_')}.png`;
  const filePath = path.join(outputDir, fileName);
  
  // Capture screenshot
  await page.screenshot({ path: filePath, fullPage: true });
  await page.close();
  
  // Generate alt text using LLM (hypothetical function)
  const altText = await generateAltText(url, filePath);
  
  // Embed alt text into PNG metadata using sharp
  await sharp(filePath)
    .withMetadata({
      // Preserve existing metadata if any
      // Add custom tEXt chunk for alt text
      // Note: sharp supports custom metadata via exif or comment, but for tEXt we use a workaround
      exif: {
        IFD0: {
          ImageDescription: altText, // Using ImageDescription as a proxy for alt text
        },
      },
    })
    .toFile(filePath + '.tmp'); // Write to temp file
    
  // Replace original with updated file
  await fs.rename(filePath + '.tmp', filePath);
  
  return { filePath, altText };
}
