"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Unit            { id: string; name: string; symbol: string; }
interface StorageLocation { id: string; name: string; }

interface FormState {
  batchNumber: string;
  quantity: string;
  minimumStock: string;
  purchaseDate: string;
  expiryDate: string;
  status: string;
  unitId: string;
  storageLocationId: string;
}

const toDateInput = (d: string | null) => {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
};

export default function EditBatchPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    batchNumber: "", quantity: "", minimumStock: "",
    purchaseDate: "", expiryDate: "",
    status: "AVAILABLE", unitId: "", storageLocationId: "",
  });

  const [chemicalName,     setChemicalName]     = useState("");
  const [units,            setUnits]            = useState<Unit[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  /* ── load ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API}/chemical-batches/${id}`, { headers }).then(r => r.json()),
      fetch(`${API}/units`,                  { headers }).then(r => r.json()),
      fetch(`${API}/storage-locations`,      { headers }).then(r => r.json()),
    ])
      .then(([batchRes, unitRes, locRes]) => {
        if (!batchRes.success) { setError(batchRes.message || "Batch not found."); return; }
        const b = batchRes.data;
        setChemicalName(b.chemical?.name ?? "");
        setForm({
          batchNumber:       b.batchNumber       ?? "",
          quantity:          String(b.quantity   ?? ""),
          minimumStock:      String(b.minimumStock ?? ""),
          purchaseDate:      toDateInput(b.purchaseDate),
          expiryDate:        toDateInput(b.expiryDate),
          status:            b.status            ?? "AVAILABLE",
          unitId:            b.unitId            ?? "",
          storageLocationId: b.storageLocationId ?? "",
        });
        if (unitRes.success) setUnits(unitRes.data        ?? []);
        if (locRes.success)  setStorageLocations(locRes.data ?? []);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setPageLoading(false));
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  /* ── submit ── */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.batchNumber.trim()) { setError("Batch number is required."); return; }
    if (form.quantity === "")     { setError("Quantity is required.");      return; }
    if (form.minimumStock === "") { setError("Minimum stock is required."); return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    try {
      setSubmitting(true);

      const body: Record<string, string | number> = {
        batchNumber:       form.batchNumber.trim(),
        quantity:          Number(form.quantity),
        minimumStock:      Number(form.minimumStock),
        status:            form.status,
        unitId:            form.unitId,
        storageLocationId: form.storageLocationId,
      };
      if (form.purchaseDate) body.purchaseDate = form.purchaseDate;
      if (form.expiryDate)   body.expiryDate   = form.expiryDate;

      const res = await fetch(`${API}/chemical-batches/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok || !result.success)
        throw new Error(result.message || "Failed to update batch.");

      router.push("/admin/dashboard/batches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update batch.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard/batches" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          ← Back to Batches
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Edit Batch</h1>
        {chemicalName && (
          <p className="mt-1 text-gray-500">
            Chemical: <span className="font-medium text-gray-700">{chemicalName}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Batch Number */}
          <div>
            <label htmlFor="batchNumber" className="mb-2 block text-sm font-medium text-gray-700">
              Batch Number <span className="text-red-500">*</span>
            </label>
            <input
              id="batchNumber" name="batchNumber" type="text" required
              value={form.batchNumber} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Quantity + Min Stock */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-gray-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="quantity" name="quantity" type="number" min="0" step="any" required
                value={form.quantity} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="minimumStock" className="mb-2 block text-sm font-medium text-gray-700">
                Minimum Stock <span className="text-red-500">*</span>
              </label>
              <input
                id="minimumStock" name="minimumStock" type="number" min="0" step="any" required
                value={form.minimumStock} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unitId" className="mb-2 block text-sm font-medium text-gray-700">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="unitId" name="unitId" required
              value={form.unitId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
              ))}
            </select>
          </div>

          {/* Storage Location */}
          <div>
            <label htmlFor="storageLocationId" className="mb-2 block text-sm font-medium text-gray-700">
              Storage Location <span className="text-red-500">*</span>
            </label>
            <select
              id="storageLocationId" name="storageLocationId" required
              value={form.storageLocationId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select storage location</option>
              {storageLocations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Status (manual override) */}
          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status" name="status"
              value={form.status} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="AVAILABLE">Available</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="DEPLETED">Depleted</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="purchaseDate" className="mb-2 block text-sm font-medium text-gray-700">
                Purchase Date <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="purchaseDate" name="purchaseDate" type="date"
                value={form.purchaseDate} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="expiryDate" className="mb-2 block text-sm font-medium text-gray-700">
                Expiry Date <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="expiryDate" name="expiryDate" type="date"
                value={form.expiryDate} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <Link
              href="/admin/dashboard/batches"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
