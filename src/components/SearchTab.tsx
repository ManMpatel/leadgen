import { useState, useEffect } from "react";
import { api } from "../api";
import type { Lead, Search } from "../types";

const QUICK_SEARCHES = [
  "wholesalers Wetherill Park NSW",
  "importers Smithfield NSW",
  "distributors Bankstown NSW",
  "suppliers Villawood NSW",
  "wholesaler Ingleburn NSW",
  "distributor Minto NSW",
  "warehouse St Marys NSW",
];

const SYDNEY_SUBURBS = [
  "Wetherill Park", "Smithfield", "Bankstown", "Villawood", "Ingleburn",
  "Minto", "St Marys", "Arndell Park", "Parramatta", "Prestons",
  "Moorebank", "Liverpool", "Chullora", "Greenacre", "Campbelltown",
  "Smeaton Grange", "Narellan", "Seven Hills", "Blacktown", "Eastern Creek",
  "Rydalmere", "Auburn", "Lidcombe", "Alexandria", "Botany",
];

function extractSuburb(query: string): string {
  const found = SYDNEY_SUBURBS.find(s => query.toLowerCase().includes(s.toLowerCase()));
  return found ?? "";
}

const CACHE_KEY = "leadgen_search_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function SearchTab() {
  const [query, setQuery] = useState("warehouse logistics Sydney");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [results, setResults] = useState<Partial<Lead>[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [log, setLog] = useState("");
  const [searches, setSearches] = useState<Search[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [industry, setIndustry] = useState<'car-rental' | 'cabinet-maker' | 'warehouse'>('warehouse');
  const [leadCount, setLeadCount] = useState(10);
  const [selectedSuburb, setSelectedSuburb] = useState("");

  useEffect(() => {
    api.searches.list().then(setSearches).catch(() => {});
  }, []);

  // Restore last search results from localStorage on mount (24h TTL)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as {
        query: string;
        results: Partial<Lead>[];
        addedIds: string[];
        savedAt: number;
      };
      if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
        localStorage.removeItem(CACHE_KEY);
        return;
      }
      setQuery(cached.query);
      setResults(cached.results);
      setAddedIds(new Set(cached.addedIds));
      const minsAgo = Math.round((Date.now() - cached.savedAt) / 60000);
      setLog(`Restored ${cached.results.length} results from ${minsAgo} min ago`);
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  }, []);

  // Save results to localStorage whenever they change
  useEffect(() => {
    if (results.length === 0) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        query,
        results,
        addedIds: Array.from(addedIds),
        savedAt: Date.now(),
      }));
    } catch {
      // localStorage full or unavailable
    }
  }, [results, query, addedIds]);

  const runSearch = async (q: string) => {
    setLoading(true);
    setError("");
    setResults([]);
    setAddedIds(new Set());
    setAddedNames(new Set());
    setLog("Searching on internet...");
    try {
      const { leads } = await api.gemini.search(q, leadCount, industry);
      setResults(leads);
      setLog(`Found ${leads.length} businesses`);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  };

  const addLead = async (biz: Partial<Lead>) => {
    try {
      const result = await api.leads.bulk([biz], query);
      setAddedIds(prev => {
        const next = new Set(prev);
        result.leadIds.forEach(id => next.add(id));
        return next;
      });
      setResults(prev => prev.filter(b => b.name !== biz.name));
      setAddedNames(prev => {
        const next = new Set(prev);
        next.add(biz.name || "");
        return next;
      });
      const savedSearch = await api.searches.create({
        query,
        resultCount: results.length,
        leadIds: result.leadIds,
      });
      setSearches(prev => [savedSearch, ...prev.filter(s => s._id !== savedSearch._id)]);
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const generateTodaysLeads = async () => {
    if (searches.length === 0) {
      setError("No saved searches yet. Run a search first.");
      return;
    }
    setBulkLoading(true);
    setError("");
    setLog("Running all saved searches...");
    const allLeads: Partial<Lead>[] = [];
    const uniqueQueries = [...new Set(searches.map(s => s.query))];
    for (const q of uniqueQueries.slice(0, 6)) {
      try {
        const { leads } = await api.gemini.search(q, leadCount, industry);
        allLeads.push(...leads.map(l => ({ ...l, sourceQuery: q })));
      } catch {
        // skip failed searches
      }
    }
    if (allLeads.length > 0) {
      try {
        const result = await api.leads.bulk(allLeads, "today's batch");
        setLog(`Done — ${result.inserted} new, ${result.updated} already known, ${result.flagged} flagged`);
        setResults(allLeads);
        setAddedIds(new Set(result.leadIds));
      } catch (e: unknown) {
        setError(String(e));
      }
    } else {
      setLog("No results returned from searches.");
    }
    setBulkLoading(false);
  };

  const loadHistorySearch = async (s: Search) => {
    setHistoryOpen(false);
    setLog(`Loading search: "${s.query}" (${new Date(s.runAt).toLocaleDateString()})`);
    setResults([]);
    setError("");
    setLoading(true);
    try {
      const { leads } = await api.gemini.search(s.query);
      setResults(leads);
      setQuery(s.query);
      setLog(`Reloaded "${s.query}" — ${leads.length} results`);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  };

  const isAdded = (biz: Partial<Lead>) =>
    addedNames.has(biz.name || "");

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && runSearch(query)}
          placeholder="warehouse logistics Sydney Parramatta..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => runSearch(query)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Leads:</span>
        {[1, 3, 5, 10, 20].map(n => (
          <button
            key={n}
            onClick={() => setLeadCount(n)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              leadCount === n
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-gray-500 font-medium">Industry:</span>
        {([
          { id: 'car-rental', label: '🚗 Car Rental' },
          { id: 'cabinet-maker', label: '🪚 Cabinet Maker' },
          { id: 'warehouse', label: '📦 Warehouse' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setIndustry(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              industry === id
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={generateTodaysLeads}
          disabled={bulkLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {bulkLoading ? "Generating..." : "Generate today's leads"}
        </button>

        <div className="relative">
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            History {searches.length > 0 ? `(${searches.length})` : ""}
          </button>
          {historyOpen && (
            <div className="absolute top-full mt-1 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-72 max-h-64 overflow-y-auto">
              {searches.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No searches yet</div>
              ) : (
                searches.map(s => (
                  <button
                    key={s._id}
                    onClick={() => loadHistorySearch(s)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-800">{s.query}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(s.runAt).toLocaleDateString()} · {s.resultCount} results
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suburb picker */}
<div className="mb-4">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">📍 Suburb</span>
    {selectedSuburb && (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
        {selectedSuburb}
        <button
          onClick={() => { setSelectedSuburb(""); setQuery(q => q.replace(/ NSW.*/, "").trim()); }}
          className="ml-1 text-blue-400 hover:text-blue-700"
        >✕</button>
      </span>
    )}
  </div>
  <div className="flex gap-1.5 flex-wrap">
    {SYDNEY_SUBURBS.map(s => (
      <button
        key={s}
        onClick={() => {
          setSelectedSuburb(s);
          setQuery(`warehouse logistics ${s} NSW`);
        }}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
          selectedSuburb === s
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
        }`}
      >
        {s}
      </button>
    ))}
  </div>
</div>

{/* Suburb stats from history */}
{searches.length > 0 && (() => {
  const stats = searches.reduce((acc, s) => {
    const sub = extractSuburb(s.query);
    if (!sub) return acc;
    if (!acc[sub]) acc[sub] = { searches: 0, leads: 0, last: s.runAt };
    acc[sub].searches++;
    acc[sub].leads += s.resultCount ?? 0;
    if (new Date(s.runAt) > new Date(acc[sub].last)) acc[sub].last = s.runAt;
    return acc;
  }, {} as Record<string, { searches: number; leads: number; last: string }>);

  const rows = Object.entries(stats).sort((a, b) => b[1].leads - a[1].leads);
  const untouched = SYDNEY_SUBURBS.filter(s => !stats[s]).slice(0, 6);

  if (rows.length === 0) return null;
  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📊 Suburb Activity</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {rows.map(([sub, data]) => (
          <button
            key={sub}
            onClick={() => { setSelectedSuburb(sub); setQuery(`warehouse logistics ${sub} NSW`); }}
            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-xs font-medium text-gray-700">📍 {sub}</span>
            <span className="text-xs text-blue-600 font-bold">{data.leads}</span>
            <span className="text-xs text-gray-400">leads · {data.searches}x</span>
            {data.leads > 3 && <span className="text-xs">🔥</span>}
          </button>
        ))}
      </div>
      {untouched.length > 0 && (
        <>
          <div className="text-xs font-medium text-gray-400 mb-1.5">🎯 Never searched yet:</div>
          <div className="flex flex-wrap gap-1.5">
            {untouched.map(s => (
              <button
                key={s}
                onClick={() => { setSelectedSuburb(s); setQuery(`warehouse logistics ${s} NSW`); }}
                className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
})()}

{/* Original quick searches */}
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
        {results.map((biz, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1">{biz.name}</div>
                <div className="text-xs text-gray-500 mb-2">
                  {biz.type} · {biz.address}
                </div>
                <div className="flex gap-4 text-xs flex-wrap">
                  {biz.phone && biz.phone !== "not found" && (
                    <a href={`tel:${biz.phone}`} className="text-blue-600 hover:underline">
                      📞 {biz.phone}
                    </a>
                  )}
                  {biz.email && biz.email !== "not found" && (
                    <span className="text-green-600">✉ {biz.email}</span>
                  )}
                  {biz.website && biz.website !== "none" && (
                    <span className="text-gray-400">🌐 {biz.website}</span>
                  )}
                </div>
                {biz.notes && (
                  <div className="text-xs text-gray-400 mt-1">{biz.notes}</div>
                )}
              </div>
              <button
                onClick={() => addLead(biz)}
                disabled={isAdded(biz)}
                className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isAdded(biz) ? "Added ✓" : "+ Add Lead"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
