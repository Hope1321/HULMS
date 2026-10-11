"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, Ban, Clock, Send,
  User as UserIcon, Calendar, FileText,
  FlaskConical, ChevronRight, AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User     { id: string; firstName: string; lastName: string; email: string; }
interface Chemical { id: string; name: string; hazardLevel: string; }
interface Unit     { id: string; name: string; symbol: string; }

interface RequestItem {
  id: string; requestedQty: number; approvedQty: number | null;
  notes: string | null; chemical: Chemical; unit: Unit;
}
interface Approval {
  id: string; status: "APPROVED" | "REJECTED"; comments: string | null;
  approvedAt: string; approvedBy: User;
}
interface ChemicalRequest {
  id: string; requestNumber: string; purpose: string;
  requiredDate: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED";
  notes: string | null; createdAt: string; updatedAt: string;
  requestedBy: User; items: RequestItem[]; approvals: Approval[];
}

const STATUS_CFG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   badge: "bg-amber-100 text-amber-700 border border-amber-200",  icon: <Clock       className="h-4 w-4" /> },
  APPROVED:  { label: "Approved",  badge: "bg-green-100 text-green-700 border border-green-200",  icon: <CheckCircle className="h-4 w-4" /> },
  REJECTED:  { label: "Rejected",  badge: "bg-red-100   text-red-700   border border-red-200",    icon: <XCircle     className="h-4 w-4" /> },
  CANCELLED: { label: "Cancelled", badge: "bg-gray-100  text-gray-600  border border-gray-200",   icon: <Ban         className="h-4 w-4" /> },
  ISSUED:    { label: "Issued",    badge: "bg-blue-100  text-blue-700  border border-blue-200",   icon: <Send        className="h-4 w-4" /> },
};
const HAZARD: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt     = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CFG[status] ?? { label: status, badge: "bg-gray-100 text-gray-600 border border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${s.badge}`}>
      {s.icon} {s.label}
    </span>
  );
}

