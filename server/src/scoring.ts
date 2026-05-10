import type { RawLead } from './types';

export function scoreLead(lead: RawLead): number {
  let score = 0;

  if (lead.website && lead.website !== 'none' && lead.website !== 'not found') score++;

  const digits = (lead.phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('02') || digits.startsWith('612')) score++;

  if (/pty\s+ltd|(?<![a-z])ltd(?![a-z])/i.test(lead.name)) score++;

  const email = lead.email ?? '';
  if (email && email !== 'not found' && !/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i.test(email)) score++;

  if (/\b\d{4}\b/.test(lead.address ?? '')) score++;

  return Math.max(1, score);
}
