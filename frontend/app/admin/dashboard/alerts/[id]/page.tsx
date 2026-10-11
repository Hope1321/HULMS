"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Bell, CheckCircle, ShieldAlert,
  Clock, X as XIcon, FlaskConical, Package, Calendar,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical {
  id: string;
  name: string;
  casNumber: string;
  formula: string;
  description: string | null;
  hazardLevel: string;
  status: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  status: string;
}

interface Alert {
  id: string;
  type: "LOW_STOCK" | "EXPIRING_CHEMICAL" | "EXPIRED_CHEMICAL" | "HIGH_HAZARD";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
  chemical: Chemical | null;
  batch: Batch | null;
}

const TYPE_CFG: Record<string, { label: string; badge: string; bg: string; border: string; icon: React.ReactNode }> = {
  LOW_STOCK:         { label: "Low Stock",         badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", bg: "bg-yellow-50", border: "border-yellow-300", icon: <AlertTriangle className="h-5 w-5 text-yellow-600" /> },
  EXPIRING_CHEMICAL: { label: "Expiring Chemical", badge: "bg-orange-100 text-orange-700 border border-orange-200", bg: "bg-orange-50", border: "border-orange-300", icon: <Clock         className="h-5 w-5 text-orange-600" /> },
  EXPIRED_CHEMICAL:  { label: "Expired Chemical",  badge: "bg-red-100    text-red-700    border border-red-200",    bg: "bg-red-50",    border: "border-red-300",    icon: <XIcon         className="h-5 w-5 text-red-600"    /> },
  HIGH_HAZARD:       { label: "High Hazard",        badge: "bg-purple-100 text-purple-700 border border-purple-200", bg: "bg-purple-50", border: "border-purple-300", icon: <ShieldAlert   className="h-5 w-5 text-purple-600" /> },
};

const STATUS_CFG: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  ACTIVE:       { badge: "bg-red-100   text-red-700   border border-red-200",   label: "Active",       icon: <AlertTriangle className="h-4 w-4" /> },
  ACKNOWLEDGED: { badge: "bg-blue-100  text-blue-700  border border-blue-200",  label: "Acknowledged", icon: <Bell          className="h-4 w-4" /> },
  RESOLVED:     { badge: "bg-green-100 text-green-700 border border-green-200", label: "Resolved",     icon: <CheckCircle   className="h-4 w-4" /> },
};

const HAZARD_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AlertDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [alert,   setAlert]   = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/alerts/${id}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) { setError(result.message || "Alert not found."); return; }
        setAlert(result.data);
      })
      .catch(() => setError("Failed to load alert."))
      .finally(() => setLoading(false));
  }, [id, router]);

  const doAction = async (endpoint: string, newStatus: Alert["status"]) => {
    setActionError(""); setActionLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res = await fetch(`${API}/alerts/${id}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Action failed.");
      setAlert(prev => prev ? {
        ...prev,
        status: newStatus,
        resolvedAt: newStatus === "RESOLVED" ? new Date().toISOString() : prev.resolvedAt,
      } : prev);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-500" />
    </div>
  );

  if (error || !alert) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Alert not found."}</p>
      <Link href="/admin/dashboard/alerts" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
    </div>
  );

  const typeCfg   = TYPE_CFG[alert.type]     ?? TYPE_CFG.HIGH_HAZARD;
  const statusCfg = STATUS_CFG[alert.status] ?? STATUS_CFG.ACTIVE;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ── */}
      <div>
        <Link href="/admin/dashboard/alerts" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Alerts
        </Link>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${typeCfg.badge}`}>
                {typeCfg.icon}{typeCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${statusCfg.badge}`}>
                {statusCfg.icon}{statusCfg.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{alert.title}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Created {fmtFull(alert.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      <div className={`rounded-xl border p-5 ${typeCfg.bg} ${typeCfg.border}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{typeCfg.icon}</div>
          <div>
            <p className="font-semibold text-gray-900">{alert.title}</p>
            {alert.message && <p className="mt-1 text-sm text-gray-700">{alert.message}</p>}
            {alert.resolvedAt && (
              <p className="mt-2 text-xs font-medium text-green-700">
                ✓ Resolved on {fmtFull(alert.resolvedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Chemical Details ── */}
      {alert.chemical && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Chemical</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Name",       value: alert.chemical.name },
              { label: "CAS Number", value: alert.chemical.casNumber || "—" },
              { label: "Formula",    value: alert.chemical.formula   || "—" },
              { label: "Status",     value: alert.chemical.status },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
                <p className="mt-0.5 text-sm text-gray-800">{f.value}</p>
              </div>
            ))}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hazard Level</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${HAZARD_COLORS[alert.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                {alert.chemical.hazardLevel}
              </span>
            </div>
            {alert.chemical.description && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                <p className="mt-0.5 text-sm text-gray-700">{alert.chemical.description}</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Link href={`/admin/dashboard/chemicals/${alert.chemical.id}/edit`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View / Edit Chemical →
            </Link>
          </div>
        </div>
      )}

      {/* ── Batch Details ── */}
      {alert.batch && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Batch</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: "Batch Number",   value: alert.batch.batchNumber },
              { label: "Status",         value: alert.batch.status },
              { label: "Current Stock",  value: String(alert.batch.quantity) },
              { label: "Minimum Stock",  value: String(alert.batch.minimumStock) },
              { label: "Purchase Date",  value: fmt(alert.batch.purchaseDate) },
              { label: "Expiry Date",    value: fmt(alert.batch.expiryDate) },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-800">{f.value}</p>
              </div>
            ))}
          </div>
          {/* Stock bar */}
          {alert.batch.minimumStock > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Stock level</span>
                <span>{alert.batch.quantity} / {alert.batch.minimumStock} min</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    alert.batch.quantity <= 0
                      ? "bg-gray-400"
                      : alert.batch.quantity <= alert.batch.minimumStock
                      ? "bg-red-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (alert.batch.quantity / (alert.batch.minimumStock * 2)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-4">
            <Link href={`/admin/dashboard/batches/${alert.batch.id}/edit`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View / Edit Batch →
            </Link>
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Timeline</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Alert created</p>
              <p className="text-xs text-gray-400">{fmtFull(alert.createdAt)}</p>
            </div>
          </div>
          {(alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") && (
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                <Bell className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Acknowledged</p>
              </div>
            </div>
          )}
          {alert.status === "RESOLVED" && alert.resolvedAt && (
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Resolved</p>
                <p className="text-xs text-gray-400">{fmtFull(alert.resolvedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      {alert.status !== "RESOLVED" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Actions</h2>
          {actionError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
          )}
          <div className="flex flex-wrap gap-3">
            {alert.status === "ACTIVE" && (
              <button onClick={() => doAction("acknowledge", "ACKNOWLEDGED")} disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                <Bell className="h-4 w-4" />
                {actionLoading ? "Processing…" : "Acknowledge Alert"}
              </button>
            )}
            <button onClick={() => doAction("resolve", "RESOLVED")} disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
              <CheckCircle className="h-4 w-4" />
              {actionLoading ? "Processing…" : "Mark as Resolved"}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {alert.status === "ACTIVE"
              ? "Acknowledge to confirm you are aware of this alert. Resolve once the issue is fixed."
              : "Mark this alert as resolved once the underlying issue has been addressed."}
          </p>
        </div>
      )}
    </div>
  );
}
