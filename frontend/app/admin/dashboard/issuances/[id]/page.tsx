"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send, Ban, Package, User as UserIcon,
  MapPin, Calendar, FileText, FlaskConical,
  X as XIcon, CheckCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User { id: string; firstName: string; lastName: string; email: string; phone?: string; }
interface Chemical { id: string; name: string; casNumber: string; formula: string; hazardLevel: string; }
interface Unit { id: string; name: string; symbol: string; }
interface StorageLocation { id: string; name: string; building?: string; room?: string; }
interface Category { id: string; name: string; }
interface Supplier { id: string; name: string; }

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  status: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  chemical: Chemical & { category?: Category; supplier?: Supplier; };
  unit: Unit;
  storageLocation: StorageLocation;
}

interface RequestItem {
  id: string;
  requestedQty: number;
  approvedQty: number | null;
  chemical: { id: string; name: string; hazardLevel: string; };
  unit: Unit;
}

interface Request {
  id: string;
  requestNumber: string;
  purpose: string;
  requiredDate: string | null;
  status: string;
  requestedBy: User;
  items: RequestItem[];
}

interface Issuance {
  id: string;
  issuanceNumber: string;
  quantity: number;
  status: "ISSUED" | "CANCELLED";
  issuedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  request: Request;
  batch: Batch;
  issuedTo: User;
  issuedBy: User;
}

