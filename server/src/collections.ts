import { Collection } from 'mongodb';
import { getDb } from './db';
import type { Lead, Search, Subscriber } from './types';

export function getLeads(): Collection<Lead> {
  return getDb().collection<Lead>('leads');
}

export function getSearches(): Collection<Search> {
  return getDb().collection<Search>('searches');
}

export function getSubscribers(): Collection<Subscriber> {
  return getDb().collection<Subscriber>('subscribers');
}

export async function createIndexes(): Promise<void> {
  const leads = getLeads();
  await leads.createIndex({ phoneNormalized: 1 }, { unique: true, sparse: true, name: 'idx_phone' });
  await leads.createIndex({ nameNormalized: 1, suburb: 1 }, { name: 'idx_name_suburb' });
  await leads.createIndex({ followUpDueAt: 1 }, { sparse: true, name: 'idx_followup' });
  await leads.createIndex({ status: 1 }, { name: 'idx_status' });
  await leads.createIndex({ score: -1 }, { name: 'idx_score' });

  const searches = getSearches();
  await searches.createIndex({ runAt: -1 }, { name: 'idx_search_date' });

  const subscribers = getSubscribers();
  await subscribers.createIndex({ leadId: 1 }, { unique: true, name: 'idx_subscriber_lead' });

  console.log('Indexes ready');
}
