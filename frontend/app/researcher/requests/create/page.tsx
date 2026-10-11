"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FlaskConical, ClipboardList, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Chemical { id: string; name: string; hazardLevel: string; casNumber?: string; }
interface Unit     { id: string; name: string; symbol: string; }

interface ItemRow {
  key: number;
  chemicalId: string;
  requestedQty: string;
  unitId: string;
  notes: string;
}

const HAZARD_COLORS: Record<string, string> = {
  LOW:     "bg-green-100  text-green-700",
  MEDIUM:  "bg-yellow-100 text-yellow-700",
  HIGH:    "bg-orange-100 text-orange-700",
  EXTREME: "bg-red-100    text-red-700",
};

let _key = 1;

export default function StudentCreateRequestPage() {
  const router = useRouter();

  const [purpose,      setPurpose]      = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes,        setNotes]        = useState("");
  const [items,        setItems]        = useState<ItemRow[]>([
    { key: _key++, chemicalId: "", requestedQty: "", unitId: "", notes: "" },
  ]);

  const [chemicals,  setChemicals]  = useState<Chemical[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [loadError,  setLoadError]  = useState("");

  /* â”€â”€ load chemicals + units â”€â”€ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/chemicals`, { headers: h }).then(r => r.json()),
      fetch(`${API}/units`,     { headers: h }).then(r => r.json()),
    ])
      .then(([cr, ur]) => {
        if (cr.success) setChemicals((cr.data ?? []).filter((c: Chemical) => c.hazardLevel !== undefined));
        else setLoadError("Failed to load chemicals.");
        if (ur.success) setUnits(ur.data ?? []);
        else setLoadError(prev => prev ? prev + " Failed to load units." : "Failed to load units.");
      })
      .catch(() => setLoadError("Failed to load form data. Please refresh."));
  }, [router]);

  /* â”€â”€ item helpers â”€â”€ */
  const addItem    = () =>
    setItems(p => [...p, { key: _key++, chemicalId: "", requestedQty: "", unitId: "", notes: "" }]);
  const removeItem = (k: number) => setItems(p => p.filter(r => r.key !== k));
  const updateItem = (k: number, f: keyof ItemRow, v: string) =>
    setItems(p => p.map(r => r.key === k ? { ...r, [f]: v } : r));

  const getChemical = (id: string) => chemicals.find(c => c.id === id);

  /* â”€â”€ submit â”€â”€ */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!purpose.trim()) { setError("Purpose is required."); return; }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.chemicalId)                                   { setError(`Item ${i + 1}: select a chemical.`);       return; }
      if (!it.requestedQty || Number(it.requestedQty) <= 0) { setError(`Item ${i + 1}: quantity must be > 0.`);   return; }
      if (!it.unitId)                                       { setError(`Item ${i + 1}: select a unit.`);           return; }
    }

    // check duplicate chemicals
    const chemIds = items.map(i => i.chemicalId);
    if (new Set(chemIds).size !== chemIds.length) {
      setError("Each chemical can only appear once per request.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/chemical-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          purpose:      purpose.trim(),
          notes:        notes.trim() || undefined,
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
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to submit request.");
      router.push("/researcher/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="mb-8">
        <Link
          href="/researcher/requests"
          className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
        >
          â† Back to My Requests
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Chemical Request</h1>
            <p className="text-sm text-gray-500">Submit a request for laboratory chemicals</p>
          </div>
        </div>
      </div>

      {/* load error */}
      {loadError && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* submit error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* â”€â”€ Request Details â”€â”€ */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-900">Request Details</h2>

          <div className="space-y-5">
            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="mb-1.5 block text-sm font-medium text-gray-700">
                Purpose <span className="text-red-500">*</span>
              </label>
              <input
                id="purpose"
                type="text"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. Titration experiment for Analytical Chemistry lab"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Required Date */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="requiredDate" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Required Date{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="requiredDate"
                  type="date"
                  value={requiredDate}
                  onChange={e => setRequiredDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes{" "}
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context for this requestâ€¦"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>
        </div>

        {/* â”€â”€ Chemical Items â”€â”€ */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">
                Chemical Items <span className="text-red-500">*</span>
              </h2>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {items.length}
              </span>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
            >
              <Plus className="h-4 w-4" /> Add Chemical
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const chem = getChemical(item.chemicalId);
              return (
                <div key={item.key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {/* row header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      {chem && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${HAZARD_COLORS[chem.hazardLevel] ?? "bg-gray-100 text-gray-600"}`}>
                          {chem.hazardLevel}
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-100 hover:text-red-600"
                        aria-label="Remove item"
                      >
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
                      <select
                        required
                        value={item.chemicalId}
                        onChange={e => updateItem(item.key, "chemicalId", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      >
                        <option value="" disabled>Select chemicalâ€¦</option>
                        {chemicals.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value={item.requestedQty}
                        onChange={e => updateItem(item.key, "requestedQty", e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={item.unitId}
                        onChange={e => updateItem(item.key, "unitId", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      >
                        <option value="" disabled>Select unitâ€¦</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Item notes */}
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Notes{" "}
                      <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={e => updateItem(item.key, "notes", e.target.value)}
                      placeholder="e.g. analytical grade required"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* â”€â”€ Info note â”€â”€ */}
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>
            Your request will be reviewed and approved by a lab technician or director before chemicals are issued.
          </span>
        </div>

        {/* â”€â”€ Buttons â”€â”€ */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href="/researcher/requests"
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || chemicals.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ClipboardList className="h-4 w-4" />
            {submitting ? "Submittingâ€¦" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
