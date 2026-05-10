import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getSubscribers, getLeads } from '../collections';
import type { PaymentRecord } from '../types';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const subs = await getSubscribers().find({}).sort({ startDate: -1 }).toArray();

    const leadIds = subs.map(s => s.leadId);
    const leads = await getLeads().find({ _id: { $in: leadIds } }).toArray();
    const leadMap = new Map(leads.map(l => [l._id!.toString(), l]));

    const enriched = subs.map(s => ({
      ...s,
      lead: leadMap.get(s.leadId.toString()),
    }));

    res.json(enriched);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post('/:leadId/close', async (req, res) => {
  try {
    const leadId = new ObjectId(req.params.leadId);
    const {
      decisionMakerName,
      directEmail,
      directPhone,
      monthlyPrice,
      startDate,
      billingMethod,
      firstPaymentReceived,
      closingNotes,
    } = req.body;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    const paymentHistory: PaymentRecord[] = firstPaymentReceived
      ? [{ month: currentMonth, paid: true, paidAt: now }]
      : [];

    const subscriber = {
      leadId,
      decisionMakerName,
      directEmail,
      directPhone,
      monthlyPrice: Number(monthlyPrice) || 99,
      startDate: new Date(startDate),
      billingMethod,
      paymentHistory,
      status: 'active' as const,
      closingNotes,
      deliverables: [],
    };

    const result = await getSubscribers().insertOne(subscriber);
    await getLeads().updateOne({ _id: leadId }, { $set: { status: 'closed-won' } });

    res.status(201).json({ ...subscriber, _id: result.insertedId });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const _id = new ObjectId(req.params.id);
    const { status, churnReason, monthlyPrice, billingMethod, paymentMonth, paid } = req.body;

    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status;
    if (churnReason !== undefined) patch.churnReason = churnReason;
    if (monthlyPrice !== undefined) patch.monthlyPrice = Number(monthlyPrice);
    if (billingMethod !== undefined) patch.billingMethod = billingMethod;

    const updateOp: Record<string, unknown> = {};
    if (Object.keys(patch).length > 0) updateOp.$set = patch;

    if (paymentMonth !== undefined) {
      const sub = await getSubscribers().findOne({ _id });
      if (sub) {
        const existing = sub.paymentHistory.find(p => p.month === paymentMonth);
        if (existing) {
          existing.paid = Boolean(paid);
          existing.paidAt = paid ? new Date() : undefined;
        } else {
          sub.paymentHistory.push({
            month: paymentMonth,
            paid: Boolean(paid),
            paidAt: paid ? new Date() : undefined,
          });
        }
        updateOp.$set = { ...(updateOp.$set as object ?? {}), paymentHistory: sub.paymentHistory };
      }
    }

    const updated = await getSubscribers().findOneAndUpdate(
      { _id },
      updateOp,
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ error: 'Subscriber not found' });
    res.json(updated);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
