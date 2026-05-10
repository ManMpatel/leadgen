import { ObjectId } from 'mongodb';
import { getLeads } from './collections';
import { scoreLead } from './scoring';
import type { RawLead, Lead } from './types';

export function normalizePhone(raw: string): string {
  if (!raw || raw === 'not found') return '';
  const digits = raw.replace(/[\s\-\(\)\+]/g, '');
  if (digits.startsWith('61') && digits.length >= 11) return digits.slice(2);
  if (digits.startsWith('0') && digits.length > 1) return digits.slice(1);
  return digits;
}

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bpty\s+ltd\.?\b/gi, '')
    .replace(/\blimited\b/gi, '')
    .replace(/\bltd\.?\b/gi, '')
    .replace(/\bthe\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSuburb(address: string): string {
  const match = address.match(/,\s*([A-Za-z\s]+?)\s+(?:NSW|VIC|QLD|WA|SA|ACT|TAS|NT)\s*\d{0,4}/i);
  if (match) return match[1].trim().toLowerCase();
  const parts = address.split(',');
  return (parts[parts.length - 1] ?? '').trim().toLowerCase();
}

function extractDomain(website: string): string {
  if (!website || website === 'none' || website === 'not found') return '';
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^www\./, '').split('/')[0] ?? '';
  }
}

function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const n = bigrams.get(bg) ?? 0;
    if (n > 0) { intersection++; bigrams.set(bg, n - 1); }
  }
  return (2 * intersection) / (a.length + b.length - 2);
}

export function dedupeWithinBatch(leads: RawLead[]): RawLead[] {
  const seenPhones = new Set<string>();
  const seenNameSuburb = new Set<string>();
  const out: RawLead[] = [];
  for (const lead of leads) {
    const pn = normalizePhone(lead.phone ?? '');
    const nn = normalizeName(lead.name);
    const sub = extractSuburb(lead.address ?? '');
    if (pn && seenPhones.has(pn)) continue;
    const key = `${nn}|${sub}`;
    if (seenNameSuburb.has(key)) continue;
    if (pn) seenPhones.add(pn);
    seenNameSuburb.add(key);
    out.push(lead);
  }
  return out;
}

export interface UpsertResult {
  action: 'inserted' | 'updated';
  leadId: ObjectId;
  flagged: boolean;
}

export async function upsertLead(raw: RawLead): Promise<UpsertResult> {
  const coll = getLeads();
  const phoneNorm = normalizePhone(raw.phone ?? '');
  const nameNorm = normalizeName(raw.name);
  const suburb = extractSuburb(raw.address ?? '');
  const score = scoreLead(raw);
  const now = new Date();

  const filter = phoneNorm
    ? { phoneNormalized: phoneNorm }
    : { nameNormalized: nameNorm, suburb };

  const doc = await coll.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        name: raw.name,
        nameNormalized: nameNorm,
        type: raw.type,
        phone: raw.phone,
        phoneNormalized: phoneNorm || undefined,
        email: raw.email,
        address: raw.address,
        suburb,
        website: raw.website,
        notes: raw.notes ?? '',
        status: (raw.status ?? 'new') as import('./types').LeadStatus,
        sourceQuery: raw.sourceQuery,
        score,
        addedAt: now,
        alternativePhones: [],
        alternativeEmails: [],
        unsubscribed: false,
      },
      $set: { lastSeenInSearch: now },
    },
    { upsert: true, returnDocument: 'before' }
  );

  const wasInserted = doc === null;
  const leadId = wasInserted
    ? (await coll.findOne(filter, { projection: { _id: 1 } }))?._id!
    : doc._id!;

  let flagged = false;

  if (wasInserted && nameNorm.length > 3) {
    const domain = extractDomain(raw.website ?? '');
    const candidates = await coll
      .find(
        { nameNormalized: { $ne: nameNorm }, _id: { $ne: leadId } },
        { projection: { _id: 1, nameNormalized: 1, suburb: 1, website: 1 } }
      )
      .limit(200)
      .toArray();

    for (const c of candidates) {
      const nameSim = diceSimilarity(nameNorm, c.nameNormalized ?? '');
      const sameSuburb = suburb && c.suburb && suburb === c.suburb;
      const sameDomain = domain && extractDomain(c.website ?? '') === domain;
      if ((nameSim > 0.85 && sameSuburb) || sameDomain) {
        await coll.updateOne({ _id: leadId }, { $set: { possibleDuplicateOf: c._id } });
        flagged = true;
        break;
      }
    }
  }

  return { action: wasInserted ? 'inserted' : 'updated', leadId, flagged };
}
