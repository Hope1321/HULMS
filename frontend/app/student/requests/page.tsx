"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Send,
  Plus,
  Eye,
  X as XIcon,
  FlaskConical,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ── Types ── */
interface Chemical { id: string; name: string; casNumber?: string; hazardLevel: string; }
interface Unit     { id: string; name: string; symbol: string; }

interface RequestItem {
  id: string;
  requestedQty: number;
  approvedQty: number | null;
  chemical: Chemical;
  unit: Unit;
}

interface Approval {
  id: string;
  status: string;
  createdAt: string;
  approvedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

interface ChemicalRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requiredDate: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED";
  notes: string | null;
  createdAt: string;
  items: RequestItem[];
  approvals: Approval[];
}

/* ── Status config ── */
const STATUS: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   badge: "bg-amber-100  text-amber-700  border border-amber-200",  icon: <Clock       className="h-3.5 w-3.5" /> },
  APPROVED:  { label: "Approved",  badge: "bg-green-100  text-green-700  border border-green-200",  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  REJECTED:  { label: "Rejected",  badge: "bg-red-100    text-red-700    border border-red-200",    icon: <XCircle     className="h-3.5 w-3.5" /> },
  CANCELLED: { label: "Cancelled", badge: "bg-gray-100   text-gray-600   border border-gray-200",   icon: <Ban         className="h-3.5 w-3.5" /> },
  ISSUED:    { label: "Issued",    badge: "bg-blue-100   text-blue-700   border border-blue-200",   icon: <Send        className="h-3.5 w-3.5" /> },
};

const HAZARD_COLORS: Record<string, string> = {
  LOW:     "bg-green-100  text-green-700",
  MEDIUM:  "bg-yellow-100 text-yellow-700",
  HIGH:    "bg-orange-100 text-orange-700",
  EXTREME: "bg-red-100    text-red-700",
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? {
    label: status,
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    icon: null,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function MyRequestsPage() {
  const [requests,     setRequests]     = useState<ChemicalRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* expanded detail row */
  const [expanded, setExpanded] = useState<string | null>(null);

  /* cancel modal */
  const [cancelTarget,  setCancelTarget]  = useState<ChemicalRequest | null>(null);
  const [cancelError,   setCancelError]   = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  /* ── fetch ── */
  const fetchRequests = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res    = await fetch(`${API}/chemical-requests/my`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load requests");
      setRequests(result.data ?? []);
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
      const res    = await fetch(`${API}/chemical-requests/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setRequests(prev =>
        prev.map(r => r.id === cancelTarget.id ? { ...r, status: "CANCELLED" } : r)
      );
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally { setCancelLoading(false); }
  };

  /* ── filter ── */
  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.requestNumber.toLowerCase().includes(q) ||
       r.purpose.toLowerCase().includes(q)) &&
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
              <button
                onClick={() => { setCancelTarget(null); setCancelError(""); }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Cancel Request</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to cancel{" "}
              <span className="font-semibold text-gray-900">{cancelTarget.requestNumber}</span>?
              This action cannot be undone.
            </p>
            {cancelError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {cancelError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setCancelTarget(null); setCancelError(""); }}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
            <p className="text-sm text-gray-500">Track all your chemical requests</p>
          </div>
        </div>
        <Link
          href="/student/requests/create"
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Total",     value: requests.length,   color: "text-gray-900",  bg: "bg-gray-50",   icon: <ClipboardList className="h-5 w-5 text-gray-400"  /> },
          { label: "Pending",   value: count("PENDING"),  color: "text-amber-700", bg: "bg-amber-50",  icon: <Clock         className="h-5 w-5 text-amber-400" /> },
          { label: "Approved",  value: count("APPROVED"), color: "text-green-700", bg: "bg-green-50",  icon: <CheckCircle   className="h-5 w-5 text-green-400" /> },
          { label: "Rejected",  value: count("REJECTED"), color: "text-red-700",   bg: "bg-red-50",    icon: <XCircle       className="h-5 w-5 text-red-400"   /> },
          { label: "Issued",    value: count("ISSUED"),   color: "text-blue-700",  bg: "bg-blue-50",   icon: <Send          className="h-5 w-5 text-blue-400"  /> },
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
            <input
              type="text"
              placeholder="Request number or purpose…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
            >
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

      {/* ── List ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
          <p className="mt-4 text-sm text-gray-500">Loading your requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No requests found</p>
          <p className="mt-1 text-xs text-gray-400">
            {requests.length === 0
              ? "You haven't submitted any requests yet."
              : "Try adjusting your search or filter."}
          </p>
          {requests.length === 0 && (
            <Link
              href="/student/requests/create"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" /> Create Your First Request
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isExpanded = expanded === req.id;
            return (
              <div
                key={req.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition"
              >
                {/* ── Card row ── */}
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: number + purpose */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{req.requestNumber}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-600" title={req.purpose}>
                      {req.purpose}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                      <span>Submitted: {fmt(req.createdAt)}</span>
                      {req.requiredDate && <span>Required by: {fmt(req.requiredDate)}</span>}
                      <span>{req.items.length} item{req.items.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : req.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {isExpanded ? "Hide" : "Details"}
                    </button>
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => { setCancelError(""); setCancelTarget(req); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Expandable detail panel ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {/* Chemical items */}
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Chemical Items
                    </p>
                    <div className="space-y-2">
                      {req.items.map(item => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-800">{item.chemical.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD_COLORS[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                              {item.chemical.hazardLevel}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Requested: <strong>{item.requestedQty} {item.unit.symbol}</strong></span>
                            {item.approvedQty !== null && (
                              <span className="text-green-700">
                                Approved: <strong>{item.approvedQty} {item.unit.symbol}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Approval info */}
                    {req.approvals.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Approval
                        </p>
                        {req.approvals.map(a => (
                          <div key={a.id} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-gray-800">
                                {a.approvedBy
                                  ? `${a.approvedBy.firstName} ${a.approvedBy.lastName}`
                                  : "System"}
                              </span>
                              <StatusBadge status={a.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-gray-400">{fmt(a.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {req.notes && (
                      <div className="mt-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                        <p className="text-sm text-gray-600">{req.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="mt-5 text-center text-sm text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{requests.length}</span> requests
        </p>
      )}
    </div>
  );
}
