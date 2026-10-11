"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category { id: string; name: string; }
interface Unit     { id: string; name: string; symbol: string; }
interface Supplier { id: string; name: string; }

interface FormState {
  name: string;
  casNumber: string;
  formula: string;
  description: string;
  hazardLevel: string;
  status: string;
  categoryId: string;
  unitId: string;
  supplierId: string;
}

export default function EditChemicalPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    name: "", casNumber: "", formula: "", description: "",
    hazardLevel: "", status: "ACTIVE",
    categoryId: "", unitId: "", supplierId: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [units,      setUnits]      = useState<Unit[]>([]);
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  /* ── load chemical + dropdowns ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API}/chemicals/${id}`,        { headers }).then(r => r.json()),
      fetch(`${API}/chemical-categories`,    { headers }).then(r => r.json()),
      fetch(`${API}/units`,                  { headers }).then(r => r.json()),
      fetch(`${API}/suppliers`,              { headers }).then(r => r.json()),
    ])
      .then(([chemRes, catRes, unitRes, supRes]) => {
        if (!chemRes.success) {
          setError(chemRes.message || "Chemical not found.");
          return;
        }
        const c = chemRes.data;
        setForm({
          name:        c.name        ?? "",
          casNumber:   c.casNumber   ?? "",
          formula:     c.formula     ?? "",
          description: c.description ?? "",
          hazardLevel: c.hazardLevel ?? "",
          status:      c.status      ?? "ACTIVE",
          categoryId:  c.categoryId  ?? "",
          unitId:      c.unitId      ?? "",
          supplierId:  c.supplierId  ?? "",
        });
        if (catRes.success)  setCategories(catRes.data  ?? []);
        if (unitRes.success) setUnits(unitRes.data       ?? []);
        if (supRes.success)  setSuppliers(supRes.data    ?? []);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setPageLoading(false));
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())    { setError("Chemical name is required.");  return; }
    if (!form.hazardLevel)    { setError("Hazard level is required.");   return; }
    if (!form.categoryId)     { setError("Category is required.");       return; }
    if (!form.unitId)         { setError("Unit is required.");           return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    try {
      setSubmitting(true);

      const body: Record<string, string> = {
        name:        form.name.trim(),
        hazardLevel: form.hazardLevel,
        status:      form.status,
        categoryId:  form.categoryId,
        unitId:      form.unitId,
      };
      if (form.casNumber.trim())   body.casNumber   = form.casNumber.trim();
      if (form.formula.trim())     body.formula     = form.formula.trim();
      if (form.description.trim()) body.description = form.description.trim();
      if (form.supplierId)         body.supplierId  = form.supplierId;

      const response = await fetch(`${API}/chemicals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to update chemical.");

      toast.success("Chemical updated successfully!");
      router.push("/admin/dashboard/chemicals");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update chemical.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── loading / error states ── */
  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/dashboard/chemicals"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Chemicals
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Edit Chemical</h1>
        <p className="mt-2 text-gray-500">Update the chemical information below.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
              Chemical Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name" name="name" type="text" required
              value={form.name} onChange={handleChange}
              placeholder="e.g. Hydrochloric Acid"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* CAS Number */}
          <div>
            <label htmlFor="casNumber" className="mb-2 block text-sm font-medium text-gray-700">
              CAS Number
            </label>
            <input
              id="casNumber" name="casNumber" type="text"
              value={form.casNumber} onChange={handleChange}
              placeholder="e.g. 7647-01-0"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Formula */}
          <div>
            <label htmlFor="formula" className="mb-2 block text-sm font-medium text-gray-700">
              Chemical Formula
            </label>
            <input
              id="formula" name="formula" type="text"
              value={form.formula} onChange={handleChange}
              placeholder="e.g. HCl"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description" name="description" rows={3}
              value={form.description} onChange={handleChange}
              placeholder="Describe the chemical..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Hazard Level */}
          <div>
            <label htmlFor="hazardLevel" className="mb-2 block text-sm font-medium text-gray-700">
              Hazard Level <span className="text-red-500">*</span>
            </label>
            <select
              id="hazardLevel" name="hazardLevel" required
              value={form.hazardLevel} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select hazard level</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="EXTREME">Extreme</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status" name="status"
              value={form.status} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="mb-2 block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId" name="categoryId" required
              value={form.categoryId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unitId" className="mb-2 block text-sm font-medium text-gray-700">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="unitId" name="unitId" required
              value={form.unitId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label htmlFor="supplierId" className="mb-2 block text-sm font-medium text-gray-700">
              Supplier <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <select
              id="supplierId" name="supplierId"
              value={form.supplierId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">No supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <Link
              href="/admin/dashboard/chemicals"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
