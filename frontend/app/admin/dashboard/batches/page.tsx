"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical      { id: string; name: string; }
interface Unit          { id: string; name: string; symbol: string; }
interface StorageLocation { id: string; name: string; }

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  status: "AVAILABLE" | "LOW_STOCK" | "DEPLETED" | "EXPIRED";
  chemicalId: string;
  unitId: string;
  storageLocationId: string;
  chemical: Chemical;
  unit: Unit;
  storageLocation: StorageLocation;
  createdAt: string;
}

export default function BatchesPage() {
  const [batches,      setBatches]      = useState<Batch[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* delete modal */
  const [deleteTarget,  setDeleteTarget]  = useState<Batch | null>(null);
  const [deleteError,   setDeleteError]   = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── fetch ── */
  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Authentication token not found."); return; }

      const res = await fetch(`${API}/chemical-batches`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load batches");
      setBatches(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  /* ── delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chemical-batches/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to delete batch.");
      setBatches(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete batch.");
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── filter ── */
  const filtered = batches.filter(b => {
    const q = search.toLowerCase();
    return (
      (b.batchNumber.toLowerCase().includes(q) ||
       b.chemical.name.toLowerCase().includes(q) ||
       b.storageLocation.name.toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || b.status === statusFilter)
    );
  });

  const statusClass = (s: Batch["status"]) => {
    switch (s) {
      case "AVAILABLE":  return "bg-green-100 text-green-700";
      case "LOW_STOCK":  return "bg-yellow-100 text-yellow-700";
      case "DEPLETED":   return "bg-gray-100 text-gray-600";
      case "EXPIRED":    return "bg-red-100 text-red-700";
      default:           return "bg-gray-100 text-gray-600";
    }
  };

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div>
      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete Batch</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete batch{" "}
              <span className="font-semibold text-gray-900">{deleteTarget.batchNumber}</span>{" "}
              for <span className="font-semibold text-gray-900">{deleteTarget.chemical.name}</span>?
              This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                disabled={deleteLoading}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chemical Batches</h1>
          <p className="mt-1 text-gray-500">Manage stock batches for laboratory chemicals.</p>
        </div>
        <Link
          href="/admin/dashboard/batches/create"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          + Add Batch
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[
          { label: "Total Batches",  value: batches.length,                                            color: "text-gray-900" },
          { label: "Available",      value: batches.filter(b => b.status === "AVAILABLE").length,      color: "text-green-600" },
          { label: "Low Stock",      value: batches.filter(b => b.status === "LOW_STOCK").length,      color: "text-yellow-600" },
          { label: "Depleted/Expired", value: batches.filter(b => b.status === "DEPLETED" || b.status === "EXPIRED").length, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <h2 className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Search by batch number, chemical or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="DEPLETED">Depleted</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-gray-500">Loading batches...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Batch Number", "Chemical", "Quantity", "Min. Stock", "Storage Location", "Expiry Date", "Status", "Actions"].map(h => (
                    <th key={h} className={`px-6 py-4 text-sm font-semibold text-gray-700 ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No batches found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(batch => (
                    <tr key={batch.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{batch.batchNumber}</p>
                        <p className="text-xs text-gray-400">{fmt(batch.purchaseDate)}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{batch.chemical.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {batch.quantity} {batch.unit.symbol}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {batch.minimumStock} {batch.unit.symbol}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{batch.storageLocation.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{fmt(batch.expiryDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(batch.status)}`}>
                          {batch.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/dashboard/batches/${batch.id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >View</Link>
                          <Link
                            href={`/admin/dashboard/batches/${batch.id}/edit`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => { setDeleteError(""); setDeleteTarget(batch); }}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{batches.length}</span> batches
          </div>
        </div>
      )}
    </div>
  );
}
