import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { DashboardData, Lead } from "../types";

interface Props {
  onNavigate: (tab: "Dashboard" | "Search" | "Pipeline" | "Calls" | "Interested" | "Success") => void;
}

function telHref(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return `tel:+61${digits.startsWith('0') ? digits.slice(1) : digits}`;
}

function daysSince(iso?: string) {
  if (!iso) return 0;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function DashboardTab({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [followUpEmails, setFollowUpEmails] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard.get());
    } catch (e: unknown) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateFollowUp = async (lead: Lead) => {
    setGenerating(lead._id);
    const days = daysSince(lead.followUpDueAt) + 3;
    try {
      const { email } = await api.gemini.email({
        leadId: lead._id,
        isFollowUp: true,
        daysSinceEmail: days,
      });
      setFollowUpEmails(prev => ({ ...prev, [lead._id]: email }));
    } catch (e: unknown) {
      setError(String(e));
    }
    setGenerating(null);
  };

  const copyEmail = (id: string) => {
    navigator.clipboard.writeText(followUpEmails[id] ?? "");
  };

  if (!data) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading dashboard...</div>;
  }

  const { todaysCalls, interestedCount, activeSubscriberCount, mrr, followUpsDue, recentlyInterested } = data;

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Today's calls"
          value={String(todaysCalls.length)}
          sub="leads queued"
          color="blue"
          onClick={() => onNavigate("Calls")}
        />
        <MetricCard
          label="Interested"
          value={String(interestedCount)}
          sub="awaiting email"
          color="green"
          onClick={() => onNavigate("Interested")}
        />
        <MetricCard
          label="MRR"
          value={`$${mrr}`}
          sub={`${activeSubscriberCount} subscriber${activeSubscriberCount !== 1 ? "s" : ""}`}
          color="teal"
          onClick={() => onNavigate("Success")}
        />
        <MetricCard
          label="Follow-ups due"
          value={String(followUpsDue.length)}
          sub={followUpsDue.length === 0 ? "all clear" : "need nudge"}
          color={followUpsDue.length > 0 ? "orange" : "gray"}
        />
      </div>

      {/* Today's call list */}
      {todaysCalls.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Today's calls</h2>
          <div className="space-y-2">
            {todaysCalls.map((lead, i) => (
              <div key={lead._id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{lead.name}</div>
                  <div className="text-xs text-gray-400 truncate">{lead.type}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lead.score >= 4 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">★{lead.score}</span>
                  )}
                  {lead.phone && (
                    <a
                      href={telHref(lead.phone)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate("Calls")}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Open Calls tab →
          </button>
        </section>
      )}

      {/* Follow-ups due */}
      {followUpsDue.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Follow-ups due</h2>
          <div className="space-y-3">
            {followUpsDue.map(lead => (
              <div key={lead._id} className="bg-white border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                    <div className="text-xs text-gray-400">
                      Due {lead.followUpDueAt ? new Date(lead.followUpDueAt).toLocaleDateString("en-AU") : "—"}
                      {" · "}
                      {daysSince(lead.followUpDueAt)} days overdue
                    </div>
                  </div>
                  <button
                    onClick={() => generateFollowUp(lead)}
                    disabled={generating === lead._id}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {generating === lead._id ? "Generating..." : "Generate follow-up"}
                  </button>
                </div>
                {followUpEmails[lead._id] && (
                  <div className="mt-2">
                    <textarea
                      readOnly
                      value={followUpEmails[lead._id]}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none h-32 text-gray-700 focus:outline-none"
                    />
                    <button
                      onClick={() => copyEmail(lead._id)}
                      className="mt-1 text-xs text-blue-600 hover:underline"
                    >
                      Copy to clipboard
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently interested */}
      {recentlyInterested.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-2">Recently interested</h2>
          <div className="space-y-2">
            {recentlyInterested.map(lead => (
              <div key={lead._id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                  <div className="text-xs text-gray-400">{lead.type}</div>
                </div>
                <button
                  onClick={() => onNavigate("Interested")}
                  className="px-3 py-1.5 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50"
                >
                  Draft email
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {todaysCalls.length === 0 && followUpsDue.length === 0 && recentlyInterested.length === 0 && mrr === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Dashboard will populate once you add leads and make calls.{" "}
          <button onClick={() => onNavigate("Search")} className="text-blue-600 hover:underline">
            Start with Search →
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label, value, sub, color, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "green" | "teal" | "orange" | "gray";
  onClick?: () => void;
}) {
  const colors = {
    blue:   "bg-blue-50 border-blue-100",
    green:  "bg-green-50 border-green-100",
    teal:   "bg-teal-50 border-teal-100",
    orange: "bg-orange-50 border-orange-100",
    gray:   "bg-gray-50 border-gray-100",
  };
  const valueColors = {
    blue: "text-blue-700", green: "text-green-700", teal: "text-teal-700",
    orange: "text-orange-700", gray: "text-gray-500",
  };
  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 ${colors[color]} ${onClick ? "cursor-pointer hover:shadow-sm transition-shadow" : ""}`}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${valueColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
