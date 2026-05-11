import type { RawLead } from './types';

export function scoreLead(lead: RawLead): number {
  let score = 0;

  // Positive signals — healthy small business
  if (lead.website && lead.website !== 'none' && lead.website !== 'not found') score++;

  const digits = (lead.phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('02') || digits.startsWith('612')) score++;

  if (/pty\s+ltd|(?<![a-z])ltd(?![a-z])/i.test(lead.name)) score++;

  const email = lead.email ?? '';
  if (email && email !== 'not found' && !/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i.test(email)) score++;

  if (/\b\d{4}\b/.test(lead.address ?? '')) score++;

  // Negative signals — enterprise-tier, too big for $99/mo pitch
  if (/\b(holdings|group|international|global)\b/i.test(lead.name)) score -= 2;

  if (/^(1300|1800)/.test(digits) || /^61(1300|1800)/.test(digits)) score -= 1;

  if (/\b(level|tower)\s*\d+/i.test(lead.address ?? '')) score -= 1;

  return Math.max(1, score);
}