const HAZARD_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function IssuanceDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [issuance,      setIssuance]      = useState<Issuance | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError,   setCancelError]   = useState("");
  const [cancelNotes,   setCancelNotes]   = useState("");
  const [showCancel,    setShowCancel]    = useState(false);

  /* ── fetch ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/chemical-issuances/${id}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) { setError(result.message || "Not found."); return; }
        setIssuance(result.data);
      })
      .catch(() => setError("Failed to load issuance."))
      .finally(() => setLoading(false));
  }, [id, router]);

  /* ── cancel ── */
  const handleCancel = async () => {
    setCancelError(""); setCancelLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res = await fetch(`${API}/chemical-issuances/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: cancelNotes.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to cancel.");
      setIssuance(prev => prev ? { ...prev, status: "CANCELLED" } : prev);
      setShowCancel(false); setCancelNotes("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally { setCancelLoading(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );

  if (error || !issuance) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Not found."}</p>
      <Link href="/admin/dashboard/issuances" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
    </div>
  );

  const isIssued = issuance.status === "ISSUED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Cancel Modal ── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <button onClick={() => { setShowCancel(false); setCancelError(""); setCancelNotes(""); }}
                className="rounded-lg p-1 hover:bg-gray-100">
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Cancel Issuance</h2>
            <p className="mt-2 text-sm text-gray-600">
              Cancel <span className="font-semibold text-gray-900">{issuance.issuanceNumber}</span>?
              The quantity of <strong>{issuance.quantity} {issuance.batch.unit.symbol}</strong> will be returned to batch stock.
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
              <button onClick={() => { setShowCancel(false); setCancelError(""); setCancelNotes(""); }}
                disabled={cancelLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Keep
              </button>
              <button onClick={handleCancel} disabled={cancelLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <Link href="/admin/dashboard/issuances" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Issuances
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{issuance.issuanceNumber}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Issued on {fmtFull(issuance.issuedAt)}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-semibold
            ${isIssued ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
            {isIssued ? <><Send className="h-4 w-4" /> Issued</> : <><Ban className="h-4 w-4" /> Cancelled</>}
          </span>
        </div>
      </div>

      {/* ── Summary Card ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Package className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Issuance Summary</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Quantity Issued</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{issuance.quantity}</p>
            <p className="text-sm text-blue-500">{issuance.batch.unit.symbol}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chemical</p>
            <p className="mt-1 text-base font-bold text-gray-800">{issuance.batch.chemical.name}</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD_COLORS[issuance.batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
              {issuance.batch.chemical.hazardLevel}
            </span>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</p>
            <p className="mt-1 text-base font-bold text-gray-800">{issuance.batch.batchNumber}</p>
            <p className="text-sm text-gray-500">{issuance.batch.storageLocation.name}</p>
          </div>
        </div>
      </div>

      {/* ── Chemical & Batch Details ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Chemical & Batch Details</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Chemical Name",  value: issuance.batch.chemical.name },
            { label: "CAS Number",     value: issuance.batch.chemical.casNumber || "—" },
            { label: "Formula",        value: issuance.batch.chemical.formula   || "—" },
            { label: "Hazard Level",   value: issuance.batch.chemical.hazardLevel },
            { label: "Batch Number",   value: issuance.batch.batchNumber },
            { label: "Batch Status",   value: issuance.batch.status },
            { label: "Purchase Date",  value: fmt(issuance.batch.purchaseDate) },
            { label: "Expiry Date",    value: fmt(issuance.batch.expiryDate) },
            { label: "Storage Location", value: issuance.batch.storageLocation.name },
            { label: "Category",       value: issuance.batch.chemical.category?.name || "—" },
            { label: "Supplier",       value: issuance.batch.chemical.supplier?.name || "—" },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
              <p className="mt-0.5 text-sm text-gray-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request Details ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Related Request</h2>
          </div>
          <Link href={`/admin/dashboard/requests/${issuance.request.id}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Request →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Request Number", value: issuance.request.requestNumber },
            { label: "Purpose",        value: issuance.request.purpose },
            { label: "Required By",    value: fmt(issuance.request.requiredDate) },
            { label: "Status",         value: issuance.request.status },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
              <p className="mt-0.5 text-sm text-gray-800">{f.value}</p>
            </div>
          ))}
        </div>
        {/* Request items */}
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Chemical", "Requested", "Approved", "Unit"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issuance.request.items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.chemical.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.requestedQty}</td>
                  <td className="px-4 py-3">
                    {item.approvedQty != null ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />{item.approvedQty}
                      </span>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.unit.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── People ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {[
          { title: "Issued To",  icon: <UserIcon className="h-5 w-5 text-gray-400" />, user: issuance.issuedTo },
          { title: "Issued By",  icon: <UserIcon className="h-5 w-5 text-gray-400" />, user: issuance.issuedBy },
        ].map(p => (
          <div key={p.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              {p.icon}
              <h2 className="font-semibold text-gray-900">{p.title}</h2>
            </div>
            <p className="text-sm font-semibold text-gray-800">{p.user.firstName} {p.user.lastName}</p>
            <p className="text-sm text-gray-500">{p.user.email}</p>
            {p.user.phone && <p className="text-sm text-gray-500">{p.user.phone}</p>}
          </div>
        ))}
      </div>

      {/* ── Location + Notes ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Storage Location</h2>
          </div>
          <p className="text-sm font-semibold text-gray-800">{issuance.batch.storageLocation.name}</p>
          {issuance.batch.storageLocation.building && (
            <p className="text-sm text-gray-500">Building: {issuance.batch.storageLocation.building}</p>
          )}
          {issuance.batch.storageLocation.room && (
            <p className="text-sm text-gray-500">Room: {issuance.batch.storageLocation.room}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Timeline</h2>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Issued At</span>
              <span className="font-medium text-gray-800">{fmtFull(issuance.issuedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="font-medium text-gray-800">{fmtFull(issuance.updatedAt)}</span>
            </div>
          </div>
          {issuance.notes && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
              <p className="mt-1 text-sm text-gray-700">{issuance.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Action ── */}
      {isIssued && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Actions</h2>
          <button onClick={() => setShowCancel(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
            <Ban className="h-4 w-4" /> Cancel Issuance
          </button>
          <p className="mt-2 text-xs text-gray-400">
            Cancelling will return {issuance.quantity} {issuance.batch.unit.symbol} back to batch {issuance.batch.batchNumber}.
          </p>
        </div>
      )}
    </div>
  );
}
