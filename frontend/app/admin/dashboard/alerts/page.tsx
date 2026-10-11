"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Bell, CheckCircle, ShieldAlert,
  Clock, Eye, X as XIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical {
  id: string;
  name: string;
  casNumber: string;
  formula: string;
  hazardLevel: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
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

/* ── config maps ── */
const TYPE_CFG: Record<string, { label: string; badge: string; icon: React.ReactNode; row: string }> = {
  LOW_STOCK:          { label: "Low Stock",          badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",  icon: <AlertTriangle className="h-3.5 w-3.5" />, row: "border-l-4 border-l-yellow-400" },
  EXPIRING_CHEMICAL:  { label: "Expiring Chemical",  badge: "bg-orange-100 text-orange-700 border border-orange-200", icon: <Clock         className="h-3.5 w-3.5" />, row: "border-l-4 border-l-orange-400" },
  EXPIRED_CHEMICAL:   { label: "Expired Chemical",   badge: "bg-red-100    text-red-700    border border-red-200",    icon: <XIcon         className="h-3.5 w-3.5" />, row: "border-l-4 border-l-red-500"    },
  HIGH_HAZARD:        { label: "High Hazard",         badge: "bg-purple-100 text-purple-700 border border-purple-200", icon: <ShieldAlert   className="h-3.5 w-3.5" />, row: "border-l-4 border-l-purple-500" },
};

const STATUS_CFG: Record<string, { badge: string; label: string }> = {
  ACTIVE:       { badge: "bg-red-100    text-red-700    border border-red-200",    label: "Active"       },
  ACKNOWLEDGED: { badge: "bg-blue-100   text-blue-700   border border-blue-200",   label: "Acknowledged" },
  RESOLVED:     { badge: "bg-green-100  text-green-700  border border-green-200",  label: "Resolved"     },
};

const HAZARD_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function AlertsPage() {
  const [alerts,       setAlerts]       = useState<Alert[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* inline action state */
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds alert id
  const [actionError,   setActionError]   = useState("");

  /* ── fetch ── */
  const fetchAlerts = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/alerts`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load alerts");
      setAlerts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  /* ── acknowledge ── */
  const handleAcknowledge = async (alert: Alert) => {
    setActionError(""); setActionLoading(alert.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/alerts/${alert.id}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed.");
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: "ACKNOWLEDGED" } : a));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally { setActionLoading(null); }
  };

  /* ── resolve ── */
  const handleResolve = async (alert: Alert) => {
    setActionError(""); setActionLoading(alert.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/alerts/${alert.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed.");
      setAlerts(prev => prev.map(a =>
        a.id === alert.id ? { ...a, status: "RESOLVED", resolvedAt: new Date().toISOString() } : a
      ));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally { setActionLoading(null); }
  };

  /* ── filter ── */
  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    return (
      (a.title.toLowerCase().includes(q) ||
       (a.chemical?.name ?? "").toLowerCase().includes(q) ||
       (a.batch?.batchNumber ?? "").toLowerCase().includes(q)) &&
      (typeFilter   === "ALL" || a.type   === typeFilter) &&
      (statusFilter === "ALL" || a.status === statusFilter)
    );
  });

  const count = (s: string) => alerts.filter(a => a.status === s).length;
  const countType = (t: string) => alerts.filter(a => a.type === t && a.status === "ACTIVE").length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
            <p className="text-sm text-gray-500">Monitor and manage laboratory safety alerts</p>
          </div>
        </div>
        {count("ACTIVE") > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{count("ACTIVE")} active alert{count("ACTIVE") !== 1 ? "s" : ""} require attention</span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Active",       value: count("ACTIVE"),       color: "text-red-700",    bg: "bg-red-50",    icon: <AlertTriangle className="h-5 w-5 text-red-400"    /> },
          { label: "Acknowledged", value: count("ACKNOWLEDGED"), color: "text-blue-700",   bg: "bg-blue-50",   icon: <Bell          className="h-5 w-5 text-blue-400"   /> },
          { label: "Resolved",     value: count("RESOLVED"),     color: "text-green-700",  bg: "bg-green-50",  icon: <CheckCircle   className="h-5 w-5 text-green-400"  /> },
          { label: "Total",        value: alerts.length,          color: "text-gray-900",   bg: "bg-gray-50",   icon: <Bell          className="h-5 w-5 text-gray-400"   /> },
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

      {/* ── Active alert type breakdown ── */}
      {count("ACTIVE") > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(["LOW_STOCK", "EXPIRING_CHEMICAL", "EXPIRED_CHEMICAL", "HIGH_HAZARD"] as const).map(t => {
            const n = countType(t);
            if (n === 0) return null;
            const cfg = TYPE_CFG[t];
            return (
              <div key={t} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.badge}`}>
                  {cfg.icon}{cfg.label}
                </span>
                <span className="ml-auto text-lg font-bold text-gray-800">{n}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
            <input type="text" placeholder="Alert title, chemical, or batch…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Alert Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Types</option>
              {Object.entries(TYPE_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {actionError}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Alert List ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-500" />
          <p className="mt-4 text-sm text-gray-500">Loading alerts…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
          <p className="mt-4 text-base font-semibold text-gray-600">No alerts found</p>
          <p className="mt-1 text-sm text-gray-400">
            {alerts.length === 0 ? "All chemicals are within safe parameters." : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => {
            const typeCfg   = TYPE_CFG[alert.type]   ?? TYPE_CFG.HIGH_HAZARD;
            const statusCfg = STATUS_CFG[alert.status] ?? STATUS_CFG.ACTIVE;
            const busy      = actionLoading === alert.id;

            return (
              <div key={alert.id} className={`rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md ${typeCfg.row}`}>
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${typeCfg.badge}`}>
                          {typeCfg.icon}{typeCfg.label}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900">{alert.title}</h3>
                      {alert.message && (
                        <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                      )}

                      {/* Chemical + batch info */}
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        {alert.chemical && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-700">{alert.chemical.name}</span>
                            {alert.chemical.formula && <span className="text-gray-400">({alert.chemical.formula})</span>}
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${HAZARD_COLORS[alert.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                              {alert.chemical.hazardLevel}
                            </span>
                          </div>
                        )}
                        {alert.batch && (
                          <div className="flex items-center gap-3">
                            <span>Batch: <b className="text-gray-700">{alert.batch.batchNumber}</b></span>
                            <span>Stock: <b className="text-gray-700">{alert.batch.quantity}</b> / Min: <b className="text-gray-700">{alert.batch.minimumStock}</b></span>
                            {alert.batch.expiryDate && (
                              <span>Expires: <b className="text-gray-700">{fmt(alert.batch.expiryDate)}</b></span>
                            )}
                          </div>
                        )}
                        <span className="text-gray-400">{fmt(alert.createdAt)}</span>
                        {alert.resolvedAt && (
                          <span className="text-green-600">Resolved: {fmt(alert.resolvedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                      <Link href={`/admin/dashboard/alerts/${alert.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>

                      {alert.status === "ACTIVE" && (
                        <button onClick={() => handleAcknowledge(alert)} disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">
                          <Bell className="h-3.5 w-3.5" />
                          {busy ? "…" : "Acknowledge"}
                        </button>
                      )}

                      {(alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED") && (
                        <button onClick={() => handleResolve(alert)} disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {busy ? "…" : "Resolve"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="mt-4 text-right text-sm text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{alerts.length}</span> alerts
        </p>
      )}
    </div>
  );
}
