import { useState } from "react";
import DashboardTab from "./components/DashboardTab";
import SearchTab from "./components/SearchTab";
import PipelineTab from "./components/PipelineTab";
import CallsTab from "./components/CallsTab";
import InterestedTab from "./components/InterestedTab";
import SuccessTab from "./components/SuccessTab";

const TABS = ["Dashboard", "Search", "Pipeline", "Calls", "Interested", "Success"] as const;
type Tab = typeof TABS[number];

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("leadgen_tab") as Tab | null;
    return TABS.includes(saved as Tab) ? (saved as Tab) : "Dashboard";
  });

  const goToTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem("leadgen_tab", t);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">LeadGen CRM</h1>
          <p className="text-sm text-gray-500">
            Sydney warehouse & logistics · 4 calls/day · $99/mo custom software
          </p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 flex-wrap">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => goToTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Dashboard" && <DashboardTab onNavigate={goToTab} />}
        {tab === "Search" && <SearchTab />}
        {tab === "Pipeline" && (
          <PipelineTab onDraftEmail={() => goToTab("Interested")} />
        )}
        {tab === "Calls" && <CallsTab />}
        {tab === "Interested" && <InterestedTab />}
        {tab === "Success" && <SuccessTab />}
      </div>
    </div>
  );
}
