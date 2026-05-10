// ─────────────────────────────────────────────────────────────────────────────
// One-time migration: paste this entire script into the browser console while
// the OLD app (frontend-only version) is open, with the backend server running
// at http://localhost:3001.
//
// It reads leadgen_leads + leadgen_notes from localStorage, merges notes into
// each lead, normalises the status field (sent-email → email-sent), then POSTs
// them to the backend bulk endpoint.
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  const BACKEND = 'http://localhost:3001';

  const rawLeads = JSON.parse(localStorage.getItem('leadgen_leads') || '[]');
  const rawNotes = JSON.parse(localStorage.getItem('leadgen_notes') || '{}');

  if (rawLeads.length === 0) {
    console.warn('No leads found in localStorage. Nothing to migrate.');
    return;
  }

  const STATUS_MAP = {
    'sent-email': 'email-sent',
    'closed':     'closed-won',
  };

  const leads = rawLeads.map(l => ({
    name:    l.name,
    type:    l.type    || 'Warehouse / Logistics',
    phone:   l.phone   || '',
    email:   l.email   || '',
    address: l.address || '',
    website: l.website || '',
    notes:   rawNotes[String(l.id)] || l.notes || '',
    status:  STATUS_MAP[l.status] || l.status || 'new',
  }));

  console.log(`Migrating ${leads.length} leads…`);

  try {
    const res = await fetch(`${BACKEND}/api/leads/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, query: 'localStorage migration' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    console.log('✅ Migration complete:', result);
    console.log(`   Inserted: ${result.inserted}`);
    console.log(`   Already existed (updated): ${result.updated}`);
    console.log(`   Flagged as possible duplicates: ${result.flagged}`);
    console.log('You can now patch statuses manually in MongoDB if needed.');
    console.log('Lead IDs:', result.leadIds);
  } catch (e) {
    console.error('Migration failed:', e);
  }
})();
