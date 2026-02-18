import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { captureScreenshot } from '../../utils/screenshot';
import { db } from '../../db';
import { screenshots } from '../../db/schema';
import sharp from 'sharp';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';

export const screenshotRouter = router({
  capture: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const browser = ctx.browser; // Assume Playwright browser instance is in context
      const outputDir = process.env.SCREENSHOT_DIR || './screenshots';
      const { filePath, altText } = await captureScreenshot(browser, input.url, outputDir);
      
      // Save to database
      const [record] = await db.insert(screenshots).values({
        filePath,
        url: input.url,
        altText,
      }).returning();
      
      return record;
    }),
  
  updateAltText: publicProcedure
    .input(z.object({ id: z.number(), altText: z.string().max(500) }))
    .mutation(async ({ input }) => {
      // Update database
      const [updated] = await db.update(screenshots)
        .set({ altText: input.altText })
        .where(eq(screenshots.id, input.id))
        .returning();
      
      if (!updated) throw new Error('Screenshot not found');
      
      // Update metadata in file
      await sharp(updated.filePath)
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: input.altText,
            },
          },
        })
        .toFile(updated.filePath + '.tmp');
      
      await fs.rename(updated.filePath + '.tmp', updated.filePath);
      return updated;
    }),
  
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [record] = await db.select().from(screenshots).where(eq(screenshots.id, input.id));
      if (!record) throw new Error('Screenshot not found');
      return record;
    }),
});
