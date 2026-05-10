import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Lead, Subscriber } from "../types";

interface CloseModal {
  lead: Lead;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SuccessTab() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pipelineLeads, setPipelineLeads] = useState<Lead[]>([]);
  const [modal, setModal] = useState<CloseModal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal form state
  const [form, setForm] = useState({
    decisionMakerName: "",
    directEmail: "",
    directPhone: "",
    monthlyPrice: "99",
    startDate: new Date().toISOString().slice(0, 10),
    billingMethod: "bank-transfer",
    firstPaymentReceived: false,
    closingNotes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, leads] = await Promise.all([
        api.subscribers.list(),
        api.leads.list({ status: "interested" }),
      ]);
      setSubscribers(subs);
      // Also load called leads for deal closing
      const calledLeads = await api.leads.list({ status: "called" });
      setPipelineLeads([...leads, ...calledLeads]);
    } catch (e: unknown) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (lead: Lead) => {
    setModal({ lead });
    setForm({
      decisionMakerName: "",
      directEmail: lead.email ?? "",
      directPhone: lead.phone ?? "",
      monthlyPrice: "99",
      startDate: new Date().toISOString().slice(0, 10),
      billingMethod: "bank-transfer",
      firstPaymentReceived: false,
      closingNotes: "",
    });
  };

  const closeDeal = async () => {
    if (!modal) return;
    try {
      const sub = await api.subscribers.close(modal.lead._id, {
        ...form,
        monthlyPrice: Number(form.monthlyPrice),
      });
      setSubscribers(prev => [sub, ...prev]);
      setPipelineLeads(prev => prev.filter(l => l._id !== modal.lead._id));
      setModal(null);
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const togglePaid = async (sub: Subscriber, month: string, paid: boolean) => {
    try {
      const updated = await api.subscribers.update(sub._id, { paymentMonth: month, paid });
      setSubscribers(prev => prev.map(s => s._id === sub._id ? updated : s));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const churnSubscriber = async (sub: Subscriber) => {
    const reason = prompt("Reason for churning?");
    if (reason === null) return;
    try {
      const updated = await api.subscribers.update(sub._id, { status: "churned", churnReason: reason });
      setSubscribers(prev => prev.map(s => s._id === sub._id ? updated : s));
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const activeSubs = subscribers.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const thisMonth = currentMonth();

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>;

  return (
    <div>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{error}</div>}

      {/* MRR header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="text-sm text-gray-500 mb-1">Monthly Recurring Revenue</div>
        <div className="text-4xl font-bold text-gray-900">${mrr}/mo</div>
        <div className="text-sm text-gray-400 mt-1">
          {activeSubs.length} active subscriber{activeSubs.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Close deal section */}
      {pipelineLeads.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Close a deal</h2>
          <div className="space-y-2">
            {pipelineLeads.map(lead => (
              <div key={lead._id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                  <div className="text-xs text-gray-400">{lead.type} · {lead.status}</div>
                </div>
                <button
                  onClick={() => openModal(lead)}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
                >
                  Close deal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscribers list */}
      <h2 className="text-sm font-medium text-gray-700 mb-2">Subscribers</h2>
      {subscribers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No subscribers yet. Close your first deal above.</div>
      ) : (
        <div className="space-y-3">
          {subscribers.map(sub => {
            const thisMonthRecord = sub.paymentHistory.find(p => p.month === thisMonth);
            const isPaid = thisMonthRecord?.paid ?? false;
            return (
              <div
                key={sub._id}
                className={`bg-white border rounded-xl p-4 ${sub.status === "churned" ? "border-gray-200 opacity-60" : "border-gray-200"}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {sub.lead?.name ?? `Lead ${sub.leadId}`}
                      </span>
                      {sub.status === "active" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Active</span>
                      )}
                      {sub.status === "churned" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Churned</span>
                      )}
                      {sub.status === "paused" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Paused</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {sub.decisionMakerName} · ${sub.monthlyPrice}/mo · Started{" "}
                      {new Date(sub.startDate).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                    </div>
                    {sub.directEmail && (
                      <div className="text-xs text-gray-400 mt-0.5">{sub.directEmail}</div>
                    )}
                    {sub.churnReason && (
                      <div className="text-xs text-red-400 mt-1">Churned: {sub.churnReason}</div>
                    )}
                  </div>

                  <div className="flex gap-2 items-center ml-4">
                    {sub.status === "active" && (
                      <>
                        <button
                          onClick={() => togglePaid(sub, thisMonth, !isPaid)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            isPaid
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-white border-gray-200 text-gray-500 hover:border-green-300"
                          }`}
                        >
                          {isPaid ? "Paid ✓" : "Mark paid"}
                        </button>
                        <button
                          onClick={() => churnSubscriber(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          Churn
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Close deal modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Close deal</h2>
              <p className="text-sm text-gray-500 mb-4">{modal.lead.name}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Decision maker name *</label>
                  <input
                    value={form.decisionMakerName}
                    onChange={e => setForm(f => ({ ...f, decisionMakerName: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Direct email</label>
                    <input
                      value={form.directEmail}
                      onChange={e => setForm(f => ({ ...f, directEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Direct phone</label>
                    <input
                      value={form.directPhone}
                      onChange={e => setForm(f => ({ ...f, directPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monthly price ($)</label>
                    <input
                      type="number"
                      value={form.monthlyPrice}
                      onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Billing method</label>
                  <select
                    value={form.billingMethod}
                    onChange={e => setForm(f => ({ ...f, billingMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="bank-transfer">Bank transfer</option>
                    <option value="credit-card">Credit card</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Closing notes</label>
                  <textarea
                    value={form.closingNotes}
                    onChange={e => setForm(f => ({ ...f, closingNotes: e.target.value }))}
                    placeholder="How did the deal close? Any key details..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-16"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.firstPaymentReceived}
                    onChange={e => setForm(f => ({ ...f, firstPaymentReceived: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">First payment already received</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeDeal}
                  disabled={!form.decisionMakerName}
                  className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40"
                >
                  Save subscriber
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
