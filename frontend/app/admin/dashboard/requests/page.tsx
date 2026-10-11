"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle, XCircle,
  Ban, Send, Plus, Eye, X as XIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User     { id: string; firstName: string; lastName: string; email: string; }
interface Chemical { id: string; name: string; }
interface Unit     { id: string; name: string; symbol: string; }

interface RequestItem {
  id: string;
  requestedQty: number;
  approvedQty: number | null;
  chemical: Chemical;
  unit: Unit;
}

interface ChemicalRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requiredDate: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED";
  notes: string | null;
  createdAt: string;
  requestedBy: User;
  items: RequestItem[];
}

/* ── status config ── */
const STATUS: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   badge: "bg-amber-100  text-amber-700  border border-amber-200",  icon: <Clock      className="h-3.5 w-3.5" /> },
  APPROVED:  { label: "Approved",  badge: "bg-green-100  text-green-700  border border-green-200",  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  REJECTED:  { label: "Rejected",  badge: "bg-red-100    text-red-700    border border-red-200",    icon: <XCircle    className="h-3.5 w-3.5" /> },
  CANCELLED: { label: "Cancelled", badge: "bg-gray-100   text-gray-600   border border-gray-200",   icon: <Ban        className="h-3.5 w-3.5" /> },
  ISSUED:    { label: "Issued",    badge: "bg-blue-100   text-blue-700   border border-blue-200",   icon: <Send       className="h-3.5 w-3.5" /> },
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, badge: "bg-gray-100 text-gray-600 border border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function RequestsPage() {
  const [requests,     setRequests]     = useState<ChemicalRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [cancelTarget,  setCancelTarget]  = useState<ChemicalRequest | null>(null);
  const [cancelError,   setCancelError]   = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  /* ── fetch ── */
  const fetchRequests = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/chemical-requests`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load requests");
      setRequests(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  /* ── cancel ── */
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelError(""); setCancelLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chemical-requests/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setRequests(prev => prev.map(r =>
        r.id === cancelTarget.id ? { ...r, status: "CANCELLED" } : r
      ));
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally { setCancelLoading(false); }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.requestNumber.toLowerCase().includes(q) ||
       r.purpose.toLowerCase().includes(q) ||
       `${r.requestedBy.firstName} ${r.requestedBy.lastName}`.toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || r.status === statusFilter)
    );
  });

  const count = (s: string) => requests.filter(r => r.status === s).length;

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
              <button onClick={() => { setCancelTarget(null); setCancelError(""); }}
                className="rounded-lg p-1 hover:bg-gray-100">
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Cancel Request</h2>
            <p className="mt-2 text-sm text-gray-600">
              Cancel{" "}
              <span className="font-semibold text-gray-900">{cancelTarget.requestNumber}</span>?
              This action cannot be undone.
            </p>
            {cancelError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{cancelError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setCancelTarget(null); setCancelError(""); }} disabled={cancelLoading}
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

      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chemical Requests</h1>
            <p className="text-sm text-gray-500">Manage and review laboratory chemical requests</p>
          </div>
        </div>
        <Link href="/admin/dashboard/requests/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Total",     value: requests.length,    color: "text-gray-900",    bg: "bg-gray-50",   icon: <ClipboardList className="h-5 w-5 text-gray-400" /> },
          { label: "Pending",   value: count("PENDING"),   color: "text-amber-700",   bg: "bg-amber-50",  icon: <Clock className="h-5 w-5 text-amber-400" /> },
          { label: "Approved",  value: count("APPROVED"),  color: "text-green-700",   bg: "bg-green-50",  icon: <CheckCircle className="h-5 w-5 text-green-400" /> },
          { label: "Rejected",  value: count("REJECTED"),  color: "text-red-700",     bg: "bg-red-50",    icon: <XCircle className="h-5 w-5 text-red-400" /> },
          { label: "Issued",    value: count("ISSUED"),    color: "text-blue-700",    bg: "bg-blue-50",   icon: <Send className="h-5 w-5 text-blue-400" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
            <input type="text" placeholder="Request number, purpose, or requester name…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Filter by Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS).map(([v, s]) => (
                <option key={v} value={v}>{s.label}</option>
              ))}
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
          <p className="mt-4 text-sm text-gray-500">Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No requests found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Request", "Purpose", "Requested By", "Items", "Required By", "Status", "Actions"].map(h => (
                    <th key={h} className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(req => (
                  <tr key={req.id} className="group transition hover:bg-gray-50">
                    {/* Request # */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{req.requestNumber}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{fmt(req.createdAt)}</p>
                    </td>
                    {/* Purpose */}
                    <td className="max-w-[200px] px-6 py-4">
                      <p className="truncate text-sm text-gray-700" title={req.purpose}>{req.purpose}</p>
                    </td>
                    {/* Requested By */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {req.requestedBy.firstName} {req.requestedBy.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{req.requestedBy.email}</p>
                    </td>
                    {/* Items */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {req.items.length} item{req.items.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    {/* Required By */}
                    <td className="px-6 py-4 text-sm text-gray-600">{fmt(req.requiredDate)}</td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/dashboard/requests/${req.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 group-hover:border-gray-400">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => { setCancelError(""); setCancelTarget(req); }}
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
            <span className="font-semibold text-gray-700">{requests.length}</span> requests
          </div>
        </div>
      )}
    </div>
  );
}
