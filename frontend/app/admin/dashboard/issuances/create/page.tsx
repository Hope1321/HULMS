"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, FlaskConical, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestItem {
  id: string;
  chemicalId: string;
  requestedQty: number;
  approvedQty: number | null;
  chemical: { id: string; name: string; hazardLevel: string; };
  unit: { id: string; name: string; symbol: string; };
}

interface ApprovedRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  status: string;
  requiredDate: string | null;
  requestedBy: { id: string; firstName: string; lastName: string; email: string; };
  items: RequestItem[];
}

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  minimumStock: number;
  status: string;
  expiryDate: string | null;
  chemical: { id: string; name: string; hazardLevel: string; };
  unit: { id: string; name: string; symbol: string; };
  storageLocation: { id: string; name: string; building?: string; room?: string; };
}

const HAZARD_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700", MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700", EXTREME: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function CreateIssuancePage() {
  const router = useRouter();

  const [requests,  setRequests]  = useState<ApprovedRequest[]>([]);
  const [batches,   setBatches]   = useState<Batch[]>([]);
  const [loadError, setLoadError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<ApprovedRequest | null>(null);
  const [selectedBatch,   setSelectedBatch]   = useState<Batch | null>(null);
  const [quantity,        setQuantity]         = useState("");
  const [notes,           setNotes]            = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  /* ── load APPROVED requests + all batches ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/chemical-requests`, { headers: h }).then(r => r.json()),
      fetch(`${API}/chemical-batches`,  { headers: h }).then(r => r.json()),
    ])
      .then(([reqRes, batRes]) => {
        if (reqRes.success) {
          const approved = (reqRes.data as ApprovedRequest[]).filter(r => r.status === "APPROVED");
          setRequests(approved);
        }
        if (batRes.success) setBatches(batRes.data ?? []);
      })
      .catch(() => setLoadError("Failed to load data. Please refresh."));
  }, [router]);

  /* batches that match a chemical in the selected request and are issuable */
  const matchingBatches = selectedRequest
    ? batches.filter(b => {
        const inRequest = selectedRequest.items.some(i => i.chemicalId === b.chemical.id);
        const issuable  = b.status !== "EXPIRED" && b.status !== "DEPLETED";
        return inRequest && issuable;
      })
    : [];

  /* approved qty for the selected batch's chemical */
  const approvedQty = selectedRequest && selectedBatch
    ? selectedRequest.items.find(i => i.chemicalId === selectedBatch.chemical.id)?.approvedQty ?? null
    : null;

  const handleRequestChange = (id: string) => {
    const req = requests.find(r => r.id === id) ?? null;
    setSelectedRequest(req);
    setSelectedBatch(null);
    setQuantity("");
    setError("");
  };

  const handleBatchChange = (id: string) => {
    const b = batches.find(b => b.id === id) ?? null;
    setSelectedBatch(b);
    if (b && approvedQty !== null) {
      setQuantity(String(Math.min(Number(approvedQty), b.quantity)));
    } else {
      setQuantity("");
    }
    setError("");
  };

  /* ── submit ── */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!selectedRequest) { setError("Select a request."); return; }
    if (!selectedBatch)   { setError("Select a batch.");   return; }
    if (!quantity || Number(quantity) <= 0) { setError("Quantity must be > 0."); return; }
    if (approvedQty !== null && Number(quantity) > approvedQty) {
      setError(`Quantity cannot exceed the approved quantity of ${approvedQty}.`); return;
    }
    if (Number(quantity) > selectedBatch.quantity) {
      setError(`Quantity cannot exceed available batch stock of ${selectedBatch.quantity}.`); return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/chemical-issuances`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          batchId:   selectedBatch.id,
          quantity:  Number(quantity),
          notes:     notes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to create issuance.");
      router.push("/admin/dashboard/issuances");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issuance.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard/issuances" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Issuances
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Issuance</h1>
            <p className="text-sm text-gray-500">Issue chemicals against an approved request</p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">{loadError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Step 1: Select Request ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
            <h2 className="font-semibold text-gray-900">Select Approved Request</h2>
          </div>

          {requests.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No approved requests found. A request must be approved before it can be issued.
            </div>
          ) : (
            <select required value={selectedRequest?.id ?? ""}
              onChange={e => handleRequestChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="" disabled>Select an approved request…</option>
              {requests.map(r => (
                <option key={r.id} value={r.id}>
                  {r.requestNumber} — {r.purpose}
                </option>
              ))}
            </select>
          )}

          {/* Request summary */}
          {selectedRequest && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Request Details</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedRequest.requestNumber}</p>
              <p className="text-sm text-gray-600">{selectedRequest.purpose}</p>
              <p className="mt-1 text-xs text-gray-500">
                Requested by: <span className="font-medium">{selectedRequest.requestedBy.firstName} {selectedRequest.requestedBy.lastName}</span>
              </p>
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">Requested Items</p>
                <div className="space-y-1.5">
                  {selectedRequest.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-blue-100">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{item.chemical.name}</span>
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${HAZARD_COLORS[item.chemical.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {item.chemical.hazardLevel}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">Requested: <b>{item.requestedQty}</b></span>
                        {item.approvedQty !== null && (
                          <span className="ml-3 text-green-700">Approved: <b>{item.approvedQty}</b></span>
                        )}
                        <span className="ml-1 text-gray-400">{item.unit.symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Step 2: Select Batch ── */}
        {selectedRequest && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
              <h2 className="font-semibold text-gray-900">Select Batch</h2>
            </div>

            {matchingBatches.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No available batches found for the chemicals in this request.
              </div>
            ) : (
              <select required value={selectedBatch?.id ?? ""}
                onChange={e => handleBatchChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="" disabled>Select a batch…</option>
                {matchingBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} — {b.chemical.name} — Stock: {b.quantity} {b.unit.symbol}
                    {b.expiryDate ? ` — Expires: ${fmt(b.expiryDate)}` : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Batch details */}
            {selectedBatch && (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-3">
                {[
                  { label: "Chemical",        value: selectedBatch.chemical.name },
                  { label: "Batch Number",    value: selectedBatch.batchNumber },
                  { label: "Available Stock", value: `${selectedBatch.quantity} ${selectedBatch.unit.symbol}` },
                  { label: "Min. Stock",      value: `${selectedBatch.minimumStock} ${selectedBatch.unit.symbol}` },
                  { label: "Location",        value: selectedBatch.storageLocation.name },
                  { label: "Expiry Date",     value: fmt(selectedBatch.expiryDate) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
                    <p className="mt-0.5 font-medium text-gray-800">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Quantity + Notes ── */}
        {selectedBatch && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
              <h2 className="font-semibold text-gray-900">Set Quantity</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Issue Quantity <span className="text-red-500">*</span>
                  {approvedQty !== null && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (max: {approvedQty} {selectedBatch.unit.symbol} approved, {selectedBatch.quantity} {selectedBatch.unit.symbol} in stock)
                    </span>
                  )}
                </label>
                <input id="quantity" type="number" min="0.01" step="any" required
                  max={approvedQty !== null ? Math.min(approvedQty, selectedBatch.quantity) : selectedBatch.quantity}
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Issued for Chemistry lab practical session…"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/admin/dashboard/issuances"
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || !selectedBatch}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {submitting ? "Issuing…" : "Issue Chemical"}
          </button>
        </div>
      </form>
    </div>
  );
}
