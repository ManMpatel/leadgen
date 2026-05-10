import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getLeads } from '../collections';
import { dedupeWithinBatch, upsertLead } from '../dedup';
import type { RawLead, LeadStatus } from '../types';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const coll = getLeads();
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.unsubscribed !== 'true') filter.unsubscribed = { $ne: true };

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const skip = Number(req.query.skip) || 0;
    const sortField: Record<string, 1 | -1> =
      req.query.sort === 'score' ? { score: -1 } : { addedAt: -1 };

    const leads = await coll.find(filter).sort(sortField).skip(skip).limit(limit).toArray();
    res.json(leads);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { leads, query } = req.body as { leads: RawLead[]; query?: string };
    if (!Array.isArray(leads)) return res.status(400).json({ error: 'leads must be an array' });

    const deduped = dedupeWithinBatch(leads.map(l => ({ ...l, sourceQuery: query })));
    let inserted = 0, updated = 0, flagged = 0;
    const leadIds: string[] = [];

    for (const raw of deduped) {
      const result = await upsertLead(raw);
      if (result.action === 'inserted') inserted++;
      else updated++;
      if (result.flagged) flagged++;
      leadIds.push(result.leadId.toString());
    }

    res.json({ inserted, updated, flagged, leadIds });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post('/', async (req, res) => {
  try {
    const raw = req.body as RawLead;
    const result = await upsertLead(raw);
    const lead = await getLeads().findOne({ _id: result.leadId });
    res.status(result.action === 'inserted' ? 201 : 200).json(lead);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const coll = getLeads();
    const _id = new ObjectId(req.params.id);
    const { status, notes, followUpDueAt, calledAt, unsubscribed } = req.body;

    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status as LeadStatus;
    if (notes !== undefined) patch.notes = notes;
    if (followUpDueAt !== undefined) patch.followUpDueAt = followUpDueAt ? new Date(followUpDueAt) : null;
    if (calledAt !== undefined) patch.calledAt = calledAt ? new Date(calledAt) : null;
    if (unsubscribed !== undefined) patch.unsubscribed = unsubscribed;

    if (status === 'called' || status === 'interested') {
      patch.calledAt = new Date();
    }

    const lead = await coll.findOneAndUpdate(
      { _id },
      { $set: patch },
      { returnDocument: 'after' }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const _id = new ObjectId(req.params.id);
    await getLeads().deleteOne({ _id });
    res.status(204).end();
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
