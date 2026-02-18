import express from 'express';
import path from 'path';
import { db } from '../db';
import { screenshots } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [record] = await db.select().from(screenshots).where(eq(screenshots.id, id));
    if (!record) {
      return res.status(404).send('Screenshot not found');
    }
    const filePath = path.resolve(record.filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).send('Error serving screenshot');
  }
});

export default router;
