import { useState, useEffect } from "react";
import type { Lead, LeadStatus } from "../App";

interface Props {
  apiKey: string;
  leads: Lead[];
  selectedLead: Lead | null;
  updateStatus: (id: number, status: LeadStatus) => void;
}

export default function EmailsTab({ apiKey, leads, selectedLead: initialLead, updateStatus }: Props) {
  const [selected, setSelected] = useState<Lead | null>(initialLead);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialLead) setSelected(initialLead);
  }, [initialLead]);

  const interestedLeads = leads.filter(l => l.status === "interested" || l.status === "called");

  const generateEmail = async () => {
    if (!apiKey || !selected) return;
    setLoading(true);
    setEmail("");

    const prompt = `Write a short professional cold follow-up email for this business:

Business: ${selected.name}
Type: ${selected.type}
Notes: ${selected.notes || ""}

I am offering custom business software for $99/month tailored specifically to their warehouse/logistics operations (inventory tracking, order management, staff scheduling, delivery tracking).

Write a concise 4-5 sentence email that:
- Opens with something specific about their business type
- Explains the $99/month custom software offer
- Mentions 2 specific features relevant to their business
- Has a clear call to action (reply to book a 15 min call)
- Include subject line at top as "Subject: ..."
- Sign off as "Man Patel"

Keep it short, warm and conversational. Not salesy.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
      setEmail(text);
    } catch (e: any) {
      setEmail("Error: " + e.message);
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Select an interested lead</label>
        <select
          value={selected?.id || ""}
          onChange={e => {
            const lead = leads.find(l => l.id === Number(e.target.value));
            setSelected(lead || null);
            setEmail("");
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Choose a lead...</option>
          {interestedLeads.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {interestedLeads.length === 0 && (
        <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm mb-4">
          No interested leads yet. Mark leads as "Interested" from the Calls tab first.
        </div>
      )}

      {selected && (
        <div className="mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
            <div className="font-medium text-gray-900">{selected.name}</div>
            <div className="text-xs text-gray-500 mt-1">{selected.email} · {selected.type}</div>
          </div>
          <button
            onClick={generateEmail}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Follow-up Email"}
          </button>
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
            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-72 leading-relaxed"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { updateStatus(selected!.id, "sent-email"); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Mark as Email Sent ✓
            </button>
            <button
              onClick={generateEmail}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}