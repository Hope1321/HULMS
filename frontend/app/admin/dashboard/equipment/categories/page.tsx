"use client";

import { useEffect, useState } from "react";
import { BookMarked, Plus, Pencil, Trash2, X, Check, Loader2, Tag } from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Category {
  id: string; name: string; code: string; description: string | null;
  createdAt: string; _count?: { equipment: number };
}

const authH = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` });

function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function EquipmentCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<"create"|"edit"|null>(null);
  const [editing,    setEditing]    = useState<Category | null>(null);
  const [form,       setForm]       = useState({ name: "", code: "", description: "" });
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/equipment/categories`, { headers: authH() });
      const d = await r.json();
      if (d.success) setCategories(d.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ name: "", code: "", description: "" }); setEditing(null); setModal("create"); };
  const openEdit   = (c: Category) => { setForm({ name: c.name, code: c.code, description: c.description ?? "" }); setEditing(c); setModal("edit"); };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Name and code are required."); return; }
    setSaving(true);
    try {
      const url    = modal === "edit" ? `${API}/equipment/categories/${editing!.id}` : `${API}/equipment/categories`;
      const method = modal === "edit" ? "PATCH" : "POST";
      const body: Record<string, string> = {
        name: form.name.trim(),
        code: form.code.trim(),
      };
      if (form.description.trim()) {
        body.description = form.description.trim();
      }
      console.log("Saving category:", { url, method, body });
      const r      = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) });
      const d      = await r.json();
      console.log("Response:", { status: r.status, data: d });
      if (!r.ok || !d.success) throw new Error(d.message);
      toast.success(`Category ${modal === "edit" ? "updated" : "created"}!`);
      setModal(null);
      load();
    } catch (e) {
      console.error("Save error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    }
    finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try {
      const r = await fetch(`${API}/equipment/categories/${id}`, { method: "DELETE", headers: authH() });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message);
      toast.success("Category deleted.");
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete."); }
    finally { setDeleting(null); }
  };

  const modalFooter = (
    <div className="flex justify-end gap-3">
      <button onClick={() => setModal(null)} disabled={saving}
        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? "Saving…" : modal === "edit" ? "Save Changes" : "Create Category"}
      </button>
    </div>
  );

  return (
    <>
      {modal && (
        <Modal title={modal === "edit" ? "Edit Category" : "Add Equipment Category"} onClose={() => setModal(null)} footer={modalFooter}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Analytical Instruments" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Code <span className="text-red-500">*</span></label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. ANAL" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Optional description…" className={INPUT} />
            </div>
          </div>
        </Modal>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
              <BookMarked className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment Categories</h1>
              <p className="text-sm text-gray-500">Organise equipment by type or function</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Total Categories", value: categories.length },
            { label: "Total Equipment",  value: categories.reduce((s, c) => s + (c._count?.equipment ?? 0), 0) },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <BookMarked className="h-10 w-10 text-gray-200" />
            <p className="mt-3 text-sm font-semibold text-gray-500">No categories yet</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" /> Add First Category
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {["Category", "Code", "Equipment", "Description", "Actions"].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                          <Tag className="h-4 w-4 text-blue-700" />
                        </div>
                        <span className="font-semibold text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{cat.code}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{cat._count?.equipment ?? 0} items</td>
                    <td className="max-w-xs px-5 py-4 text-sm text-gray-500 truncate">{cat.description || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(cat)} className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => del(cat.id, cat.name)} disabled={deleting === cat.id}
                          className="rounded-lg border border-red-100 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50">
                          {deleting === cat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
              {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
