"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FlaskRound } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface College    { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; college: College; }

interface FormState {
  name: string; code: string; description: string;
  location: string; departmentId: string;
}

export default function EditLaboratoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    name: "", code: "", description: "", location: "", departmentId: "",
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  /* ── load lab + departments ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/laboratories/${id}`, { headers: h }).then(r => r.json()),
      fetch(`${API}/departments`,        { headers: h }).then(r => r.json()),
    ])
      .then(([labRes, depRes]) => {
        if (!labRes.success) { setError(labRes.message || "Laboratory not found."); return; }
        const l = labRes.data;
        setForm({
          name:         l.name         ?? "",
          code:         l.code         ?? "",
          description:  l.description  ?? "",
          location:     l.location     ?? "",
          departmentId: l.departmentId ?? "",
        });
        if (depRes.success) setDepartments(depRes.data ?? []);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setPageLoading(false));
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.name === "code" ? e.target.value.toUpperCase() : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim())    { setError("Name is required.");       return; }
    if (!form.code.trim())    { setError("Code is required.");       return; }
    if (!form.departmentId)   { setError("Department is required."); return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/laboratories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:         form.name.trim(),
          code:         form.code.trim(),
          description:  form.description.trim() || null,
          location:     form.location.trim()    || null,
          departmentId: form.departmentId,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to update laboratory.");
      router.push("/admin/dashboard/laboratories");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update laboratory.");
    } finally { setSubmitting(false); }
  };

  if (pageLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/dashboard/laboratories" className="text-sm font-medium text-teal-600 hover:text-teal-700">
          ← Back to Laboratories
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
            <FlaskRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Laboratory</h1>
            <p className="text-sm text-gray-500">Update laboratory information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">

          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Laboratory Name <span className="text-red-500">*</span>
            </label>
            <input id="name" name="name" type="text" required value={form.name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>

          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input id="code" name="code" type="text" required value={form.code} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono uppercase outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>

          <div>
            <label htmlFor="departmentId" className="mb-1.5 block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select id="departmentId" name="departmentId" required value={form.departmentId} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
              <option value="" disabled>Select department…</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.college.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-gray-700">
              Location <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input id="location" name="location" type="text" value={form.location} onChange={handleChange}
              placeholder="e.g. Science Block, Room 204"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>

          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/admin/dashboard/laboratories"
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
