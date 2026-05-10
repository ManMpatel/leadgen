import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead } from "../types";

export default function InterestedTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [transcript, setTranscript] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.leads.list({ status: "interested" });
      setLeads(data);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectLead = (lead: Lead | null) => {
    setSelected(lead);
    setEmail("");
    setTranscript("");
  };

  const generateEmail = async () => {
    if (!selected) return;
    setGenerating(true);
    setEmail("");
    setError("");
    try {
      const { email: text } = await api.gemini.email({
        leadId: selected._id,
        transcript,
      });
      setEmail(text);
    } catch (e: unknown) {
      setError(String(e));
    }
    setGenerating(false);
  };

  const generateFollowUp = async (lead: Lead) => {
    setSelected(lead);
    setEmail("");
    setError("");
    setGenerating(true);
    const daysElapsed = lead.followUpDueAt
      ? Math.round((Date.now() - new Date(lead.followUpDueAt).getTime()) / 86_400_000 + 3)
      : 3;
    try {
      const { email: text } = await api.gemini.email({
        leadId: lead._id,
        isFollowUp: true,
        daysSinceEmail: daysElapsed,
      });
      setEmail(text);
    } catch (e: unknown) {
      setError(String(e));
    }
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markEmailSent = async () => {
    if (!selected) return;
    const followUpDueAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    try {
      await api.leads.update(selected._id, { status: "email-sent", followUpDueAt });
      setLeads(prev => prev.filter(l => l._id !== selected._id));
      setSelected(null);
      setEmail("");
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}

      {leads.length === 0 ? (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm mb-4">
          No interested leads yet. Mark leads as "Interested" from the Calls tab first.
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">Select an interested lead</label>
          <select
            value={selected?._id ?? ""}
            onChange={e => {
              const lead = leads.find(l => l._id === e.target.value) ?? null;
              selectLead(lead);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Choose a lead...</option>
            {leads.map(l => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <div className="mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
            <div className="font-medium text-gray-900">{selected.name}</div>
            <div className="text-xs text-gray-500 mt-1">{selected.email} · {selected.type}</div>
            {selected.notes && (
              <div className="text-xs text-gray-400 mt-1 italic">Notes: {selected.notes}</div>
            )}
          </div>

          <label className="block text-xs text-gray-500 mb-1">
            Paste your call notes or transcript (optional)
          </label>
          <textarea
            placeholder="What did they say? Any specific pain points, questions, objections?"
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 mb-3"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={generateEmail}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate email"}
            </button>
            <button
              onClick={() => generateFollowUp(selected)}
              disabled={generating}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Generate follow-up nudge
            </button>
          </div>
        </div>
      )}

      {email && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Generated email</span>
            <button
              onClick={copy}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <textarea
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-80 leading-relaxed"
          />
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={markEmailSent}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Email sent — set follow-up reminder ✓
            </button>
            <button
              onClick={generateEmail}
              disabled={generating}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
