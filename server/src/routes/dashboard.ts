import { Router } from 'express';
import { getLeads, getSubscribers } from '../collections';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const leadsCol = getLeads();
    const subsCol = getSubscribers();

    const [todaysCalls, interestedCount, followUpsDue, recentlyInterested, activeSubscribers] =
      await Promise.all([
        leadsCol
          .find({ status: { $in: ['new', 'called'] }, unsubscribed: { $ne: true } })
          .sort({ score: -1 })
          .limit(4)
          .toArray(),

        leadsCol.countDocuments({ status: 'interested', unsubscribed: { $ne: true } }),

        leadsCol
          .find({
            status: 'email-sent',
            followUpDueAt: { $lte: new Date() },
            unsubscribed: { $ne: true },
          })
          .sort({ followUpDueAt: 1 })
          .limit(20)
          .toArray(),

        leadsCol
          .find({ status: 'interested', unsubscribed: { $ne: true } })
          .sort({ calledAt: -1 })
          .limit(5)
          .toArray(),

        subsCol.find({ status: 'active' }).toArray(),
      ]);

    const mrr = activeSubscribers.reduce((sum, s) => sum + (s.monthlyPrice ?? 0), 0);

    res.json({
      todaysCalls,
      interestedCount,
      activeSubscriberCount: activeSubscribers.length,
      mrr,
      followUpsDue,
      recentlyInterested,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
