import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getLeads } from '../collections';

const router = Router();

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(body: unknown): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message: string };
    candidates?: Array<{ content: { parts: Array<{ text?: string }> } }>;
  };

  if (data.error) throw new Error(data.error.message);
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map(p => p.text ?? '')
    .join('');
}

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body as { query: string };
    if (!query) return res.status(400).json({ error: 'query is required' });

    const prompt = `Search for real businesses matching: "${query}" in Sydney, Australia.

Find 10-15 actual businesses. Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "name": "Business Name Pty Ltd",
    "type": "Warehouse / Logistics",
    "phone": "02 9XXX XXXX",
    "email": "info@business.com.au",
    "address": "123 Street, Suburb NSW 2000",
    "website": "www.business.com.au or none",
    "notes": "One sentence about what they do"
  }
]

Focus on real phone numbers and emails. If email not found put "not found". If website not found put "none".`;

    const text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1 },
    });

    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1) return res.status(422).json({ error: 'Could not parse Gemini response', raw: text });

    const leads = JSON.parse(cleaned.slice(start, end + 1));
    res.json({ leads, text });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { leadId, transcript, isFollowUp, daysSinceEmail } = req.body as {
      leadId: string;
      transcript?: string;
      isFollowUp?: boolean;
      daysSinceEmail?: number;
    };

    const lead = await getLeads().findOne({ _id: new ObjectId(leadId) });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const businessName = process.env.MY_BUSINESS_NAME ?? 'Your Business';
    const contactEmail = process.env.MY_CONTACT_EMAIL ?? 'contact@example.com';
    const spamFooter = `\n\n--\n${businessName}\n${contactEmail}\n\nReply STOP to opt out and you won't hear from me again.`;

    let prompt: string;

    if (isFollowUp) {
      prompt = `You are writing a short, warm follow-up email nudge for a business owner.

Lead: ${lead.name} (${lead.type})
Days since last email: ${daysSinceEmail ?? 3}
Call notes: ${lead.notes || 'none'}

Write a 2-3 sentence follow-up email that:
- References that you emailed ${daysSinceEmail ?? 3} days ago
- Gently asks if they had a chance to review
- Keeps a clear, soft call to action (reply to book a quick call)
- Include subject line at top as "Subject: ..."
- Sign off as "Man Patel"

Keep it very short. Not pushy.`;
    } else {
      prompt = `Write a short professional cold follow-up email for this business:

Business: ${lead.name}
Type: ${lead.type}
Call notes / transcript: ${transcript || lead.notes || 'none'}

I am offering custom business software for $99/month tailored specifically to their warehouse/logistics operations (inventory tracking, order management, staff scheduling, delivery tracking).

Write a concise 4-5 sentence email that:
- Opens with something specific about their business type or what was discussed on the call
- Explains the $99/month custom software offer
- Mentions 2 specific features relevant to their business
- Has a clear call to action (reply to book a 15 min call)
- Include subject line at top as "Subject: ..."
- Sign off as "Man Patel"

Keep it short, warm and conversational. Not salesy.`;
    }

    const text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    });

    res.json({ email: text + spamFooter });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
