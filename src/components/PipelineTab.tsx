import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead, LeadStatus } from "../types";

interface Props {
  onDraftEmail: () => void;
}

const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
  called: { bg: "bg-amber-100", text: "text-amber-700", label: "Called" },
  interested: { bg: "bg-green-100", text: "text-green-700", label: "Interested" },
  "email-sent": { bg: "bg-purple-100", text: "text-purple-700", label: "Email Sent" },
  "closed-won": { bg: "bg-teal-100", text: "text-teal-700", label: "Closed Won" },
  "not-interested": { bg: "bg-gray-100", text: "text-gray-500", label: "Not Interested" },
};

const ALL_STATUSES = Object.keys(STATUS_COLORS) as LeadStatus[];

function telHref(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return `tel:+61${digits.startsWith('0') ? digits.slice(1) : digits}`;
}

export default function PipelineTab({ onDraftEmail }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.status = filterStatus;
      setLeads(await api.leads.list(params));
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      const updated = await api.leads.update(lead._id, { status });
      setLeads(prev => prev.map(l => l._id === lead._id ? updated : l));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {} as Record<LeadStatus, number>);
  const totalCount = leads.length;

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}

      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilterStatus("all")}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            filterStatus === "all"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          All ({totalCount})
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              filterStatus === s
                ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} border-current`
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {STATUS_COLORS[s].label} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No leads yet. Search for businesses and add them.
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div key={lead._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900">{lead.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status].bg} ${STATUS_COLORS[lead.status].text}`}
                    >
                      {STATUS_COLORS[lead.status].label}
                    </span>
                    {lead.possibleDuplicateOf && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Possible duplicate
                      </span>
                    )}
                    {lead.score >= 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        ★ Score {lead.score}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lead.phone && (
                      <a href={telHref(lead.phone)} className="text-blue-600 hover:underline mr-3">
                        📞 {lead.phone}
                      </a>
                    )}
                    {lead.email && <span className="mr-3">{lead.email}</span>}
                    {lead.suburb && <span className="text-gray-400">{lead.suburb}</span>}
                  </div>
                </div>
                <div className="flex gap-2 items-center ml-4">
                  <select
                    value={lead.status}
                    onChange={e => updateStatus(lead, e.target.value as LeadStatus)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                    ))}
                  </select>
                  {(lead.status === "interested" || lead.status === "called") && (
                    <button
                      onClick={onDraftEmail}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Draft Email
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
