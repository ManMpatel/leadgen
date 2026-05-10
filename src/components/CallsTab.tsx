import { useState, useEffect } from "react";
import type { Lead, LeadStatus } from "../App";

interface Props {
  leads: Lead[];
  updateStatus: (id: number, status: LeadStatus) => void;
}

export default function CallsTab({ leads, updateStatus }: Props) {
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("leadgen_notes");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  const saveNote = (id: number, note: string) => {
    const updated = { ...notes, [id]: note };
    setNotes(updated);
    localStorage.setItem("leadgen_notes", JSON.stringify(updated));
  };

  const todaysCalls = leads.filter(l => l.status !== "not-interested" && l.status !== "closed").slice(0, 4);

  if (todaysCalls.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No active leads. Add leads from the Search tab.
      </div>
    );
  }

  return (
    <div>
      <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
        Your 4 calls for today — work through this list one by one.
      </div>

      <div className="space-y-3">
        {todaysCalls.map((lead, i) => (
          <div key={lead.id} className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-blue-500">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">{lead.name}</div>
                <div className="text-blue-600 text-sm mb-1">📞 {lead.phone}</div>
                <div className="text-xs text-gray-400 mb-3">{lead.email} · {lead.address}</div>

                <textarea
                  placeholder="Call notes — what did they say?"
                  value={notes[lead.id] || ""}
                  onChange={e => saveNote(lead.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                />

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => updateStatus(lead.id, "interested")}
                    className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
                  >
                    ✓ Interested
                  </button>
                  <button
                    onClick={() => updateStatus(lead.id, "called")}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100"
                  >
                    Called / No answer
                  </button>
                  <button
                    onClick={() => updateStatus(lead.id, "not-interested")}
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