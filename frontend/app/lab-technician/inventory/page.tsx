"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import {
  FlaskConical, Search, ShieldAlert,
  Package, CheckCircle, XCircle,
  Eye, EyeOff, ChevronDown, Loader2,
  MapPin, Hash, BarChart3,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category { id: string; name: string; }

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  status: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  unit: { symbol: string };
  storageLocation: { name: string; building: string | null; room: string | null };
  _count?: { issuances: number };
}

interface BatchDetail {
  totalStock: number;
  totalBatches: number;
  batches: Batch[];
}

interface Chemical {
  id: string;
  name: string;
  casNumber: string | null;
  formula: string | null;
  hazardLevel: string;
  status: string;
  category: Category | null;
  _count?: { batches: number };
}

/* ── Helpers ── */
const HAZARD_BADGE: Record<string, string> = {
  LOW:      "bg-green-100 text-green-700",
  MODERATE: "bg-yellow-100 text-yellow-700",
  HIGH:     "bg-orange-100 text-orange-700",
  EXTREME:  "bg-red-100 text-red-700",
};
const hBadge = (level: string) => HAZARD_BADGE[level] ?? "bg-gray-100 text-gray-600";

const BATCH_STATUS: Record<string, string> = {
  AVAILABLE: "text-green-600",
  LOW_STOCK: "text-amber-600",
  EXPIRED:   "text-red-600",
  DEPLETED:  "text-gray-400",
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function LabTechInventoryPage() {
  const [chemicals,    setChemicals]    = useState<Chemical[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [hazardFilter, setHazardFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* per-chemical batch data, keyed by chemical id */
  const [batchData,    setBatchData]    = useState<Record<string, BatchDetail>>({});
  const [batchLoading, setBatchLoading] = useState<Record<string, boolean>>({});
  const [batchError,   setBatchError]   = useState<Record<string, string>>({});
  const [expanded,     setExpanded]     = useState<string | null>(null);

  /* ── fetch chemical list ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    fetch(`${API}/chemicals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (!res.success) throw new Error(res.message); setChemicals(res.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── lazy-fetch batches for a chemical ── */
  const fetchBatches = async (chemId: string) => {
    if (batchData[chemId]) return; // already loaded
    const token = localStorage.getItem("token");
    if (!token) return;

    setBatchLoading(prev => ({ ...prev, [chemId]: true }));
    setBatchError(prev => ({ ...prev, [chemId]: "" }));

    try {
      const res = await fetch(`${API}/chemicals/${chemId}/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load batches");
      setBatchData(prev => ({ ...prev, [chemId]: json.data }));
    } catch (e) {
      setBatchError(prev => ({ ...prev, [chemId]: e instanceof Error ? e.message : "Failed to load" }));
    } finally {
      setBatchLoading(prev => ({ ...prev, [chemId]: false }));
    }
  };

  const toggleExpand = (chemId: string) => {
    if (expanded === chemId) {
      setExpanded(null);
    } else {
      setExpanded(chemId);
      fetchBatches(chemId);
    }
  };

  /* ── filter ── */
  const filtered = chemicals.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) ||
       (c.casNumber ?? "").toLowerCase().includes(q) ||
       (c.formula ?? "").toLowerCase().includes(q) ||
       (c.category?.name ?? "").toLowerCase().includes(q)) &&
      (hazardFilter === "ALL" || c.hazardLevel === hazardFilter) &&
      (statusFilter === "ALL" || c.status === statusFilter)
    );
  });

  const totalActive = chemicals.filter(c => c.status === "ACTIVE").length;
  const highHazard  = chemicals.filter(c => c.hazardLevel === "HIGH" || c.hazardLevel === "EXTREME").length;
  const inactive    = chemicals.filter(c => c.status === "INACTIVE").length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-700">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chemical Inventory</h1>
            <p className="text-sm text-gray-500">View laboratory chemicals and their batch stock levels</p>
          </div>
        </div>
        <Link href="/lab-technician/batches"
          className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-100">
          <Package className="h-4 w-4" /> View Batches
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Chemicals", value: chemicals.length, icon: FlaskConical, bg: "bg-orange-50",  color: "text-orange-700" },
          { label: "Active",          value: totalActive,       icon: CheckCircle,  bg: "bg-green-50",   color: "text-green-700"  },
          { label: "High Hazard",     value: highHazard,        icon: ShieldAlert,  bg: "bg-orange-50",  color: "text-orange-600" },
          { label: "Inactive",        value: inactive,          icon: XCircle,      bg: "bg-gray-50",    color: "text-gray-500"   },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chemical, CAS, formula…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div className="relative">
            <select value={hazardFilter} onChange={e => setHazardFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
              <option value="ALL">All Hazard Levels</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="EXTREME">Extreme</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FlaskConical className="h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No chemicals found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Chemical", "CAS Number", "Formula", "Category", "Hazard", "Status", "Batches", ""].map(col => (
                    <th key={col} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(chem => {
                  const isExp      = expanded === chem.id;
                  const detail     = batchData[chem.id];
                  const isLoading  = batchLoading[chem.id];
                  const fetchErr   = batchError[chem.id];
                  const batchCount = detail?.totalBatches ?? chem._count?.batches ?? 0;

                  return (
                    <Fragment key={chem.id}>
                      {/* ── Chemical row ── */}
                      <tr className="transition hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                              <FlaskConical className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{chem.name}</p>
                              {detail && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Total stock:{" "}
                                  <span className="font-bold text-orange-700">
                                    {detail.totalStock.toLocaleString()} {detail.batches[0]?.unit?.symbol ?? ""}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">{chem.casNumber || "—"}</td>
                        <td className="px-5 py-4 font-mono text-sm text-gray-600">{chem.formula || "—"}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{chem.category?.name || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hBadge(chem.hazardLevel)}`}>
                            {chem.hazardLevel}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chem.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {chem.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {batchCount} batch{batchCount !== 1 ? "es" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleExpand(chem.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100">
                            {isLoading
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : isExp
                              ? <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                              : <><Eye className="h-3.5 w-3.5" /> Details</>
                            }
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded batch details ── */}
                      {isExp && (
                        <tr>
                          <td colSpan={8} className="bg-orange-50/40 px-5 py-4">
                            {isLoading && (
                              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                                Loading batch data…
                              </div>
                            )}

                            {fetchErr && (
                              <p className="py-2 text-sm text-red-600">{fetchErr}</p>
                            )}

                            {!isLoading && !fetchErr && detail && (
                              <>
                                {/* Summary bar */}
                                <div className="mb-3 flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Total available stock:&nbsp;
                                    <span className="text-base text-gray-900">
                                      {detail.totalStock.toLocaleString()} {detail.batches[0]?.unit?.symbol ?? ""}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs text-gray-500">{detail.totalBatches} batch{detail.totalBatches !== 1 ? "es" : ""}</span>
                                </div>

                                {detail.batches.length === 0 ? (
                                  <p className="py-2 text-sm text-gray-400">No batches found for this chemical.</p>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {detail.batches.map(b => (
                                      <div key={b.id} className="rounded-xl border border-orange-100 bg-white p-3.5 shadow-sm">
                                        {/* Batch header */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <Hash className="h-3 w-3 text-gray-400" />
                                            <p className="text-xs font-bold text-gray-800">{b.batchNumber}</p>
                                          </div>
                                          <span className={`text-[10px] font-bold uppercase tracking-wide ${BATCH_STATUS[b.status] ?? "text-gray-500"}`}>
                                            {b.status.replace("_", " ")}
                                          </span>
                                        </div>

                                        {/* Stock amount — prominent */}
                                        <div className="mt-2.5 flex items-end gap-1">
                                          <span className="text-2xl font-extrabold text-gray-900">
                                            {Number(b.quantity).toLocaleString()}
                                          </span>
                                          <span className="mb-0.5 text-sm font-semibold text-gray-500">{b.unit?.symbol}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                          Min. stock: {Number(b.minimumStock).toLocaleString()} {b.unit?.symbol}
                                        </p>

                                        {/* Stock bar */}
                                        {b.minimumStock > 0 && (
                                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                b.status === "AVAILABLE" ? "bg-green-500" :
                                                b.status === "LOW_STOCK" ? "bg-amber-400" : "bg-red-400"
                                              }`}
                                              style={{ width: `${Math.min(100, (Number(b.quantity) / (Number(b.minimumStock) * 3)) * 100)}%` }}
                                            />
                                          </div>
                                        )}

                                        {/* Meta */}
                                        <div className="mt-2.5 space-y-1">
                                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                              {b.storageLocation?.name}
                                              {b.storageLocation?.building ? ` · ${b.storageLocation.building}` : ""}
                                              {b.storageLocation?.room ? ` Rm ${b.storageLocation.room}` : ""}
                                            </span>
                                          </div>
                                          {b.expiryDate && (
                                            <p className="text-[11px] text-gray-500">
                                              Expires: <span className={new Date(b.expiryDate) < new Date() ? "font-semibold text-red-600" : ""}>{fmtDate(b.expiryDate)}</span>
                                            </p>
                                          )}
                                          {b._count && (
                                            <p className="text-[11px] text-gray-400">{b._count.issuances} issuance{b._count.issuances !== 1 ? "s" : ""}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <Link href="/lab-technician/batches"
                                  className="mt-3 inline-flex text-xs font-semibold text-orange-600 hover:text-orange-800">
                                  View all batches →
                                </Link>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{chemicals.length}</span> chemicals
          </div>
        </div>
      )}
    </div>
  );
}
