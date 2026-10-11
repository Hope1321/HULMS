"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskRound, Plus, Pencil, Trash2, Users, MapPin, X as XIcon } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface College    { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; college: College; }

interface Laboratory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  department: Department;
  _count: { users: number };
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default function LaboratoriesPage() {
  const [labs,    setLabs]    = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");

  /* delete modal */
  const [deleteTarget,  setDeleteTarget]  = useState<Laboratory | null>(null);
  const [deleteError,   setDeleteError]   = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── fetch ── */
  const fetchLabs = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/laboratories`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load laboratories");
      setLabs(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load laboratories");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLabs(); }, []);

  /* ── delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(""); setDeleteLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/laboratories/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to delete.");
      setLabs(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete.");
    } finally { setDeleteLoading(false); }
  };

  const filtered = labs.filter(l => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      (l.location ?? "").toLowerCase().includes(q) ||
      l.department.name.toLowerCase().includes(q) ||
      l.department.college.name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                className="rounded-lg p-1 hover:bg-gray-100">
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Delete Laboratory</h2>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-semibold text-gray-900">{deleteTarget.name}</span>?
              This cannot be undone. Laboratories with assigned users cannot be deleted.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }} disabled={deleteLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <FlaskRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratories</h1>
            <p className="text-sm text-gray-500">Manage university laboratories</p>
          </div>
        </div>
        <Link href="/admin/dashboard/laboratories/create"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add Laboratory
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Laboratories", value: labs.length,                                   color: "text-gray-900"  },
          { label: "Total Users",        value: labs.reduce((s, l) => s + l._count.users, 0),  color: "text-teal-700"  },
          { label: "Departments",        value: new Set(labs.map(l => l.department.id)).size,   color: "text-blue-700"  },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
        <input type="text" placeholder="Name, code, location, department, or college…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
          <p className="mt-4 text-sm text-gray-500">Loading laboratories…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <FlaskRound className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No laboratories found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or add a new laboratory</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Laboratory", "Code", "Department / College", "Location", "Users", "Created", "Actions"].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(lab => (
                  <tr key={lab.id} className="group transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{lab.name}</p>
                      {lab.description && (
                        <p className="mt-0.5 max-w-[200px] truncate text-xs text-gray-400">{lab.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                        {lab.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{lab.department.name}</p>
                      <p className="text-xs text-gray-400">{lab.department.college.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      {lab.location ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {lab.location}
                        </div>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {lab._count.users}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{fmt(lab.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/dashboard/laboratories/${lab.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100">
                          View</Link>
                        <Link href={`/admin/dashboard/laboratories/${lab.id}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                        <button onClick={() => { setDeleteError(""); setDeleteTarget(lab); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3.5 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{labs.length}</span> laboratories
          </div>
        </div>
      )}
    </div>
  );
}
