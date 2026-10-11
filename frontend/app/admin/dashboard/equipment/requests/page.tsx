"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Check, X, Loader2, Search,
  Filter, Calendar, User, MapPin, Tag,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface EquipmentRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requestedFrom: string;
  requestedTo: string;
  status: string;
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
    code: string;
    category: { name: string };
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  RETURNED: "bg-blue-100 text-blue-700",
};

const authH = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
});

export default function EquipmentRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EquipmentRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");

  const loadRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/equipment/requests/all`, { headers: authH() });
      const d = await res.json();
      if (d.success) setRequests(d.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [router]);

  const handleReview = async () => {
    if (!selectedRequest) return;

    try {
      setReviewing(selectedRequest.id);
      const res = await fetch(`${API}/equipment/requests/${selectedRequest.id}/review`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({
          status: reviewDecision,
          reviewNotes: reviewNotes.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message);

      toast.success(`Request ${reviewDecision.toLowerCase()} successfully!`);
      setShowReviewModal(false);
      setReviewNotes("");
      setSelectedRequest(null);
      loadRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review request");
    } finally {
      setReviewing(null);
    }
  };

  const openReviewModal = (request: EquipmentRequest, decision: "APPROVED" | "REJECTED") => {
    setSelectedRequest(request);
    setReviewDecision(decision);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredRequests = requests.filter((req) => {
    const q = search.toLowerCase();
    const matchesSearch =
      req.requestNumber.toLowerCase().includes(q) ||
      req.purpose.toLowerCase().includes(q) ||
      req.equipment.name.toLowerCase().includes(q) ||
      req.equipment.code.toLowerCase().includes(q) ||
      `${req.requestedBy.firstName} ${req.requestedBy.lastName}`.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const countByStatus = (status: string) =>
    requests.filter((r) => r.status === status).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment Requests</h1>
            <p className="text-sm text-gray-500">Review and manage equipment borrowing requests</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: requests.length, color: "text-gray-900" },
          { label: "Pending", value: countByStatus("PENDING"), color: "text-amber-700" },
          { label: "Approved", value: countByStatus("APPROVED"), color: "text-green-700" },
          { label: "Rejected", value: countByStatus("REJECTED"), color: "text-red-700" },
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
            placeholder="Search by request number, equipment, user..."
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
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RETURNED">Returned</option>
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">No requests found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {[
                    "Request",
                    "Equipment",
                    "Requested By",
                    "Purpose",
                    "Date Range",
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
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{req.requestNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {req.equipment.name}
                      </div>
                      <p className="text-xs text-gray-400">{req.equipment.code}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {req.requestedBy.firstName} {req.requestedBy.lastName}
                      </div>
                      <p className="text-xs text-gray-400">{req.requestedBy.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {req.purpose}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {formatDate(req.requestedFrom)} - {formatDate(req.requestedTo)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReviewModal(req, "APPROVED")}
                            className="rounded-lg border border-green-200 bg-green-50 p-1.5 text-green-700 hover:bg-green-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => openReviewModal(req, "REJECTED")}
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {req.reviewNotes && (
                            <span className="text-xs text-gray-400 italic">
                              {req.reviewNotes}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      )}

      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">
                {reviewDecision === "APPROVED" ? "Approve" : "Reject"} Request
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Request Details</p>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Equipment:</strong> {selectedRequest.equipment.name} ({selectedRequest.equipment.code})
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Requested by:</strong> {selectedRequest.requestedBy.firstName} {selectedRequest.requestedBy.lastName}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Purpose:</strong> {selectedRequest.purpose}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Date Range:</strong> {formatDate(selectedRequest.requestedFrom)} - {formatDate(selectedRequest.requestedTo)}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for this decision..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={reviewing === selectedRequest.id}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    reviewDecision === "APPROVED"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {reviewing === selectedRequest.id ? (
                    "Processing..."
                  ) : reviewDecision === "APPROVED" ? (
                    "Approve Request"
                  ) : (
                    "Reject Request"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
