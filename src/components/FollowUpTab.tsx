import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead } from "../types";

function daysSince(iso?: string | Date) {
  if (!iso) return 0;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function FollowUpTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.leads.list({ status: "follow-up-sent" });
      setLeads(data);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveToCalls = async (lead: Lead) => {
    try {
      await api.leads.update(lead._id, { status: "new" });
      setLeads(prev => prev.filter(l => l._id !== lead._id));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}

      {leads.length === 0 ? (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
          No follow-up leads yet. Send follow-ups from the Emailed tab first.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const days = daysSince(lead.followUpDueAt);
            const readyToCall = days >= 0;
            return (
              <div
                key={lead._id}
                className={`bg-white rounded-lg p-4 border ${readyToCall ? "border-red-300" : "border-gray-200"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{lead.name}</span>
                      {readyToCall && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          🔴 Ready to call
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {lead.phone && <span className="mr-3">📞 {lead.phone}</span>}
                      {lead.email && <span className="mr-3">✉️ {lead.email}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Follow-up sent · {readyToCall ? `${days} day${days !== 1 ? "s" : ""} ago — time to call!` : "waiting..."}
                    </div>
                  </div>
                  {readyToCall && (
                    <button
                      onClick={() => moveToCalls(lead)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 ml-3 whitespace-nowrap"
                    >
                      📞 Move to Calls
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}