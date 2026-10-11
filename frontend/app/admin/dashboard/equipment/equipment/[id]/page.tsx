"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  Cpu, ArrowLeft, MapPin, Tag, Calendar,
  Settings, Trash2, Loader2, AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Equipment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serialNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  purchaseDate: string | null;
  status: string;
  location: string | null;
  category: { id: string; name: string; code: string };
  laboratory: { id: string; name: string } | null;
  requests: Array<{
    id: string;
    requestNumber: string;
    purpose: string;
    requestedFrom: string;
    requestedTo: string;
    status: string;
    requestedBy: { firstName: string; lastName: string; email: string };
  }>;
  maintenances: Array<{
    id: string;
    maintenanceNumber: string;
    type: string;
    status: string;
    scheduledDate: string;
    completedDate: string | null;
    description: string;
  }>;
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

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    fetch(`${API}/equipment/${id}`, { headers })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setEquipment(res.data);
        } else {
          setError(res.message || "Failed to load equipment");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load equipment. Please try again.");
        setLoading(false);
      });
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this equipment? This action cannot be undone.")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setDeleting(true);
      const res = await fetch(`${API}/equipment/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to delete equipment");
      }

      toast.success("Equipment deleted successfully!");
      router.push("/admin/dashboard/equipment/equipment");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete equipment";
      toast.error(msg);
    } finally {
      setDeleting(false);
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading equipment details...</p>
        </div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="font-semibold text-red-700">{error || "Equipment not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/dashboard/equipment/equipment"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Equipment
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{equipment.name}</h1>
          <p className="mt-2 text-gray-500">{equipment.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/dashboard/equipment/equipment/${equipment.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Equipment Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Code</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.model || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Serial Number</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.serialNumber || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Manufacturer</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.manufacturer || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[equipment.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {equipment.status.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  {equipment.location || equipment.laboratory?.name || "—"}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  {equipment.category.name} ({equipment.category.code})
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Laboratory</p>
                <p className="mt-1 text-sm text-gray-900">{equipment.laboratory?.name || "—"}</p>
              </div>
            </div>
            {equipment.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-700">{equipment.description}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Requests</h2>
            {equipment.requests.length === 0 ? (
              <p className="text-sm text-gray-500">No requests yet</p>
            ) : (
              <div className="space-y-3">
                {equipment.requests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{req.requestNumber}</p>
                        <p className="text-xs text-gray-500">{req.purpose}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        req.status === "APPROVED" ? "bg-green-100 text-green-700" :
                        req.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{req.requestedBy.firstName} {req.requestedBy.lastName}</span>
                      <span>{formatDate(req.requestedFrom)} - {formatDate(req.requestedTo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Maintenance</h2>
            {equipment.maintenances.length === 0 ? (
              <p className="text-sm text-gray-500">No maintenance records yet</p>
            ) : (
              <div className="space-y-3">
                {equipment.maintenances.map((mnt) => (
                  <div key={mnt.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{mnt.maintenanceNumber}</p>
                        <p className="text-xs text-gray-500">{mnt.type}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        mnt.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        mnt.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {mnt.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Scheduled: {formatDate(mnt.scheduledDate)}</span>
                      {mnt.completedDate && <span>Completed: {formatDate(mnt.completedDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Requests</span>
                <span className="text-2xl font-bold text-gray-900">{equipment.requests.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Maintenance Records</span>
                <span className="text-2xl font-bold text-gray-900">{equipment.maintenances.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Current Status</span>
                <span className={`text-lg font-semibold ${STATUS_COLORS[equipment.status] ?? "text-gray-600"}`}>
                  {equipment.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/admin/dashboard/equipment/equipment/${equipment.id}/edit`}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit Equipment
              </Link>
              <Link
                href="/admin/dashboard/equipment/maintenance"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Maintenance
              </Link>
              <Link
                href="/admin/dashboard/equipment/requests"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
