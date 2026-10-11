"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers, Search, Plus, AlertTriangle,
  CheckCircle, Package, XCircle, Clock,
  MapPin, Calendar, FlaskConical, ChevronDown,
  Eye, Pencil, TrendingDown,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  status: "AVAILABLE" | "LOW_STOCK" | "DEPLETED" | "EXPIRED";
  chemical: { id: string; name: string; hazardLevel: string; formula: string | null };
  unit: { id: string; name: string; symbol: string };
  storageLocation: { id: string; name: string; building?: string | null; room?: string | null };
  createdAt: string;
}

/* ── Status config ── */
const STATUS_CFG: Record<string, { badge: string; icon: React.ReactNode; row: string }> = {
  AVAILABLE: { badge: "bg-green-100 text-green-700 border border-green-200",   icon: <CheckCircle className="h-3.5 w-3.5" />, row: "" },
  LOW_STOCK: { badge: "bg-amber-100 text-amber-700 border border-amber-200",    icon: <TrendingDown className="h-3.5 w-3.5" />, row: "bg-amber-50/30" },
  DEPLETED:  { badge: "bg-gray-100 text-gray-600 border border-gray-200",       icon: <XCircle      className="h-3.5 w-3.5" />, row: "" },
  EXPIRED:   { badge: "bg-red-100 text-red-700 border border-red-200",          icon: <XCircle      className="h-3.5 w-3.5" />, row: "bg-red-50/20" },
};

const HAZARD: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const isExpiringSoon = (d: string | null) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
};

export default function LabTechBatchesPage() {
  const [batches,      setBatches]      = useState<Batch[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded,     setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    fetch(`${API}/chemical-batches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (!res.success) throw new Error(res.message); setBatches(res.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = batches.filter(b => {
    const q = search.toLowerCase();
    return (
      (b.batchNumber.toLowerCase().includes(q) ||
       b.chemical.name.toLowerCase().includes(q) ||
       b.storageLocation.name.toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || b.status === statusFilter)
    );
  });

  const count = (s: string) => batches.filter(b => b.status === s).length;

  /* Stock level percentage */
  const stockPct = (b: Batch) => {
    if (b.minimumStock === 0) return 100;
    return Math.min(Math.round((b.quantity / (b.minimumStock * 3)) * 100), 100);
  };

  const stockBarColor = (b: Batch) => {
    if (b.status === "EXPIRED" || b.status === "DEPLETED") return "bg-red-500";
    if (b.status === "LOW_STOCK") return "bg-amber-400";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#c2410c" }}>
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chemical Batches</h1>
            <p className="text-sm text-gray-500">Track stock levels, expiry dates and storage locations</p>
          </div>
        </div>
        <Link href="/admin/dashboard/batches/create"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ background: "#c2410c" }}>
          <Plus className="h-4 w-4" /> Add New Batch
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Batches",     value: batches.length,        icon: Package,       bg: "#fff7ed", color: "#c2410c" },
          { label: "Available",         value: count("AVAILABLE"),    icon: CheckCircle,   bg: "#f0fdf4", color: "#16a34a" },
          { label: "Low Stock",         value: count("LOW_STOCK"),    icon: AlertTriangle, bg: "#fffbeb", color: "#d97706" },
          { label: "Expired / Depleted",value: count("EXPIRED") + count("DEPLETED"), icon: XCircle, bg: "#fef2f2", color: "#dc2626" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Low stock alert ── */}
      {count("LOW_STOCK") > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            {count("LOW_STOCK")} batch{count("LOW_STOCK") !== 1 ? "es are" : " is"} running low — restock soon.
          </p>
          <button onClick={() => setStatusFilter("LOW_STOCK")}
            className="ml-auto shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
            Show only
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by batch #, chemical or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "AVAILABLE", "LOW_STOCK", "DEPLETED", "EXPIRED"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                statusFilter === s
                  ? s === "ALL"       ? "border-gray-800 bg-gray-800 text-white"
                  : s === "AVAILABLE" ? "border-green-600 bg-green-600 text-white"
                  : s === "LOW_STOCK" ? "border-amber-500 bg-amber-500 text-white"
                  : "border-red-600 bg-red-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}>
              {s === "ALL" ? "All" : s === "LOW_STOCK" ? "Low Stock" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Batch list ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Layers className="h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No batches found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(batch => {
            const cfg    = STATUS_CFG[batch.status] ?? STATUS_CFG.AVAILABLE;
            const pct    = stockPct(batch);
            const expiring = isExpiringSoon(batch.expiryDate);
            const isExp  = expanded === batch.id;

            return (
              <div key={batch.id}
                className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition ${cfg.row}`}>

                {/* Main row */}
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">

                  {/* Chemical icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <FlaskConical className="h-5 w-5 text-orange-600" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900">{batch.batchNumber}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.icon} {batch.status.replace("_", " ")}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD[batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                        {batch.chemical.hazardLevel}
                      </span>
                      {expiring && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                          <Clock className="h-3 w-3" /> Expiring Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-medium text-gray-700">{batch.chemical.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <strong className="text-gray-700">{batch.quantity} {batch.unit.symbol}</strong>
                        <span>/ Min: {batch.minimumStock} {batch.unit.symbol}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {batch.storageLocation.name}
                      </span>
                      {batch.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: <span className={expiring ? "font-semibold text-red-600" : ""}>{fmt(batch.expiryDate)}</span>
                        </span>
                      )}
                    </div>

                    {/* Stock bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                        <div className={`h-1.5 rounded-full transition-all ${stockBarColor(batch)}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setExpanded(isExp ? null : batch.id)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100">
                      {isExp ? "Hide" : "Details"}
                    </button>
                    <Link href={`/admin/dashboard/batches/${batch.id}/edit`}
                      className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExp && (
                  <div className="grid gap-4 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:grid-cols-3">

                    {/* Chemical */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Chemical</p>
                      <p className="font-semibold text-gray-900">{batch.chemical.name}</p>
                      {batch.chemical.formula && (
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{batch.chemical.formula}</p>
                      )}
                      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD[batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                        {batch.chemical.hazardLevel} Hazard
                      </span>
                    </div>

                    {/* Stock */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Stock Level</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-gray-900">{batch.quantity}</span>
                        <span className="text-sm text-gray-500">{batch.unit.symbol}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Minimum: {batch.minimumStock} {batch.unit.symbol}
                      </p>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                        <div className={`h-2 rounded-full ${stockBarColor(batch)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Location & Dates */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Location & Dates</p>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {batch.storageLocation.name}
                        {batch.storageLocation.building && ` · ${batch.storageLocation.building}`}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p>Purchased: <span className="font-medium text-gray-700">{fmt(batch.purchaseDate)}</span></p>
                        <p className={expiring ? "font-semibold text-red-600" : ""}>
                          Expires: <span>{fmt(batch.expiryDate)}</span>
                          {expiring && " ⚠️"}
                        </p>
                      </div>
                      <div className="mt-3">
                        <Link href={`/admin/dashboard/batches/${batch.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                          <Pencil className="h-3 w-3" /> Update Stock
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-sm text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{batches.length}</span> batches
        </p>
      )}
    </div>
  );
}
