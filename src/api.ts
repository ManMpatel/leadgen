import type { Lead, Search, Subscriber, DashboardData, LeadStatus } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  leads: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return req<Lead[]>(`/api/leads${qs}`);
    },
    create: (lead: Partial<Lead>) =>
      req<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),
    bulk: (leads: Partial<Lead>[], query?: string) =>
      req<{ inserted: number; updated: number; flagged: number; leadIds: string[] }>(
        '/api/leads/bulk',
        { method: 'POST', body: JSON.stringify({ leads, query }) }
      ),
    update: (id: string, patch: Partial<Lead> & { status?: LeadStatus; followUpDueAt?: string | null }) =>
      req<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    delete: (id: string) =>
      req<void>(`/api/leads/${id}`, { method: 'DELETE' }),
  },
  searches: {
    list: () => req<Search[]>('/api/searches'),
    create: (data: { query: string; resultCount: number; leadIds: string[] }) =>
      req<Search>('/api/searches', { method: 'POST', body: JSON.stringify(data) }),
  },
  subscribers: {
    list: () => req<Subscriber[]>('/api/subscribers'),
    close: (leadId: string, data: Record<string, unknown>) =>
      req<Subscriber>(`/api/subscribers/${leadId}/close`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, patch: Record<string, unknown>) =>
      req<Subscriber>(`/api/subscribers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
  },
  gemini: {
    search: (query: string) =>
      req<{ leads: Partial<Lead>[]; text: string }>('/api/gemini/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
    email: (data: {
      leadId: string;
      transcript?: string;
      isFollowUp?: boolean;
      daysSinceEmail?: number;
    }) =>
      req<{ email: string }>('/api/gemini/email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  dashboard: {
    get: () => req<DashboardData>('/api/dashboard'),
  },
};
