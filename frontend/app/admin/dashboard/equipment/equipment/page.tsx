"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cpu, Plus, Search, Pencil, Trash2, Eye,
  ChevronDown, Loader2, MapPin, Tag,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Equipment {
  id: string; name: string; code: string; model: string | null;
  manufacturer: string | null; serialNumber: string | null;
  status: string; location: string | null;
  category: { name: string; code: string };
  laboratory: { name: string } | null;
  _count?: { requests: number; maintenances: number };
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE:         "bg-green-100 text-green-700",
  IN_USE:            "bg-blue-100 text-blue-700",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-700",
  RETIRED:           "bg-gray-100 text-gray-500",
};

const authH = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

export default function EquipmentListPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState("ALL");
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/equipment`, { headers: authH() });
      const d = await r.json();
      if (d.success) setEquipment(d.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try {
      const r = await fetch(`${API}/equipment/${id}`, { method: "DELETE", headers: authH() });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message);
      toast.success("Equipment deleted.");
      setEquipment(prev => prev.filter(e => e.id !== id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete."); }
    finally { setDeleting(null); }
  };

  const filtered = equipment.filter(e => {
    const q = search.toLowerCase();
    return (
      (e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q) ||
       (e.model ?? "").toLowerCase().includes(q) || (e.manufacturer ?? "").toLowerCase().includes(q)) &&
      (statusF === "ALL" || e.status === statusF)
    );
  });

  const count = (s: string) => equipment.filter(e => e.status === s).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
            <p className="text-sm text-gray-500">Manage laboratory equipment inventory</p>
          </div>
        </div>
        <Link href="/admin/dashboard/equipment/equipment/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
          <Plus className="h-4 w-4" /> Add Equipment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total",             value: equipment.length,           color: "text-gray-900"  },
          { label: "Available",         value: count("AVAILABLE"),         color: "text-green-700" },
          { label: "In Use",            value: count("IN_USE"),            color: "text-blue-700"  },
          { label: "Under Maintenance", value: count("UNDER_MAINTENANCE"), color: "text-amber-700" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, code, model…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="relative">
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm outline-none focus:border-blue-500">
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Cpu className="h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No equipment found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Equipment","Code","Category","Model / S/N","Location","Status","Actions"].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                          <Cpu className="h-4 w-4 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{eq.name}</p>
                          {eq.manufacturer && <p className="text-xs text-gray-400">{eq.manufacturer}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">{eq.code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {eq.category.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <p>{eq.model || "—"}</p>
                      {eq.serialNumber && <p className="text-xs text-gray-400">S/N: {eq.serialNumber}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {eq.location || eq.laboratory?.name || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[eq.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {eq.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/dashboard/equipment/equipment/${eq.id}`}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/admin/dashboard/equipment/equipment/${eq.id}/edit`}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={() => del(eq.id, eq.name)} disabled={deleting === eq.id}
                          className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50">
                          {deleting === eq.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            Showing {filtered.length} of {equipment.length} items
          </div>
        </div>
      )}
    </div>
  );
}
