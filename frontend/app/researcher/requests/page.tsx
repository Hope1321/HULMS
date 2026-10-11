"use client";
// Researcher requests — same functionality as student requests but under /researcher
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle, XCircle, Ban, Send, Plus, Eye, X as XIcon, FlaskConical } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical { id: string; name: string; hazardLevel: string; }
interface Unit     { id: string; name: string; symbol: string; }
interface RequestItem { id: string; requestedQty: number; approvedQty: number | null; chemical: Chemical; unit: Unit; }
interface Approval { id: string; status: string; createdAt: string; approvedBy: { id: string; firstName: string; lastName: string; email: string } | null; }
interface ChemicalRequest {
  id: string; requestNumber: string; purpose: string; requiredDate: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED";
  notes: string | null; createdAt: string; items: RequestItem[]; approvals: Approval[];
}

const STATUS: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   badge: "bg-amber-100 text-amber-700 border border-amber-200",  icon: <Clock       className="h-3.5 w-3.5" /> },
  APPROVED:  { label: "Approved",  badge: "bg-green-100 text-green-700 border border-green-200",  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  REJECTED:  { label: "Rejected",  badge: "bg-red-100   text-red-700   border border-red-200",    icon: <XCircle     className="h-3.5 w-3.5" /> },
  CANCELLED: { label: "Cancelled", badge: "bg-gray-100  text-gray-600  border border-gray-200",   icon: <Ban         className="h-3.5 w-3.5" /> },
  ISSUED:    { label: "Issued",    badge: "bg-blue-100  text-blue-700  border border-blue-200",   icon: <Send        className="h-3.5 w-3.5" /> },
};
const HAZARD: Record<string, string> = { LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700", HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700" };
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, badge: "bg-gray-100 text-gray-600 border border-gray-200", icon: null };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>{s.icon}{s.label}</span>;
}

export default function ResearcherRequestsPage() {
  const [requests, setRequests] = useState<ChemicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ChemicalRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    fetch(`${API}/chemical-requests/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(res => { if (!res.success) throw new Error(res.message); setRequests(res.data ?? []); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelError(""); setCancelLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chemical-requests/${cancelTarget.id}/cancel`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      setRequests(prev => prev.map(r => r.id === cancelTarget.id ? { ...r, status: "CANCELLED" } : r));
      setCancelTarget(null);
    } catch (e) { setCancelError(e instanceof Error ? e.message : "Failed."); }
    finally { setCancelLoading(false); }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (r.requestNumber.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q)) && (statusFilter === "ALL" || r.status === statusFilter);
  });
  const count = (s: string) => requests.filter(r => r.status === s).length;

  return (
    <div>
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">Cancel Request</h2>
            <p className="mt-2 text-sm text-gray-600">Cancel <strong>{cancelTarget.requestNumber}</strong>? This cannot be undone.</p>
            {cancelError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{cancelError}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCancelTarget(null)} disabled={cancelLoading} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Keep</button>
              <button onClick={confirmCancel} disabled={cancelLoading} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{cancelLoading ? "Cancelling…" : "Yes, Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#7c3aed" }}>
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div><h1 className="text-2xl font-bold text-gray-900">Research Requests</h1><p className="text-sm text-gray-500">Track your laboratory chemical requests</p></div>
        </div>
        <Link href="/researcher/requests/create" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "#7c3aed" }}>
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Total", value: requests.length, color: "text-gray-900" },
          { label: "Pending", value: count("PENDING"), color: "text-amber-700" },
          { label: "Approved", value: count("APPROVED"), color: "text-green-700" },
          { label: "Rejected", value: count("REJECTED"), color: "text-red-700" },
          { label: "Issued", value: count("ISSUED"), color: "text-blue-700" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <input type="text" placeholder="Search by request # or purpose…" value={search} onChange={e => setSearch(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500">
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{requests.length === 0 ? "No requests yet." : "No results."}</p>
          {requests.length === 0 && <Link href="/researcher/requests/create" className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "#7c3aed" }}><Plus className="h-4 w-4" /> Create First Request</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isExpanded = expanded === req.id;
            return (
              <div key={req.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900">{req.requestNumber}</p><StatusBadge status={req.status} /></div>
                    <p className="mt-1 truncate text-sm text-gray-600">{req.purpose}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-400">
                      <span>Submitted: {fmt(req.createdAt)}</span>
                      {req.requiredDate && <span>Required: {fmt(req.requiredDate)}</span>}
                      <span>{req.items.length} item{req.items.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpanded(isExpanded ? null : req.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"><Eye className="h-3.5 w-3.5" />{isExpanded ? "Hide" : "Details"}</button>
                    {req.status === "PENDING" && <button onClick={() => setCancelTarget(req)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><XIcon className="h-3.5 w-3.5" /> Cancel</button>}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Chemical Items</p>
                    <div className="space-y-2">
                      {req.items.map(item => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
                          <div className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-gray-400" /><span className="font-medium text-gray-800">{item.chemical.name}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>{item.chemical.hazardLevel}</span></div>
                          <div className="flex items-center gap-4 text-xs text-gray-600"><span>Requested: <strong>{item.requestedQty} {item.unit.symbol}</strong></span>{item.approvedQty != null && <span className="text-green-700">Approved: <strong>{item.approvedQty} {item.unit.symbol}</strong></span>}</div>
                        </div>
                      ))}
                    </div>
                    {req.approvals.length > 0 && (
                      <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Approval</p>
                        {req.approvals.map(a => (<div key={a.id} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-gray-800">{a.approvedBy ? `${a.approvedBy.firstName} ${a.approvedBy.lastName}` : "System"}</span><StatusBadge status={a.status} /></div><p className="mt-0.5 text-xs text-gray-400">{fmt(a.createdAt)}</p></div>))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
