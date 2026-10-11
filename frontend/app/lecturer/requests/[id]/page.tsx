"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Clock, CheckCircle, XCircle, Ban, Send,
  FlaskConical, User, Calendar, FileText, AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestItem {
  id: string; requestedQty: number; approvedQty: number | null; notes: string | null;
  chemical: { id: string; name: string; hazardLevel: string };
  unit: { id: string; name: string; symbol: string };
}
interface Approval {
  id: string; status: string; comments: string | null; approvedAt: string;
  approvedBy: { firstName: string; lastName: string; email: string } | null;
}
interface ChemicalRequest {
  id: string; requestNumber: string; purpose: string; requiredDate: string | null;
  status: string; notes: string | null; createdAt: string; updatedAt: string;
  requestedBy: { firstName: string; lastName: string; email: string };
  items: RequestItem[];
  approvals: Approval[];
}

const STATUS_CFG: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  PENDING:   { badge: "bg-amber-100 text-amber-700 border border-amber-200",  icon: <Clock       className="h-4 w-4" />, label: "Pending"   },
  APPROVED:  { badge: "bg-green-100 text-purple-700 border border-green-200",  icon: <CheckCircle className="h-4 w-4" />, label: "Approved"  },
  REJECTED:  { badge: "bg-red-100 text-red-700 border border-red-200",        icon: <XCircle     className="h-4 w-4" />, label: "Rejected"  },
  CANCELLED: { badge: "bg-gray-100 text-gray-600 border border-gray-200",     icon: <Ban         className="h-4 w-4" />, label: "Cancelled" },
  ISSUED:    { badge: "bg-blue-100 text-blue-700 border border-blue-200",     icon: <Send        className="h-4 w-4" />, label: "Issued"    },
};

const HAZARD: Record<string, string> = {
  LOW: "bg-green-100 text-purple-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const FLOW = ["PENDING", "APPROVED", "ISSUED"] as const;

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [req,         setReq]         = useState<ChemicalRequest | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelled,   setCancelled]   = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/chemical-requests/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || "Not found.");
        setReq(res.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleCancel = async () => {
    if (!req) return;
    setCancelError(""); setCancelling(true);
    try {
      const token = localStorage.getItem("token")!;
      const res   = await fetch(`${API}/chemical-requests/${id}/cancel`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setReq(prev => prev ? { ...prev, status: "CANCELLED" } : prev);
      setCancelled(true);
    } catch (e) { setCancelError(e instanceof Error ? e.message : "Failed."); }
    finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600" />
    </div>
  );

  if (error || !req) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Request not found."}</p>
      <Link href="/lecturer/requests" className="mt-3 inline-block text-sm text-purple-600 hover:underline">← Back to Requests</Link>
    </div>
  );

  const cfg     = STATUS_CFG[req.status] ?? STATUS_CFG.PENDING;
  const current = FLOW.indexOf(req.status as typeof FLOW[number]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-400">
        <Link href="/lecturer/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/lecturer/requests" className="hover:text-gray-600">My Requests</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-700 font-medium">{req.requestNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{req.requestNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">Submitted {fmtFull(req.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Status timeline */}
      {!["REJECTED","CANCELLED"].includes(req.status) && (
        <div className="flex items-center gap-0 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          {FLOW.map((s, i) => {
            const done = i <= current;
            const sCfg = STATUS_CFG[s];
            return (
              <div key={s} className="flex items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all
                  ${done ? "border-purple-600 bg-purple-600 text-white" : "border-gray-200 bg-white text-gray-400"}`}>
                  {i + 1}
                </div>
                <span className={`ml-1.5 text-sm font-medium ${done ? "text-gray-800" : "text-gray-400"}`}>{sCfg.label}</span>
                {i < FLOW.length - 1 && (
                  <ChevronRight className={`mx-3 h-4 w-4 ${i < current ? "text-purple-500" : "text-gray-300"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Request Information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Purpose</p>
              <p className="mt-0.5 text-sm text-gray-800">{req.purpose}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Required By</p>
              <p className="mt-0.5 text-sm text-gray-800">{fmt(req.requiredDate)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Requested By</p>
              <p className="mt-0.5 text-sm font-medium text-gray-800">
                {req.requestedBy.firstName} {req.requestedBy.lastName}
              </p>
              <p className="text-xs text-gray-400">{req.requestedBy.email}</p>
            </div>
          </div>
          {req.notes && (
            <div className="flex gap-3 sm:col-span-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                <p className="mt-0.5 text-sm text-gray-700">{req.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <FlaskConical className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Chemical Items</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-purple-700">{req.items.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Chemical", "Hazard", "Requested", "Approved", "Unit", "Notes"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {req.items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{item.chemical.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.chemical.hazardLevel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">{item.requestedQty}</td>
                  <td className="px-5 py-3.5">
                    {item.approvedQty != null
                      ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-700"><CheckCircle className="h-3.5 w-3.5" />{item.approvedQty}</span>
                      : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{item.unit.symbol}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{item.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval history */}
      {req.approvals.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Review History</h2>
          <div className="space-y-3">
            {req.approvals.map(a => (
              <div key={a.id} className={`flex gap-4 rounded-xl border p-4 ${a.status === "APPROVED" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.status === "APPROVED" ? "bg-green-200" : "bg-red-200"}`}>
                  {a.status === "APPROVED" ? <CheckCircle className="h-5 w-5 text-purple-700" /> : <XCircle className="h-5 w-5 text-red-700" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${a.status === "APPROVED" ? "text-green-800" : "text-red-800"}`}>
                      {a.status === "APPROVED" ? "Approved" : "Rejected"} by {a.approvedBy ? `${a.approvedBy.firstName} ${a.approvedBy.lastName}` : "System"}
                    </p>
                    <p className="text-xs text-gray-400">{fmtFull(a.approvedAt)}</p>
                  </div>
                  {a.comments && <p className="mt-1 text-sm text-gray-600">{a.comments}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel action */}
      {req.status === "PENDING" && !cancelled && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Cancel Request</h2>
          <p className="text-sm text-gray-600">You can cancel this request while it is still pending review.</p>
          {cancelError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{cancelError}
            </div>
          )}
          <button onClick={handleCancel} disabled={cancelling}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
            <Ban className="h-4 w-4" /> {cancelling ? "Cancelling…" : "Cancel Request"}
          </button>
        </div>
      )}
      {cancelled && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          ✓ Request cancelled. <Link href="/lecturer/requests" className="font-medium text-purple-600 hover:underline">Back to requests →</Link>
        </div>
      )}
    </div>
  );
}
