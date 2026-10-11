"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Pencil, FlaskConical, MapPin, Calendar, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Unit { id: string; name: string; symbol: string; }
interface Batch {
  id: string; batchNumber: string; quantity: number; minimumStock: number;
  status: "AVAILABLE" | "LOW_STOCK" | "DEPLETED" | "EXPIRED";
  purchaseDate: string | null; expiryDate: string | null;
  createdAt: string; updatedAt: string;
  chemical: {
    id: string; name: string; casNumber: string | null; formula: string | null;
    hazardLevel: string; status: string;
    category: { name: string } | null;
    supplier: { name: string; contactEmail?: string | null } | null;
  };
  unit: Unit;
  storageLocation: { id: string; name: string; building?: string | null; room?: string | null; floor?: string | null; };
}

const STATUS_CONFIG: Record<string, { badge: string; bar: string; label: string; pct: number }> = {
  AVAILABLE: { badge: "bg-green-100 text-green-700 border border-green-200",   bar: "bg-green-500",  label: "Available", pct: 100 },
  LOW_STOCK: { badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", bar: "bg-yellow-400", label: "Low Stock",  pct: 35  },
  DEPLETED:  { badge: "bg-gray-100 text-gray-600 border border-gray-200",       bar: "bg-gray-400",   label: "Depleted",  pct: 0   },
  EXPIRED:   { badge: "bg-red-100 text-red-700 border border-red-200",          bar: "bg-red-500",    label: "Expired",   pct: 0   },
};

const HAZARD: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{value ?? <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [batch,   setBatch]   = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/chemical-batches/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || "Not found.");
        setBatch(res.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );

  if (error || !batch) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Batch not found."}</p>
      <Link href="/admin/dashboard/batches" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Batches
      </Link>
    </div>
  );

  const cfg       = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.AVAILABLE;
  const stockPct  = batch.minimumStock > 0 ? Math.min((batch.quantity / (batch.minimumStock * 3)) * 100, 100) : 100;
  const isLow     = batch.quantity <= batch.minimumStock;
  const isExpired = batch.status === "EXPIRED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin/dashboard/batches" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← Back to Batches
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
              <Package className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{batch.batchNumber}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{batch.chemical.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
          <Link href={`/admin/dashboard/batches/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Warnings */}
      {(isLow || isExpired) && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${isExpired ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}>
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${isExpired ? "text-red-600" : "text-yellow-600"}`} />
          <p className={`text-sm font-medium ${isExpired ? "text-red-700" : "text-yellow-700"}`}>
            {isExpired
              ? "This batch has expired and cannot be issued."
              : `Stock is at or below minimum level (${batch.minimumStock} ${batch.unit.symbol}).`}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Batch details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-5">
          <h2 className="font-semibold text-gray-900">Batch Information</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Batch Number"  value={batch.batchNumber} />
            <Field label="Status"        value={
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
            } />
            <Field label="Quantity"      value={`${batch.quantity} ${batch.unit.symbol}`} />
            <Field label="Min Stock"     value={`${batch.minimumStock} ${batch.unit.symbol}`} />
            <Field label="Unit"          value={`${batch.unit.name} (${batch.unit.symbol})`} />
            <Field label="Purchase Date" value={fmt(batch.purchaseDate)} />
            <Field label="Expiry Date"   value={fmt(batch.expiryDate)} />
            <Field label="Created"       value={fmtFull(batch.createdAt)} />
          </div>

          {/* Stock bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Stock Level</span>
              <span>{batch.quantity} / {batch.minimumStock * 3} {batch.unit.symbol}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className={`h-3 rounded-full transition-all ${cfg.bar}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span className="text-amber-600">Min: {batch.minimumStock}</span>
              <span>{batch.minimumStock * 3}</span>
            </div>
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          {/* Chemical */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Chemical</h2>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-800">{batch.chemical.name}</p>
              {batch.chemical.casNumber && (
                <p className="text-xs text-gray-500">CAS: {batch.chemical.casNumber}</p>
              )}
              {batch.chemical.formula && (
                <p className="font-mono text-xs text-gray-500">{batch.chemical.formula}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HAZARD[batch.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                  {batch.chemical.hazardLevel}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${batch.chemical.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {batch.chemical.status}
                </span>
              </div>
            </div>
            <Link href={`/admin/dashboard/chemicals/${batch.chemical.id}`}
              className="mt-4 block text-xs font-medium text-blue-600 hover:text-blue-700">
              View Chemical →
            </Link>
          </div>

          {/* Storage Location */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Storage Location</h2>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium text-gray-800">{batch.storageLocation.name}</p>
              {batch.storageLocation.building && (
                <p className="text-gray-500">Building: {batch.storageLocation.building}</p>
              )}
              {batch.storageLocation.room && (
                <p className="text-gray-500">Room: {batch.storageLocation.room}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Important Dates</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Purchased</span>
                <span className="font-medium text-gray-800">{fmt(batch.purchaseDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expires</span>
                <span className={`font-medium ${isExpired ? "text-red-600" : "text-gray-800"}`}>
                  {fmt(batch.expiryDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
