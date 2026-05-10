import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getSearches } from '../collections';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const searches = await getSearches().find({}).sort({ runAt: -1 }).limit(50).toArray();
    res.json(searches);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post('/', async (req, res) => {
  try {
    const { query, resultCount, leadIds } = req.body as {
      query: string;
      resultCount: number;
      leadIds: string[];
    };
    const doc = {
      query,
      runAt: new Date(),
      resultCount,
      leadIds: leadIds.map(id => new ObjectId(id)),
    };
    const result = await getSearches().insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
