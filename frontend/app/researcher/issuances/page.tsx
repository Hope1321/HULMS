"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical, Send, Ban, Search,
  Calendar, MapPin, Package, ChevronRight,
  AlertCircle, ShieldAlert, FileText, User,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface Chemical {
  id: string; name: string; casNumber: string | null;
  formula: string | null; hazardLevel: string;
}
interface Unit     { id: string; name: string; symbol: string; }
interface Location { id: string; name: string; building?: string | null; room?: string | null; }

interface Batch {
  id: string; batchNumber: string; quantity: number;
  chemical: Chemical; unit: Unit; storageLocation: Location;
}
interface Request {
  id: string; requestNumber: string; purpose: string;
  requiredDate: string | null; status: string;
}
interface IssuedBy { id: string; firstName: string; lastName: string; email: string; }

interface Issuance {
  id: string; issuanceNumber: string; quantity: number;
  status: "ISSUED" | "CANCELLED"; issuedAt: string | null;
  notes: string | null; createdAt: string;
  request: Request; batch: Batch; issuedBy: IssuedBy;
}

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "â€”";

const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "â€”";

const HAZARD_BADGE: Record<string, string> = {
  LOW:     "bg-green-100 text-violet-700",
  MEDIUM:  "bg-yellow-100 text-yellow-700",
  HIGH:    "bg-orange-100 text-orange-700",
  EXTREME: "bg-red-100 text-red-700",
};

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function StudentIssuancesPage() {
  const [issuances,    setIssuances]    = useState<Issuance[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ISSUED" | "CANCELLED">("ALL");
  const [expanded,     setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    fetch(`${API}/chemical-issuances/my`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || "Failed to load issuances");
        setIssuances(res.data ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* Filter */
  const filtered = issuances.filter(i => {
    const q = search.toLowerCase();
    const matchSearch =
      i.issuanceNumber.toLowerCase().includes(q) ||
      i.batch.chemical.name.toLowerCase().includes(q) ||
      i.request.requestNumber.toLowerCase().includes(q) ||
      i.request.purpose.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countIssued    = issuances.filter(i => i.status === "ISSUED").length;
  const countCancelled = issuances.filter(i => i.status === "CANCELLED").length;

  /* â”€â”€ Loading â”€â”€ */
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-violet-600" />
        <p className="text-sm text-gray-400">Loading your issuancesâ€¦</p>
      </div>
    </div>
  );

  /* â”€â”€ Error â”€â”€ */
  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-900">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issued Chemicals</h1>
            <p className="text-sm text-gray-500">Chemicals issued to you from approved requests</p>
          </div>
        </div>
        <Link
          href="/researcher/requests/create"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-green-100"
        >
          <ChevronRight className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* â”€â”€ Stats â”€â”€ */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Issued",  value: issuances.length, icon: Package,   color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200" },
          { label: "Issued",        value: countIssued,       icon: Send,      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100" },
          { label: "Cancelled",     value: countCancelled,    icon: Ban,       color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-white p-5 shadow-sm`}>
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by issuance #, chemical, requestâ€¦"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ISSUED", "CANCELLED"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                statusFilter === s
                  ? s === "ALL"       ? "border-gray-800 bg-gray-800 text-white"
                  : s === "ISSUED"    ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-600 bg-gray-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "ALL" ? "All" : s === "ISSUED" ? "Issued" : "Cancelled"}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ List â”€â”€ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FlaskConical className="h-12 w-12 text-gray-200" />
          <p className="mt-4 text-sm font-semibold text-gray-500">
            {issuances.length === 0 ? "No chemicals have been issued to you yet" : "No results match your search"}
          </p>
          {issuances.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">
              Chemicals will appear here after your approved requests are issued
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(iss => {
            const isExpanded = expanded === iss.id;
            const isIssued   = iss.status === "ISSUED";

            return (
              <div
                key={iss.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  isIssued ? "border-blue-100" : "border-gray-200 opacity-75"
                }`}
              >
                {/* â”€â”€ Card header row â”€â”€ */}
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">

                  {/* Icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isIssued ? "bg-blue-100" : "bg-gray-100"}`}>
                    <FlaskConical className={`h-5 w-5 ${isIssued ? "text-blue-700" : "text-gray-400"}`} />
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900">{iss.issuanceNumber}</p>
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isIssued
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {isIssued ? <Send className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {iss.status}
                      </span>
                      {/* Hazard badge */}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD_BADGE[iss.batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                        {iss.batch.chemical.hazardLevel}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-gray-700">
                      {iss.batch.chemical.name}
                      {iss.batch.chemical.formula && (
                        <span className="ml-1.5 font-mono text-xs text-gray-400">({iss.batch.chemical.formula})</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <strong className="text-gray-700">{iss.quantity} {iss.batch.unit.symbol}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmt(iss.issuedAt ?? iss.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {iss.request.requestNumber}
                      </span>
                    </div>
                  </div>

                  {/* Toggle details */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : iss.id)}
                    className="shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    {isExpanded ? "Hide" : "Details"}
                  </button>
                </div>

                {/* â”€â”€ Expanded details â”€â”€ */}
                {isExpanded && (
                  <div className="grid gap-4 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">

                    {/* Chemical info */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <FlaskConical className="h-3.5 w-3.5" /> Chemical
                      </p>
                      <p className="font-semibold text-gray-900">{iss.batch.chemical.name}</p>
                      {iss.batch.chemical.casNumber && (
                        <p className="mt-0.5 text-xs text-gray-500">CAS: {iss.batch.chemical.casNumber}</p>
                      )}
                      {iss.batch.chemical.formula && (
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{iss.batch.chemical.formula}</p>
                      )}
                      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD_BADGE[iss.batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                        {iss.batch.chemical.hazardLevel} Hazard
                      </span>
                    </div>

                    {/* Batch & quantity */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <Package className="h-3.5 w-3.5" /> Batch & Quantity
                      </p>
                      <p className="text-xs text-gray-500">Batch Number</p>
                      <p className="font-semibold text-gray-900">{iss.batch.batchNumber}</p>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-blue-700">{iss.quantity}</span>
                        <span className="text-sm text-gray-500">{iss.batch.unit.symbol}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{iss.batch.unit.name}</p>
                      {iss.batch.storageLocation && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {iss.batch.storageLocation.name}
                          {iss.batch.storageLocation.building && ` Â· ${iss.batch.storageLocation.building}`}
                          {iss.batch.storageLocation.room && `, Room ${iss.batch.storageLocation.room}`}
                        </p>
                      )}
                    </div>

                    {/* Request & issuance info */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <FileText className="h-3.5 w-3.5" /> Request & Issuance
                      </p>
                      <p className="text-xs text-gray-500">Request Number</p>
                      <Link
                        href={`/researcher/requests/${iss.request.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {iss.request.requestNumber}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{iss.request.purpose}</p>
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Issued: <span className="font-medium text-gray-700">{fmtFull(iss.issuedAt ?? iss.createdAt)}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <User className="h-3 w-3 shrink-0" />
                          By: <span className="font-medium text-gray-700">{iss.issuedBy.firstName} {iss.issuedBy.lastName}</span>
                        </p>
                      </div>
                      {iss.notes && (
                        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <p className="text-xs font-medium text-gray-500">Notes</p>
                          <p className="mt-0.5 text-xs text-gray-700">{iss.notes}</p>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-center text-sm text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{issuances.length}</span> issuances
        </p>
      )}
    </div>
  );
}
