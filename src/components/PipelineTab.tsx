import type { Lead, LeadStatus } from "../App";

interface Props {
  leads: Lead[];
  updateStatus: (id: number, status: LeadStatus) => void;
  setSelectedLead: (lead: Lead) => void;
}

const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
  called: { bg: "bg-amber-100", text: "text-amber-700", label: "Called" },
  interested: { bg: "bg-green-100", text: "text-green-700", label: "Interested" },
  "sent-email": { bg: "bg-purple-100", text: "text-purple-700", label: "Email Sent" },
  closed: { bg: "bg-teal-100", text: "text-teal-700", label: "Closed" },
  "not-interested": { bg: "bg-gray-100", text: "text-gray-500", label: "Not Interested" },
};

export default function PipelineTab({ leads, updateStatus, setSelectedLead }: Props) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No leads yet. Search for businesses and add them.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(STATUS_COLORS).map(([k, v]) => (
          <span key={k} className={`text-xs px-2 py-1 rounded-full ${v.bg} ${v.text}`}>
            {leads.filter(l => l.status === k).length} {v.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {leads.map(lead => (
          <div key={lead.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{lead.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status].bg} ${STATUS_COLORS[lead.status].text}`}>
                    {STATUS_COLORS[lead.status].label}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{lead.phone} · {lead.email}</div>
              </div>
              <div className="flex gap-2 items-center ml-4">
                <select
                  value={lead.status}
                  onChange={e => updateStatus(lead.id, e.target.value as LeadStatus)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none"
                >
                  {Object.entries(STATUS_COLORS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  Draft Email
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}