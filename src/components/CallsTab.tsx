import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead } from "../types";

function telHref(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return `tel:+61${digits.startsWith('0') ? digits.slice(1) : digits}`;
}

export default function CallsTab() {
  const [calls, setCalls] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.get();
      setCalls(data.todaysCalls);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveNote = async (lead: Lead, note: string) => {
    setNotes(prev => ({ ...prev, [lead._id]: note }));
    try {
      await api.leads.update(lead._id, { notes: note });
    } catch {
      // best-effort note save
    }
  };

  const markStatus = async (lead: Lead, status: Lead['status']) => {
    try {
      await api.leads.update(lead._id, { status });
      setCalls(prev => prev.filter(l => l._id !== lead._id));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  if (calls.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No active leads to call. Add leads from the Search tab.
      </div>
    );
  }

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}

      <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
        Your top {calls.length} leads for today, sorted by score — work through them one by one.
      </div>

      <div className="space-y-3">
        {calls.map((lead, i) => (
          <div
            key={lead._id}
            className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-blue-500"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{lead.name}</span>
                  {lead.score >= 4 && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                      ★{lead.score}
                    </span>
                  )}
                </div>
                {lead.phone && (
                  <a href={telHref(lead.phone)} className="text-blue-600 text-sm hover:underline block mb-1">
                    📞 {lead.phone}
                  </a>
                )}
                <div className="text-xs text-gray-400 mb-3">
                  {lead.email} {lead.address && `· ${lead.address}`}
                </div>

                <textarea
                  placeholder="Call notes — what did they say?"
                  value={notes[lead._id] ?? lead.notes ?? ""}
                  onChange={e => saveNote(lead, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                />

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => markStatus(lead, "interested")}
                    className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
                  >
                    ✓ Interested
                  </button>
                  <button
                    onClick={() => markStatus(lead, "called")}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100"
                  >
                    Called / No answer
                  </button>
                  <button
                    onClick={() => markStatus(lead, "not-interested")}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-100"
                  >
                    Not interested
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
