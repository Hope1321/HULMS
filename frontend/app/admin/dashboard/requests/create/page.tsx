"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FlaskConical, ClipboardList } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical { id: string; name: string; hazardLevel: string; }
interface Unit     { id: string; name: string; symbol: string; }

interface ItemRow {
  key: number;
  chemicalId: string;
  requestedQty: string;
  unitId: string;
  notes: string;
}

const HAZARD_COLORS: Record<string, string> = {
  LOW:     "text-green-700 bg-green-100",
  MEDIUM:  "text-yellow-700 bg-yellow-100",
  HIGH:    "text-orange-700 bg-orange-100",
  EXTREME: "text-red-700 bg-red-100",
};

let _key = 1;

export default function CreateRequestPage() {
  const router = useRouter();

  const [purpose,      setPurpose]      = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes,        setNotes]        = useState("");
  const [items,        setItems]        = useState<ItemRow[]>([
    { key: _key++, chemicalId: "", requestedQty: "", unitId: "", notes: "" },
  ]);

  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [units,     setUnits]     = useState<Unit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [loadError,  setLoadError]  = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/chemicals`, { headers: h }).then(r => r.json()),
      fetch(`${API}/units`,     { headers: h }).then(r => r.json()),
    ])
      .then(([cr, ur]) => {
        if (cr.success) setChemicals(cr.data ?? []);
        if (ur.success) setUnits(ur.data     ?? []);
      })
      .catch(() => setLoadError("Failed to load data. Please refresh."));
  }, [router]);

  const addItem    = () => setItems(p => [...p, { key: _key++, chemicalId: "", requestedQty: "", unitId: "", notes: "" }]);
  const removeItem = (k: number) => setItems(p => p.filter(r => r.key !== k));
  const updateItem = (k: number, f: keyof ItemRow, v: string) =>
    setItems(p => p.map(r => r.key === k ? { ...r, [f]: v } : r));

  const selectedChemical = (chemicalId: string) =>
    chemicals.find(c => c.id === chemicalId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!purpose.trim()) { setError("Purpose is required."); return; }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.chemicalId)                           { setError(`Item ${i + 1}: select a chemical.`);    return; }
      if (!it.requestedQty || Number(it.requestedQty) <= 0) { setError(`Item ${i + 1}: quantity must be > 0.`); return; }
      if (!it.unitId)                               { setError(`Item ${i + 1}: select a unit.`);        return; }
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/chemical-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          purpose: purpose.trim(),
          notes: notes.trim() || undefined,
          requiredDate: requiredDate || undefined,
          items: items.map(r => ({
            chemicalId:   r.chemicalId,
            requestedQty: Number(r.requestedQty),
            unitId:       r.unitId,
            notes:        r.notes.trim() || undefined,
          })),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to create request.");
      router.push("/admin/dashboard/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard/requests" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Requests
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Chemical Request</h1>
            <p className="text-sm text-gray-500">Submit a request for laboratory chemicals</p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">{loadError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Request Details ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-900">Request Details</h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="purpose" className="mb-1.5 block text-sm font-medium text-gray-700">
                Purpose <span className="text-red-500">*</span>
              </label>
              <input id="purpose" type="text" required value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. Titration experiment for Analytical Chemistry lab"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="requiredDate" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Required Date <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input id="requiredDate" type="date" value={requiredDate}
                  onChange={e => setRequiredDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context for this request…"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>

        {/* ── Chemical Items ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">
                Chemical Items <span className="text-red-500">*</span>
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {items.length}
              </span>
            </div>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const chem = selectedChemical(item.chemicalId);
              return (
                <div key={item.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {/* Row header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      {chem && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD_COLORS[chem.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {chem.hazardLevel}
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(item.key)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-100 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Chemical */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Chemical <span className="text-red-500">*</span>
                      </label>
                      <select required value={item.chemicalId}
                        onChange={e => updateItem(item.key, "chemicalId", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="" disabled>Select chemical</option>
                        {chemicals.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Qty */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input type="number" min="0.01" step="any" required
                        value={item.requestedQty}
                        onChange={e => updateItem(item.key, "requestedQty", e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    {/* Unit */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select required value={item.unitId}
                        onChange={e => updateItem(item.key, "unitId", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                        <option value="" disabled>Select unit</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Item Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <input type="text" value={item.notes}
                      onChange={e => updateItem(item.key, "notes", e.target.value)}
                      placeholder="e.g. analytical grade required"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/admin/dashboard/requests"
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
