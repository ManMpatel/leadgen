import { useState } from "react";
import type { Lead } from "../App";

interface Props {
  apiKey: string;
  leads: Lead[];
  addLead: (biz: Lead) => void;
}

const QUICK_SEARCHES = [
  "warehouse Sydney",
  "logistics company Parramatta",
  "storage facility Western Sydney",
  "freight company Sydney",
  "cold storage NSW",
  "manufacturing company Blacktown",
];

export default function SearchTab({ apiKey, leads, addLead }: Props) {
  const [query, setQuery] = useState("warehouse logistics Sydney");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [log, setLog] = useState("");

  const search = async () => {
    if (!apiKey) { setError("Please enter your Gemini API key first."); return; }
    setLoading(true);
    setError("");
    setResults([]);
    setLog("Searching with Gemini...");

    const prompt = `Search for real businesses matching: "${query}" in Sydney, Australia.

Find 10-15 actual businesses. Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "name": "Business Name Pty Ltd",
    "type": "Warehouse / Logistics",
    "phone": "02 9XXX XXXX",
    "email": "info@business.com.au",
    "address": "123 Street, Suburb NSW 2000",
    "website": "www.business.com.au or none",
    "notes": "One sentence about what they do"
  }
]

Focus on real phone numbers and emails. If email not found put "not found". If website not found put "none".`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.1 }
          })
        }
      );

      const data = await res.json();
      if (data.error) { setError("API Error: " + data.error.message); setLoading(false); return; }

      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");

      if (start === -1) { setError("Could not parse results. Try again."); setLoading(false); return; }

      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      const withIds = parsed.map((b: any, i: number) => ({ ...b, id: Date.now() + i, status: "new" as const }));
      setResults(withIds);
      setLog(`Found ${withIds.length} businesses`);
    } catch (e: any) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="warehouse logistics Sydney Parramatta..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {QUICK_SEARCHES.map(q => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600"
          >
            {q}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-3">{error}</div>}
      {log && !error && <div className="text-xs text-gray-400 mb-3">{log}</div>}

      <div className="space-y-2">
        {results.map(biz => (
          <div key={biz.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">{biz.name}</div>
                <div className="text-xs text-gray-500 mb-2">{biz.type} · {biz.address}</div>
                <div className="flex gap-4 text-xs">
                  {biz.phone !== "not found" && <span className="text-blue-600">📞 {biz.phone}</span>}
                  {biz.email !== "not found" && <span className="text-green-600">✉ {biz.email}</span>}
                  {biz.website && biz.website !== "none" && <span className="text-gray-400">🌐 {biz.website}</span>}
                </div>
                {biz.notes && <div className="text-xs text-gray-400 mt-1">{biz.notes}</div>}
              </div>
              <button
                onClick={() => addLead(biz)}
                disabled={leads.some(l => l.name === biz.name)}
                className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {leads.some(l => l.name === biz.name) ? "Added ✓" : "+ Add Lead"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}