const FLOW = ["PENDING", "APPROVED", "ISSUED"] as const;
function StatusTimeline({ status }: { status: string }) {
  if (status === "REJECTED" || status === "CANCELLED") return null;
  const current = FLOW.indexOf(status as typeof FLOW[number]);
  return (
    <div className="flex items-center">
      {FLOW.map((s, i) => {
        const done = i <= current;
        return (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold
              ${done ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-400"}`}>
              {i + 1}
            </div>
            <span className={`ml-1.5 text-xs font-medium ${done ? "text-gray-800" : "text-gray-400"}`}>
              {STATUS_CFG[s].label}
            </span>
            {i < FLOW.length - 1 && (
              <ChevronRight className={`mx-2 h-4 w-4 ${i < current ? "text-blue-500" : "text-gray-300"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [request,      setRequest]      = useState<ChemicalRequest | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comments,     setComments]     = useState("");
  const [approvedQtys, setApprovedQtys] = useState<Record<string, string>>({});
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError,  setReviewError]  = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError,  setCancelError]  = useState("");

  const loadRequest = (token: string) =>
    fetch(`${API}/chemical-requests/${id}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) { setError(res.message || "Not found."); return; }
        setRequest(res.data);
        const qtys: Record<string, string> = {};
        (res.data.items as RequestItem[]).forEach(item => { qtys[item.id] = String(item.requestedQty); });
        setApprovedQtys(qtys);
      });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadRequest(token).catch(() => setError("Failed to load.")).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancel = async () => {
    setCancelError(""); setCancelLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res   = await fetch(`${API}/chemical-requests/${id}/cancel`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setRequest(prev => prev ? { ...prev, status: "CANCELLED" } : prev);
    } catch (err) { setCancelError(err instanceof Error ? err.message : "Failed to cancel."); }
    finally { setCancelLoading(false); }
  };

  const handleReview = async () => {
    if (!request || !reviewDecision) return;
    setReviewError(""); setReviewLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const body: Record<string, unknown> = {
        status: reviewDecision,
        comments: comments.trim() || undefined,
      };
      if (reviewDecision === "APPROVED") {
        body.items = request.items.map(it => ({
          requestItemId: it.id,
          approvedQty: Number(approvedQtys[it.id] ?? it.requestedQty),
        }));
      }
      const res    = await fetch(`${API}/chemical-requests/${id}/approval`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed.");
      await loadRequest(token);
      setReviewDecision(null); setComments("");
    } catch (err) { setReviewError(err instanceof Error ? err.message : "Failed."); }
    finally { setReviewLoading(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
  if (error || !request) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Not found."}</p>
      <Link href="/admin/dashboard/requests" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <Link href="/admin/dashboard/requests" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Requests
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request.requestNumber}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Submitted {fmtFull(request.createdAt)}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <StatusTimeline status={request.status} />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Request Information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Purpose</p>
              <p className="mt-0.5 text-sm text-gray-800">{request.purpose}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Required By</p>
              <p className="mt-0.5 text-sm text-gray-800">{fmt(request.requiredDate)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Requested By</p>
              <p className="mt-0.5 text-sm font-medium text-gray-800">
                {request.requestedBy.firstName} {request.requestedBy.lastName}
              </p>
              <p className="text-xs text-gray-400">{request.requestedBy.email}</p>
            </div>
          </div>
          {request.notes && (
            <div className="flex gap-3 sm:col-span-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                <p className="mt-0.5 text-sm text-gray-700">{request.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <FlaskConical className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Chemical Items</h2>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {request.items.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {["Chemical", "Hazard", "Requested", "Approved", "Unit", "Notes"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {request.items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.chemical.name}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.chemical.hazardLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{item.requestedQty}</td>
                  <td className="px-6 py-4">
                    {item.approvedQty != null
                      ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700"><CheckCircle className="h-3.5 w-3.5" />{item.approvedQty}</span>
                      : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.unit.symbol}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval History */}
      {request.approvals.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Review History</h2>
          <div className="space-y-3">
            {request.approvals.map(a => (
              <div key={a.id} className={`flex gap-4 rounded-xl border p-4
                ${a.status === "APPROVED" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                  ${a.status === "APPROVED" ? "bg-green-200" : "bg-red-200"}`}>
                  {a.status === "APPROVED"
                    ? <CheckCircle className="h-5 w-5 text-green-700" />
                    : <XCircle    className="h-5 w-5 text-red-700" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${a.status === "APPROVED" ? "text-green-800" : "text-red-800"}`}>
                      {a.status === "APPROVED" ? "Approved" : "Rejected"} by {a.approvedBy.firstName} {a.approvedBy.lastName}
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

      {/* ── COMBINED REVIEW PANEL (PENDING only) ── */}
      {request.status === "PENDING" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Review Request</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Choose to approve or reject this request. You can set quantities and add comments below.
            </p>
          </div>

          <div className="p-6 space-y-5">

            {/* ── Decision toggle ── */}
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700">Decision <span className="text-red-500">*</span></p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision("APPROVED")}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border-2 py-3 text-sm font-semibold transition-all
                    ${reviewDecision === "APPROVED"
                      ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"}`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision("REJECTED")}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border-2 py-3 text-sm font-semibold transition-all
                    ${reviewDecision === "REJECTED"
                      ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200"
                      : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"}`}
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </button>
              </div>
            </div>

            {/* ── Approved quantities (only when APPROVED selected) ── */}
            {reviewDecision === "APPROVED" && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="mb-3 text-sm font-semibold text-green-800">Set Approved Quantities</p>
                <div className="space-y-3">
                  {request.items.map(item => (
                    <div key={item.id} className="flex flex-wrap items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FlaskConical className="h-4 w-4 shrink-0 text-green-600" />
                        <span className="truncate text-sm font-medium text-gray-800">{item.chemical.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {item.chemical.hazardLevel}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-gray-500">Requested: <strong>{item.requestedQty}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">Approve:</span>
                        <input
                          type="number" min="0.01" step="any" max={item.requestedQty}
                          value={approvedQtys[item.id] ?? ""}
                          onChange={e => setApprovedQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        />
                        <span className="text-xs text-gray-500">{item.unit.symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Comments ── */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {reviewDecision === "REJECTED" ? "Rejection Reason" : "Comments"}
                {reviewDecision === "REJECTED" && <span className="text-red-500"> *</span>}
                {reviewDecision !== "REJECTED" && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={
                  reviewDecision === "REJECTED"
                    ? "Please provide a reason for rejection…"
                    : reviewDecision === "APPROVED"
                    ? "Any notes for the requester…"
                    : "Select a decision above first…"
                }
                disabled={!reviewDecision}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {/* ── Errors ── */}
            {(reviewError || cancelError) && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {reviewError || cancelError}
              </div>
            )}

            {/* ── Action buttons ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              {/* Cancel request */}
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelLoading || reviewLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" />
                {cancelLoading ? "Cancelling…" : "Cancel Request"}
              </button>

              {/* Submit review */}
              <button
                type="button"
                onClick={handleReview}
                disabled={
                  !reviewDecision ||
                  reviewLoading ||
                  cancelLoading ||
                  (reviewDecision === "REJECTED" && !comments.trim())
                }
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50
                  ${reviewDecision === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : reviewDecision === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-400"}`}
              >
                {reviewLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting…
                  </>
                ) : reviewDecision === "APPROVED" ? (
                  <><CheckCircle className="h-4 w-4" /> Confirm Approval</>
                ) : reviewDecision === "REJECTED" ? (
                  <><XCircle className="h-4 w-4" /> Confirm Rejection</>
                ) : (
                  "Select a Decision"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
