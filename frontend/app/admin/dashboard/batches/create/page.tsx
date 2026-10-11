"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical        { id: string; name: string; }
interface Unit            { id: string; name: string; symbol: string; }
interface StorageLocation { id: string; name: string; }

interface FormState {
  batchNumber: string;
  quantity: string;
  minimumStock: string;
  purchaseDate: string;
  expiryDate: string;
  chemicalId: string;
  unitId: string;
  storageLocationId: string;
}

export default function CreateBatchPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    batchNumber: "", quantity: "", minimumStock: "",
    purchaseDate: "", expiryDate: "",
    chemicalId: "", unitId: "", storageLocationId: "",
  });

  const [chemicals,        setChemicals]        = useState<Chemical[]>([]);
  const [units,            setUnits]            = useState<Unit[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [loadError,  setLoadError]  = useState("");

  /* ── load dropdowns ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API}/chemicals`,         { headers }).then(r => r.json()),
      fetch(`${API}/units`,             { headers }).then(r => r.json()),
      fetch(`${API}/storage-locations`, { headers }).then(r => r.json()),
    ])
      .then(([chemRes, unitRes, locRes]) => {
        if (chemRes.success) setChemicals(chemRes.data        ?? []);
        if (unitRes.success) setUnits(unitRes.data             ?? []);
        if (locRes.success)  setStorageLocations(locRes.data   ?? []);
      })
      .catch(() => setLoadError("Failed to load form data. Please refresh."));
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  /* ── submit ── */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.batchNumber.trim())    { setError("Batch number is required.");       return; }
    if (form.quantity === "")        { setError("Quantity is required.");           return; }
    if (form.minimumStock === "")    { setError("Minimum stock is required.");      return; }
    if (!form.chemicalId)            { setError("Chemical is required.");           return; }
    if (!form.unitId)                { setError("Unit is required.");               return; }
    if (!form.storageLocationId)     { setError("Storage location is required.");   return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    try {
      setSubmitting(true);

      const body: Record<string, string | number> = {
        batchNumber:       form.batchNumber.trim(),
        quantity:          Number(form.quantity),
        minimumStock:      Number(form.minimumStock),
        chemicalId:        form.chemicalId,
        unitId:            form.unitId,
        storageLocationId: form.storageLocationId,
      };
      if (form.purchaseDate) body.purchaseDate = form.purchaseDate;
      if (form.expiryDate)   body.expiryDate   = form.expiryDate;

      const res = await fetch(`${API}/chemical-batches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok || !result.success)
        throw new Error(result.message || "Failed to create batch.");

      router.push("/admin/dashboard/batches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create batch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard/batches" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          ← Back to Batches
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Add Batch</h1>
        <p className="mt-2 text-gray-500">Register a new chemical stock batch.</p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {loadError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Chemical */}
          <div>
            <label htmlFor="chemicalId" className="mb-2 block text-sm font-medium text-gray-700">
              Chemical <span className="text-red-500">*</span>
            </label>
            <select
              id="chemicalId" name="chemicalId" required
              value={form.chemicalId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select chemical</option>
              {chemicals.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Batch Number */}
          <div>
            <label htmlFor="batchNumber" className="mb-2 block text-sm font-medium text-gray-700">
              Batch Number <span className="text-red-500">*</span>
            </label>
            <input
              id="batchNumber" name="batchNumber" type="text" required
              value={form.batchNumber} onChange={handleChange}
              placeholder="e.g. BATCH-2024-001"
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
                placeholder="e.g. 500"
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
                placeholder="e.g. 50"
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

          {/* Purchase Date + Expiry Date */}
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

          {/* Note about auto status */}
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Status is set automatically: <strong>Depleted</strong> if quantity = 0,{" "}
            <strong>Low Stock</strong> if quantity ≤ minimum stock, otherwise{" "}
            <strong>Available</strong>.
          </p>

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
              {submitting ? "Saving..." : "Add Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
