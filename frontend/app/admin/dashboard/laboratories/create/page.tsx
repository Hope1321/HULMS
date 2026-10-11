"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskRound } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface College    { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; college: College; }

export default function CreateLaboratoryPage() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [code,         setCode]         = useState("");
  const [description,  setDescription]  = useState("");
  const [location,     setLocation]     = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadError,   setLoadError]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  /* ── load departments ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/departments`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (result.success) setDepartments(result.data ?? []);
        else setLoadError(result.message || "Failed to load departments.");
      })
      .catch(() => setLoadError("Failed to load departments. Please refresh."));
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!name.trim())    { setError("Name is required.");         return; }
    if (!code.trim())    { setError("Code is required.");         return; }
    if (!departmentId)   { setError("Department is required.");   return; }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/laboratories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || undefined,
          location:    location.trim()    || undefined,
          departmentId,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to create laboratory.");
      router.push("/admin/dashboard/laboratories");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create laboratory.");
    } finally { setSubmitting(false); }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Add Laboratory</h1>
            <p className="text-sm text-gray-500">Register a new laboratory</p>
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

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Laboratory Name <span className="text-red-500">*</span>
            </label>
            <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Chemistry Research Laboratory"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>

          {/* Code */}
          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input id="code" type="text" required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CHEM-LAB-01"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono uppercase outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            <p className="mt-1 text-xs text-gray-400">Must be globally unique. Auto-converted to uppercase.</p>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="departmentId" className="mb-1.5 block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select id="departmentId" required value={departmentId} onChange={e => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
              <option value="" disabled>Select department…</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.college.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-gray-700">
              Location <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input id="location" type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Science Block, Room 204"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea id="description" rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the laboratory's purpose and facilities…"
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
            {submitting ? "Saving…" : "Add Laboratory"}
          </button>
        </div>
      </form>
    </div>
  );
}
