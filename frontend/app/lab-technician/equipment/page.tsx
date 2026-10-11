"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu, Search, Loader2, MapPin, Tag, Calendar,
  Wrench, ChevronDown, Plus, X,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Equipment {
  id: string;
  name: string;
  code: string;
  model: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  status: string;
  location: string | null;
  category: { name: string; code: string };
  laboratory: { name: string } | null;
  _count?: { maintenances: number };
}

interface Maintenance {
  id: string;
  maintenanceNumber: string;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate: string | null;
  description: string;
  equipment: {
    id: string;
    name: string;
    code: string;
  };
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  IN_USE: "bg-blue-100 text-blue-700",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-700",
  RETIRED: "bg-gray-100 text-gray-500",
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "text-green-700",
  IN_USE: "text-blue-700",
  UNDER_MAINTENANCE: "text-amber-700",
  RETIRED: "text-gray-500",
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

export default function LabTechEquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView] = useState<"equipment" | "maintenance">("equipment");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    equipmentId: "",
    type: "PREVENTIVE",
    scheduledDate: "",
    description: "",
    performedBy: "",
    notes: "",
    cost: "",
  });

  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      const [eqRes, mntRes] = await Promise.all([
        fetch(`${API}/equipment`, { headers: authH() }),
        fetch(`${API}/equipment/maintenance`, { headers: authH() }),
      ]);

      const eqData = await eqRes.json();
      const mntData = await mntRes.json();

      if (eqData.success) setEquipment(eqData.data ?? []);
      if (mntData.success) setMaintenance(mntData.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (e: FormEvent<HTMLFormElement>) => {
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

      const res = await fetch(`${API}/equipment/maintenance`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (!res.ok || !d.success) throw new Error(d.message);

      toast.success("Maintenance record created!");
      setShowModal(false);
      setForm({
        equipmentId: "",
        type: "PREVENTIVE",
        scheduledDate: "",
        description: "",
        performedBy: "",
        notes: "",
        cost: "",
      });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create maintenance");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const filteredEquipment = equipment.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.model ?? "").toLowerCase().includes(q) ||
        (e.manufacturer ?? "").toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || e.status === statusFilter)
    );
  });

  const filteredMaintenance = maintenance.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.maintenanceNumber.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.equipment.name.toLowerCase().includes(q) ||
      m.equipment.code.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const countByStatus = (status: string) =>
    equipment.filter((e) => e.status === status).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
          <p className="text-sm text-gray-500">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
            <p className="text-sm text-gray-500">View laboratory equipment and maintenance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("equipment")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              view === "equipment"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Equipment
          </button>
          <button
            onClick={() => setView("maintenance")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              view === "maintenance"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Maintenance
          </button>
        </div>
      </div>

      {view === "equipment" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total", value: equipment.length, color: "text-gray-900" },
              { label: "Available", value: countByStatus("AVAILABLE"), color: "text-green-700" },
              { label: "In Use", value: countByStatus("IN_USE"), color: "text-blue-700" },
              { label: "Under Maintenance", value: countByStatus("UNDER_MAINTENANCE"), color: "text-amber-700" },
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
                placeholder="Search by name, code, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm outline-none focus:border-orange-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {filteredEquipment.length === 0 ? (
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
                      {["Equipment", "Code", "Category", "Model / S/N", "Location", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEquipment.map((eq) => (
                      <tr key={eq.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                              <Cpu className="h-4 w-4 text-orange-700" />
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
                Showing {filteredEquipment.length} of {equipment.length} items
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Records", value: maintenance.length },
                { label: "Scheduled", value: maintenance.filter((m) => m.status === "SCHEDULED").length },
                { label: "In Progress", value: maintenance.filter((m) => m.status === "IN_PROGRESS").length },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Add Maintenance
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by number, equipment, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {filteredMaintenance.length === 0 ? (
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
                      {["Maintenance #", "Equipment", "Type", "Scheduled", "Completed", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMaintenance.map((mnt) => (
                      <tr key={mnt.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{mnt.maintenanceNumber}</p>
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
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            mnt.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            mnt.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {mnt.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
                Showing {filteredMaintenance.length} of {maintenance.length} records
              </div>
            </div>
          )}
        </>
      )}

      {/* Maintenance Creation Modal */}
      {showModal && (
        <form onSubmit={handleCreateMaintenance}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Add Maintenance Record</h3>
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
                      placeholder="Describe the maintenance work..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Performed By</label>
                    <input
                      type="text"
                      value={form.performedBy}
                      onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Maintenance"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
