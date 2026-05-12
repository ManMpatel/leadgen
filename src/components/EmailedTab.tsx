import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead } from "../types";

function daysSince(iso?: string | Date) {
  if (!iso) return 0;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function EmailedTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.leads.list({ status: "email-sent" });
      setLeads(data);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async (lead: Lead) => {
    setGenerating(lead._id);
    try {
      const { email } = await api.gemini.email({
        leadId: lead._id,
        isFollowUp: true,
        daysSinceEmail: daysSince(lead.followUpDueAt) + 2,
      });
      setEmails(prev => ({ ...prev, [lead._id]: email }));
    } catch (e: unknown) {
      setError(String(e));
    }
    setGenerating(null);
  };

  const sendFollowUp = async (lead: Lead) => {
    const body = emails[lead._id] ?? "";
    const subject = encodeURIComponent(`Following up – ${lead.name}`);
    window.open(`mailto:${encodeURIComponent(lead.email ?? "")}?subject=${subject}&body=${encodeURIComponent(body)}`);
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 2);
    followUpDate.setHours(6, 0, 0, 0);
    try {
      await api.leads.update(lead._id, {
        status: "follow-up-sent",
        followUpDueAt: followUpDate.toISOString(),
      });
      setLeads(prev => prev.filter(l => l._id !== lead._id));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  const grouped = leads.reduce((groups, lead) => {
    const date = lead.addedAt
      ? new Date(lead.addedAt).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
      : "Unknown date";
    if (!groups[date]) groups[date] = [];
    groups[date].push(lead);
    return groups;
  }, {} as Record<string, Lead[]>);

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}

      {leads.length === 0 ? (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
          No emailed leads yet. Send cold emails from the Pipeline tab first.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, group]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{date}</h3>
              <div className="space-y-3">
                {group.map(lead => {
                  const days = daysSince(lead.followUpDueAt);
                  const overdue = days >= 2;
                  return (
                    <div
                      key={lead._id}
                      className={`bg-white rounded-lg p-4 border ${overdue ? "border-red-300" : "border-gray-200"}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{lead.name}</span>
                            {overdue && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                🔴 Follow-up due
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {lead.phone && <span className="mr-3">📞 {lead.phone}</span>}
                            {lead.email && <span className="mr-3">✉️ {lead.email}</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Email sent · {overdue
                              ? `🔴 ${days} day${days !== 1 ? "s" : ""} overdue`
                              : `follow-up in ${2 - days} day${2 - days !== 1 ? "s" : ""}`}
                          </div>
                        </div>
                        <button
                          onClick={() => generate(lead)}
                          disabled={generating === lead._id}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 disabled:opacity-50 ml-3 whitespace-nowrap"
                        >
                          {generating === lead._id ? "Generating..." : "🔔 Generate Follow-Up"}
                        </button>
                      </div>

                      {emails[lead._id] && (
                        <div className="mt-3">
                          <textarea
                            value={emails[lead._id]}
                            onChange={e => setEmails(prev => ({ ...prev, [lead._id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none h-36 focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <button
                            onClick={() => sendFollowUp(lead)}
                            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                          >
                            📨 Open in Mail & Move to Follow Up
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
