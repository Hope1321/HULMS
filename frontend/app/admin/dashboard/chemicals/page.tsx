"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category { id: string; name: string; }
interface Supplier { id: string; name: string; }

interface Chemical {
  id: string;
  name: string;
  casNumber: string;
  formula: string;
  description?: string | null;
  hazardLevel: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  status: "ACTIVE" | "INACTIVE";
  categoryId?: string | null;
  supplierId?: string | null;
  category?: Category | null;
  supplier?: Supplier | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: Chemical[];
}

export default function ChemicalsPage() {
  const [chemicals,    setChemicals]    = useState<Chemical[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  const [search,       setSearch]       = useState("");
  const [hazardFilter, setHazardFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* delete modal */
  const [deleteTarget,   setDeleteTarget]   = useState<Chemical | null>(null);
  const [deleteError,    setDeleteError]    = useState("");
  const [deleteLoading,  setDeleteLoading]  = useState(false);

  /* ── fetch ── */
  const fetchChemicals = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Authentication token not found. Please login again."); return; }

      const response = await fetch(`${API}/chemicals`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result: ApiResponse = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to retrieve chemicals");
      setChemicals(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retrieve chemicals");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchChemicals(); }, []);

  /* ── delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/chemicals/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to delete chemical.");

      toast.success(`"${deleteTarget.name}" deleted successfully.`);
      setChemicals(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete chemical.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── filter ── */
  const filtered = chemicals.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) ||
       c.casNumber.toLowerCase().includes(q) ||
       c.formula.toLowerCase().includes(q)) &&
      (hazardFilter === "ALL" || c.hazardLevel === hazardFilter) &&
      (statusFilter === "ALL" || c.status === statusFilter)
    );
  });

  const hazardClass = (level: Chemical["hazardLevel"]) => {
    switch (level) {
      case "LOW":      return "bg-green-100 text-green-700";
      case "MODERATE": return "bg-yellow-100 text-yellow-700";
      case "HIGH":     return "bg-orange-100 text-orange-700";
      case "EXTREME":  return "bg-red-100 text-red-700";
      default:         return "bg-gray-100 text-gray-700";
    }
  };

  const statusClass = (s: Chemical["status"]) =>
    s === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  return (
    <div>
      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete Chemical</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">{deleteTarget.name}</span>?
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

      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chemicals</h1>
          <p className="mt-1 text-gray-500">
            Manage laboratory chemicals and their safety information.
          </p>
        </div>
        <Link
          href="/admin/dashboard/chemicals/create"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          + Add Chemical
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Chemicals", value: chemicals.length,                                                                          color: "text-gray-900" },
          { label: "Active",          value: chemicals.filter(c => c.status === "ACTIVE").length,                                       color: "text-green-600" },
          { label: "High Hazard",     value: chemicals.filter(c => c.hazardLevel === "HIGH" || c.hazardLevel === "EXTREME").length,      color: "text-orange-600" },
          { label: "Inactive",        value: chemicals.filter(c => c.status === "INACTIVE").length,                                     color: "text-gray-600" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <h2 className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</h2>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Search by name, CAS or formula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Hazard Level</label>
            <select
              value={hazardFilter}
              onChange={e => setHazardFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Hazard Levels</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="EXTREME">Extreme</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
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
          <p className="text-gray-500">Loading chemicals...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Chemical", "CAS Number", "Formula", "Category", "Hazard", "Status", "Actions"].map(h => (
                    <th
                      key={h}
                      className={`px-6 py-4 text-sm font-semibold text-gray-700 ${h === "Actions" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No chemicals found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(chemical => (
                    <tr key={chemical.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{chemical.name}</p>
                        {chemical.description && (
                          <p className="mt-1 max-w-xs truncate text-sm text-gray-500">
                            {chemical.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{chemical.casNumber || "—"}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{chemical.formula || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{chemical.category?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${hazardClass(chemical.hazardLevel)}`}>
                          {chemical.hazardLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(chemical.status)}`}>
                          {chemical.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/dashboard/chemicals/${chemical.id}`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >View</Link>
                          <Link
                            href={`/admin/dashboard/chemicals/${chemical.id}/edit`}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => { setDeleteError(""); setDeleteTarget(chemical); }}
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
            Showing{" "}
            <span className="font-semibold text-gray-700">{filtered.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">{chemicals.length}</span>{" "}
            chemicals
          </div>
        </div>
      )}
    </div>
  );
}
