"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";
import { Cpu, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Laboratory {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  code: string;
  description: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  purchaseDate: string;
  status: string;
  location: string;
  categoryId: string;
  laboratoryId: string;
}

export default function CreateEquipmentPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    code: "",
    description: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    purchaseDate: "",
    status: "AVAILABLE",
    location: "",
    categoryId: "",
    laboratoryId: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

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

    Promise.all([
      fetch(`${API}/equipment/categories`, { headers }).then((r) => r.json()),
      fetch(`${API}/laboratories`, { headers }).then((r) => r.json()),
    ])
      .then(([catRes, labRes]) => {
        if (catRes.success) setCategories(catRes.data ?? []);
        if (labRes.success) setLaboratories(labRes.data ?? []);
      })
      .catch(() => {
        setLoadError("Failed to load form data. Please refresh the page.");
      });
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Equipment name is required.");
      return;
    }
    if (!form.code.trim()) {
      setError("Equipment code is required.");
      return;
    }
    if (!form.categoryId) {
      setError("Category is required.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setSubmitting(true);

      const body: Record<string, string> = {
        name: form.name.trim(),
        code: form.code.trim(),
        status: form.status,
        categoryId: form.categoryId,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.serialNumber.trim()) body.serialNumber = form.serialNumber.trim();
      if (form.model.trim()) body.model = form.model.trim();
      if (form.manufacturer.trim()) body.manufacturer = form.manufacturer.trim();
      if (form.purchaseDate) body.purchaseDate = form.purchaseDate;
      if (form.location.trim()) body.location = form.location.trim();
      if (form.laboratoryId) body.laboratoryId = form.laboratoryId;

      const response = await fetch(`${API}/equipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create equipment.");
      }

      toast.success("Equipment added successfully!");
      router.push("/admin/dashboard/equipment/equipment");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create equipment.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/dashboard/equipment/equipment"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Equipment
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Add Equipment
        </h1>

        <p className="mt-2 text-gray-500">
          Add a new equipment item to the laboratory inventory.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          {loadError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
              Equipment Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Centrifuge Machine"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="code" className="mb-2 block text-sm font-medium text-gray-700">
              Equipment Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. CF-001"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              value={form.categoryId}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="model" className="mb-2 block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                id="model"
                name="model"
                type="text"
                value={form.model}
                onChange={handleChange}
                placeholder="e.g. X-5000"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="serialNumber" className="mb-2 block text-sm font-medium text-gray-700">
                Serial Number
              </label>
              <input
                id="serialNumber"
                name="serialNumber"
                type="text"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="e.g. SN123456"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="manufacturer" className="mb-2 block text-sm font-medium text-gray-700">
              Manufacturer
            </label>
            <input
              id="manufacturer"
              name="manufacturer"
              type="text"
              value={form.manufacturer}
              onChange={handleChange}
              placeholder="e.g. Thermo Fisher Scientific"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="purchaseDate" className="mb-2 block text-sm font-medium text-gray-700">
                Purchase Date
              </label>
              <input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="laboratoryId" className="mb-2 block text-sm font-medium text-gray-700">
              Laboratory
            </label>
            <select
              id="laboratoryId"
              name="laboratoryId"
              value={form.laboratoryId}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">No laboratory assigned</option>
              {laboratories.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="mb-2 block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Room 101, Building A"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the equipment..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <Link
              href="/admin/dashboard/equipment/equipment"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4" />
                  Add Equipment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
