"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, CheckCircle, Ban, Plus, Eye, X as XIcon, Package } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User     { id: string; firstName: string; lastName: string; email: string; }
interface Chemical { id: string; name: string; hazardLevel: string; }
interface Unit     { id: string; name: string; symbol: string; }
interface StorageLocation { id: string; name: string; building?: string; room?: string; }

interface Batch {
  id: string;
  batchNumber: string;
  chemical: Chemical;
  unit: Unit;
  storageLocation: StorageLocation;
}

interface Request {
  id: string;
  requestNumber: string;
  purpose: string;
}

interface Issuance {
  id: string;
  issuanceNumber: string;
  quantity: number;
  status: "ISSUED" | "CANCELLED";
  issuedAt: string;
  notes: string | null;
  request: Request;
  batch: Batch;
  issuedTo: User;
  issuedBy: User;
}

const STATUS_CFG = {
  ISSUED:    { badge: "bg-blue-100 text-blue-700 border border-blue-200",   icon: <Send      className="h-3.5 w-3.5" /> },
  CANCELLED: { badge: "bg-gray-100 text-gray-600 border border-gray-200",   icon: <Ban       className="h-3.5 w-3.5" /> },
};

const HAZARD_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

function StatusBadge({ status }: { status: "ISSUED" | "CANCELLED" }) {
  const s = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>
      {s.icon}{status}
    </span>
  );
}

export default function IssuancesPage() {
  const [issuances,    setIssuances]    = useState<Issuance[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* cancel modal */
  const [cancelTarget,  setCancelTarget]  = useState<Issuance | null>(null);
  const [cancelNotes,   setCancelNotes]   = useState("");
  const [cancelError,   setCancelError]   = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  /* ── fetch ── */
  const fetchIssuances = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/chemical-issuances`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load issuances");
      setIssuances(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issuances");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchIssuances(); }, []);

  /* ── cancel ── */
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelError(""); setCancelLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chemical-issuances/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: cancelNotes.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setIssuances(prev => prev.map(i => i.id === cancelTarget.id ? { ...i, status: "CANCELLED" } : i));
      setCancelTarget(null); setCancelNotes("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally { setCancelLoading(false); }
  };

  /* ── filter ── */
  const filtered = issuances.filter(i => {
    const q = search.toLowerCase();
    return (
      (i.issuanceNumber.toLowerCase().includes(q) ||
       i.batch.chemical.name.toLowerCase().includes(q) ||
       i.request.requestNumber.toLowerCase().includes(q) ||
       `${i.issuedTo.firstName} ${i.issuedTo.lastName}`.toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || i.status === statusFilter)
    );
  });

  const count = (s: string) => issuances.filter(i => i.status === s).length;

  return (
    <div>
      {/* ── Cancel Modal ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <button onClick={() => { setCancelTarget(null); setCancelError(""); setCancelNotes(""); }}
                className="rounded-lg p-1 hover:bg-gray-100">
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Cancel Issuance</h2>
            <p className="mt-2 text-sm text-gray-600">
              Cancel <span className="font-semibold text-gray-900">{cancelTarget.issuanceNumber}</span>?
              The issued quantity will be returned to the batch stock.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea rows={3} value={cancelNotes} onChange={e => setCancelNotes(e.target.value)}
                placeholder="Reason for cancellation…"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            {cancelError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{cancelError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setCancelTarget(null); setCancelError(""); setCancelNotes(""); }}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Keep
              </button>
              <button onClick={confirmCancel} disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chemical Issuances</h1>
            <p className="text-sm text-gray-500">Track and manage chemical stock issuances</p>
          </div>
        </div>
        <Link href="/admin/dashboard/issuances/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Issuance
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Issuances", value: issuances.length,   color: "text-gray-900",  bg: "bg-gray-50",  icon: <Package   className="h-5 w-5 text-gray-400"  /> },
          { label: "Issued",          value: count("ISSUED"),     color: "text-blue-700",  bg: "bg-blue-50",  icon: <Send      className="h-5 w-5 text-blue-400"  /> },
          { label: "Cancelled",       value: count("CANCELLED"),  color: "text-gray-600",  bg: "bg-gray-50",  icon: <Ban       className="h-5 w-5 text-gray-400"  /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <div className={`rounded-lg p-1.5 ${s.bg}`}>{s.icon}</div>
            </div>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
            <input type="text" placeholder="Issuance #, chemical, request #, or recipient…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Loading issuances…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Send className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No issuances found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Issuance #", "Chemical", "Quantity", "Batch", "Request", "Issued To", "Date", "Status", "Actions"].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(iss => (
                  <tr key={iss.id} className="group transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{iss.issuanceNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{iss.batch.chemical.name}</p>
                      <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD_COLORS[iss.batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                        {iss.batch.chemical.hazardLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{iss.quantity} <span className="font-normal text-gray-500">{iss.batch.unit.symbol}</span></p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{iss.batch.batchNumber}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{iss.request.requestNumber}</p>
                      <p className="mt-0.5 max-w-[140px] truncate text-xs text-gray-400" title={iss.request.purpose}>{iss.request.purpose}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-800">{iss.issuedTo.firstName} {iss.issuedTo.lastName}</p>
                      <p className="text-xs text-gray-400">{iss.issuedTo.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{fmt(iss.issuedAt)}</td>
                    <td className="px-5 py-4"><StatusBadge status={iss.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/dashboard/issuances/${iss.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                        {iss.status === "ISSUED" && (
                          <button onClick={() => { setCancelError(""); setCancelNotes(""); setCancelTarget(iss); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
                            <XIcon className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3.5 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{issuances.length}</span> issuances
          </div>
        </div>
      )}
    </div>
  );
}
