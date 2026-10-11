"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  FlaskConical, Pencil, Package, ShieldAlert,
  Info, Tag, Trash2, AlertTriangle, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category  { id: string; name: string; }
interface Supplier  { id: string; name: string; contactEmail?: string | null; phone?: string | null; }
interface Unit      { id: string; name: string; symbol: string; }
interface Batch {
  id: string; batchNumber: string; quantity: number; minimumStock: number;
  status: string; expiryDate: string | null; purchaseDate: string | null;
  unit: Unit;
  storageLocation: { name: string; building?: string | null; room?: string | null; };
}
interface Chemical {
  id: string; name: string; casNumber: string | null; formula: string | null;
  description: string | null; hazardLevel: string; status: string;
  category: Category | null; supplier: Supplier | null; batches: Batch[];
  createdAt: string; updatedAt: string;
  _count?: { batches: number; requestItems: number; alerts: number };
}

const HAZARD: Record<string, { badge: string; bar: string; label: string; pct: number }> = {
  LOW:      { badge: "bg-green-100 text-green-700",   bar: "bg-green-500",  label: "Low",      pct: 25  },
  MODERATE: { badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-400", label: "Moderate", pct: 50  },
  HIGH:     { badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500", label: "High",     pct: 75  },
  EXTREME:  { badge: "bg-red-100 text-red-700",       bar: "bg-red-600",    label: "Extreme",  pct: 100 },
};

const BATCH_STATUS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-yellow-100 text-yellow-700",
  DEPLETED:  "bg-gray-100 text-gray-600",
  EXPIRED:   "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

/* ── Delete Confirmation Modal ── */
function DeleteModal({
  chemical,
  onCancel,
  onConfirm,
  loading,
  error,
}: {
  chemical: Chemical;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string;
}) {
  const hasBatches = (chemical._count?.batches ?? (chemical.batches ?? []).length) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold text-gray-900">Delete Chemical</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">{chemical.name}</span>? This
          action cannot be undone.
        </p>

        {/* Warning if batches exist */}
        {hasBatches && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              This chemical has{" "}
              <strong>{chemical._count?.batches ?? (chemical.batches ?? []).length} batch{(chemical._count?.batches ?? (chemical.batches ?? []).length) !== 1 ? "es" : ""}</strong> associated with it.
              Deletion will be blocked by the server. Consider setting the status to{" "}
              <strong>INACTIVE</strong> instead.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function ChemicalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [chem,         setChem]         = useState<Chemical | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleteLoading,setDeleteLoading]= useState(false);
  const [deleteError,  setDeleteError]  = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/chemicals/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || "Not found.");
        setChem(res.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleDelete = async () => {
    if (!chem) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res   = await fetch(`${API}/chemicals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success)
        throw new Error(result.message || "Failed to delete chemical.");
      // Deleted — go back to list
      toast.success(`"${chem.name}" deleted successfully.`);
      router.push("/admin/dashboard/chemicals");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete.";
      setDeleteError(msg);
      toast.error(msg);
      setDeleteLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );

  /* ── Error ── */
  if (error || !chem) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Chemical not found."}</p>
      <Link href="/admin/dashboard/chemicals" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Chemicals
      </Link>
    </div>
  );

  const hazard   = HAZARD[chem.hazardLevel] ?? HAZARD.LOW;
  const batches  = chem.batches ?? [];
  const totalQty = batches.reduce((s, b) => s + Number(b.quantity), 0);

  return (
    <>
      {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          chemical={chem}
          onCancel={() => { setShowDelete(false); setDeleteError(""); }}
          onConfirm={handleDelete}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400">
          <Link href="/admin/dashboard" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/dashboard/chemicals" className="hover:text-gray-600">Chemicals</Link>
          <span>/</span>
          <span className="font-medium text-gray-700">{chem.name}</span>
        </nav>

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <FlaskConical className="h-7 w-7 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{chem.name}</h1>
              {chem.formula && (
                <p className="mt-0.5 font-mono text-sm text-gray-500">{chem.formula}</p>
              )}
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${chem.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {chem.status}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/dashboard/chemicals/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={() => { setDeleteError(""); setShowDelete(true); }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Package,     label: "Total Batches",  value: chem._count?.batches ?? batches.length, color: "bg-blue-50 text-blue-700"   },
            { icon: FlaskConical,label: "Total Stock",     value: `${totalQty} units`,                    color: "bg-indigo-50 text-indigo-700" },
            { icon: Info,        label: "Request Items",   value: chem._count?.requestItems ?? "—",            color: "bg-amber-50 text-amber-700"  },
            { icon: ShieldAlert, label: "Active Alerts",   value: chem._count?.alerts ?? "—",                  color: "bg-red-50 text-red-700"      },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xl font-bold text-gray-900">{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Details card ── */}
          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="font-semibold text-gray-900">Chemical Information</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Chemical Name" value={chem.name} />
              <Field label="CAS Number"   value={chem.casNumber} />
              <Field label="Formula"      value={chem.formula ? <span className="font-mono">{chem.formula}</span> : null} />
              <Field label="Category"     value={chem.category?.name} />
              <Field label="Supplier"     value={chem.supplier?.name} />
              <Field label="Status"       value={
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${chem.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {chem.status}
                </span>
              } />
              <Field label="Created"  value={fmtFull(chem.createdAt)} />
              <Field label="Updated"  value={fmtFull(chem.updatedAt)} />
              {chem.description && (
                <div className="sm:col-span-2">
                  <Field label="Description" value={chem.description} />
                </div>
              )}
            </div>

            {/* Supplier contact */}
            {chem.supplier && (chem.supplier.contactEmail || chem.supplier.phone) && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Supplier Contact</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                  {chem.supplier.contactEmail && <span>✉ {chem.supplier.contactEmail}</span>}
                  {chem.supplier.phone        && <span>📞 {chem.supplier.phone}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── Side cards ── */}
          <div className="space-y-4">
            {/* Hazard */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Hazard Level</h2>
              </div>
              <div className="mt-4">
                <span className={`rounded-full border px-3 py-1.5 text-sm font-bold ${hazard.badge}`}>
                  {hazard.label}
                </span>
              </div>
              <div className="mt-4">
                <div className="h-2.5 w-full rounded-full bg-gray-100">
                  <div className={`h-2.5 rounded-full ${hazard.bar}`} style={{ width: `${hazard.pct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-gray-400">
                  <span>Low</span><span>Extreme</span>
                </div>
              </div>
            </div>

            {/* Category */}
            {chem.category && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Category</h2>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-800">{chem.category.name}</p>
              </div>
            )}

            {/* Danger zone */}
            <div className="rounded-xl border border-red-100 bg-red-50 p-5">
              <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
              <p className="mt-1.5 text-xs text-red-600">
                Permanently delete this chemical and all associated data.
                This cannot be undone.
              </p>
              <button
                onClick={() => { setDeleteError(""); setShowDelete(true); }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" /> Delete Chemical
              </button>
            </div>
          </div>
        </div>

        {/* ── Batches table ── */}
        {batches.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Batches</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {batches.length}
                </span>
              </div>
              <Link
                href="/admin/dashboard/batches"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View all batches →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Batch #", "Quantity", "Min Stock", "Location", "Purchase Date", "Expiry Date", "Status", ""].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map(b => (
                    <tr key={b.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{b.batchNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{Number(b.quantity)} {b.unit.symbol}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{Number(b.minimumStock)} {b.unit.symbol}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{b.storageLocation.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{fmt(b.purchaseDate)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{fmt(b.expiryDate)}</td>
                      <td className="px-6 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BATCH_STATUS[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/admin/dashboard/batches/${b.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty batches notice */}
        {batches.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Package className="mx-auto h-9 w-9 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">No batches for this chemical</p>
            <Link
              href="/admin/dashboard/batches/create"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              + Create a batch
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
