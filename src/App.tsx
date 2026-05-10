import { useState, useEffect } from "react";
import SearchTab from "./components/SearchTab";
import PipelineTab from "./components/PipelineTab";
import CallsTab from "./components/CallsTab";
import EmailsTab from "./components/EmailsTab";

export type LeadStatus = "new" | "called" | "interested" | "sent-email" | "closed" | "not-interested";

export interface Lead {
  id: number;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  notes: string;
  status: LeadStatus;
  addedAt: string;
}

const TABS = ["Search", "Pipeline", "Calls", "Emails"];

export default function App() {
  const [tab, setTab] = useState("Search");
  const [apiKey, setApiKey] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const savedLeads = localStorage.getItem("leadgen_leads");
    const savedKey = localStorage.getItem("leadgen_apikey");
    if (savedLeads) setLeads(JSON.parse(savedLeads));
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated);
    localStorage.setItem("leadgen_leads", JSON.stringify(updated));
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("leadgen_apikey", key);
  };

  const addLead = (biz: Lead) => {
    if (leads.find(l => l.name === biz.name)) return;
    saveLeads([...leads, { ...biz, addedAt: new Date().toISOString(), status: "new" }]);
  };

  const updateStatus = (id: number, status: LeadStatus) => {
    saveLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">LeadGen CRM</h1>
          <p className="text-sm text-gray-500">Find warehouse businesses · Call 4/day · Close with $99/mo software</p>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-gray-500 mb-1">Gemini API Key</label>
          <input
            type="password"
            placeholder="Paste your Gemini API key..."
            value={apiKey}
            onChange={e => saveApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
              {t === "Pipeline" && leads.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{leads.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "Search" && <SearchTab apiKey={apiKey} leads={leads} addLead={addLead} />}
        {tab === "Pipeline" && <PipelineTab leads={leads} updateStatus={updateStatus} setSelectedLead={(l: Lead) => { setSelectedLead(l); setTab("Emails"); }} />}
        {tab === "Calls" && <CallsTab leads={leads} updateStatus={updateStatus} />}
        {tab === "Emails" && <EmailsTab apiKey={apiKey} leads={leads} selectedLead={selectedLead} updateStatus={updateStatus} />}
      </div>
    </div>
  );
}