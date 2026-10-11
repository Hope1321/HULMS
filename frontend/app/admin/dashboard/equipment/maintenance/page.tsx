"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench, Plus, Pencil, Trash2, Loader2, Search,
  Filter, Calendar, Check, X, AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Equipment {
  id: string;
  name: string;
  code: string;
  category: { name: string };
}

interface Maintenance {
  id: string;
  maintenanceNumber: string;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate: string | null;
  performedBy: string | null;
  description: string;
  notes: string | null;
  cost: number | null;
  equipment: {
    id: string;
    name: string;
    code: string;
    category: { name: string };
  };
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: "text-blue-700",
  CORRECTIVE: "text-red-700",
  CALIBRATION: "text-purple-700",
  INSPECTION: "text-green-700",
};

const authH = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

export default function EquipmentMaintenancePage() {
  const router = useRouter();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    equipmentId: "",
    type: "PREVENTIVE",
    scheduledDate: "",
    description: "",
    performedBy: "",
    notes: "",
    cost: "",
    status: "SCHEDULED",
    completedDate: "",
  });

  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      const [mntRes, eqRes] = await Promise.all([
        fetch(`${API}/equipment/maintenance`, { headers: authH() }),
        fetch(`${API}/equipment`, { headers: authH() }),
      ]);

      const mntData = await mntRes.json();
      const eqData = await eqRes.json();

      if (mntData.success) setMaintenances(mntData.data ?? []);
      if (eqData.success) setEquipment(eqData.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;

    try {
      setDeleting(id);
      const res = await fetch(`${API}/equipment/maintenance/${id}`, {
        method: "DELETE",
        headers: authH(),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message);

      toast.success("Maintenance record deleted");
      setMaintenances((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      equipmentId: "",
      type: "PREVENTIVE",
      scheduledDate: "",
      description: "",
      performedBy: "",
      notes: "",
      cost: "",
      status: "SCHEDULED",
      completedDate: "",
    });
    setShowModal(true);
  };

  const openEditModal = (mnt: Maintenance) => {
    setEditing(mnt);
    setForm({
      equipmentId: mnt.equipment.id,
      type: mnt.type,
      scheduledDate: mnt.scheduledDate.split("T")[0],
      description: mnt.description,
      performedBy: mnt.performedBy || "",
      notes: mnt.notes || "",
      cost: mnt.cost ? String(mnt.cost) : "",
      status: mnt.status,
      completedDate: mnt.completedDate ? mnt.completedDate.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.equipmentId || !form.type || !form.scheduledDate || !form.description) {
      toast.error("Equipment, type, scheduled date, and description are required");
      return;
    }

    try {
      setSaving(true);

      const body: Record<string, any> = {
        equipmentId: form.equipmentId,
        type: form.type,
        scheduledDate: form.scheduledDate,
        description: form.description,
      };

      if (form.performedBy) body.performedBy = form.performedBy;
      if (form.notes) body.notes = form.notes;
      if (form.cost) body.cost = parseFloat(form.cost);
      if (editing) {
        body.status = form.status;
        if (form.completedDate) body.completedDate = form.completedDate;
      }

      const url = editing
        ? `${API}/equipment/maintenance/${editing.id}`
        : `${API}/equipment/maintenance`;
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authH(),
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (!res.ok || !d.success) throw new Error(d.message);

      toast.success(editing ? "Maintenance updated" : "Maintenance created");
      setShowModal(false);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredMaintenances = maintenances.filter((mnt) => {
    const q = search.toLowerCase();
    const matchesSearch =
      mnt.maintenanceNumber.toLowerCase().includes(q) ||
      mnt.description.toLowerCase().includes(q) ||
      mnt.equipment.name.toLowerCase().includes(q) ||
      mnt.equipment.code.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || mnt.status === statusFilter;
    const matchesType = typeFilter === "ALL" || mnt.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const countByStatus = (status: string) =>
    maintenances.filter((m) => m.status === status).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading maintenance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Maintenance</h1>
            <p className="text-sm text-gray-500">Track and manage equipment maintenance schedules</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Add Maintenance
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: maintenances.length, color: "text-gray-900" },
          { label: "Scheduled", value: countByStatus("SCHEDULED"), color: "text-amber-700" },
          { label: "In Progress", value: countByStatus("IN_PROGRESS"), color: "text-blue-700" },
          { label: "Completed", value: countByStatus("COMPLETED"), color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by number, equipment, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="CALIBRATION">Calibration</option>
            <option value="INSPECTION">Inspection</option>
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {filteredMaintenances.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Wrench className="h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No maintenance records found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {[
                    "Maintenance #",
                    "Equipment",
                    "Type",
                    "Scheduled",
                    "Completed",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                        h === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaintenances.map((mnt) => (
                  <tr key={mnt.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{mnt.maintenanceNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(mnt.createdAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{mnt.equipment.name}</p>
                      <p className="text-xs text-gray-400">{mnt.equipment.code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-semibold ${TYPE_COLORS[mnt.type] ?? "text-gray-600"}`}>
                        {mnt.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {formatDate(mnt.scheduledDate)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatDate(mnt.completedDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_BADGE[mnt.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {mnt.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(mnt)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(mnt.id)}
                          disabled={deleting === mnt.id}
                          className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleting === mnt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            Showing {filteredMaintenances.length} of {maintenances.length} records
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? "Edit Maintenance" : "Add Maintenance"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.equipmentId}
                    onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select equipment</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} ({eq.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="CALIBRATION">Calibration</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {editing && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    {form.status === "COMPLETED" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Completed Date</label>
                        <input
                          type="date"
                          value={form.completedDate}
                          onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="Describe the maintenance work..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Performed By</label>
                  <input
                    type="text"
                    value={form.performedBy}
                    onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Technician name or company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editing ? (
                  "Update Maintenance"
                ) : (
                  "Create Maintenance"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
