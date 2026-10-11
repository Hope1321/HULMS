"use client";

import { useEffect, useState } from "react";
import {
  Building2, BookOpen, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight, X, Check, Loader2,
  GraduationCap, Users, FlaskRound,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  collegeId: string;
  _count?: { laboratories: number; users: number };
}

interface College {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departments: Department[];
  _count?: { departments: number; users: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function token() {
  return localStorage.getItem("token") ?? "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <>
      {/* Backdrop — purely visual, behind everything */}
      <div className="fixed inset-0 z-50 bg-black/50" />

      {/* Scroll container — transparent, on top of backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-4">
                {footer}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  label: string;
  warning?: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
function ConfirmDelete({ label, warning, loading, onCancel, onConfirm }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">Delete {label}?</h2>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
        {warning && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {warning}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CollegesPage() {
  const [colleges,   setColleges]   = useState<College[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());

  // ── College modal state
  const [collegeModal, setCollegeModal] = useState<"create" | "edit" | null>(null);
  const [editCollege,  setEditCollege]  = useState<College | null>(null);
  const [cForm,        setCForm]        = useState({ name: "", code: "", description: "" });
  const [cSaving,      setCSaving]      = useState(false);

  // ── Department modal state
  const [deptModal,   setDeptModal]   = useState<"create" | "edit" | null>(null);
  const [deptCollege, setDeptCollege] = useState<College | null>(null);  // parent college
  const [editDept,    setEditDept]    = useState<Department | null>(null);
  const [dForm,       setDForm]       = useState({ name: "", code: "", description: "" });
  const [dSaving,     setDSaving]     = useState(false);

  // ── Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "college" | "dept"; id: string; label: string; warning?: string } | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Fetch colleges with their departments ────────────────────────────────
  const fetchColleges = async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch(`${API}/colleges`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/departments`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      if (!cRes.success) throw new Error(cRes.message);
      const depts: Department[] = dRes.success ? dRes.data : [];
      const result: College[] = (cRes.data as College[]).map(c => ({
        ...c,
        departments: depts.filter(d => d.collegeId === c.id),
      }));
      setColleges(result);
      // Auto-expand all
      setExpanded(new Set(result.map(c => c.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load colleges");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchColleges(); }, []);

  // ── Toggle expand ────────────────────────────────────────────────────────
  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── College CRUD ─────────────────────────────────────────────────────────

  const openCreateCollege = () => {
    setCForm({ name: "", code: "", description: "" });
    setEditCollege(null);
    setCollegeModal("create");
  };

  const openEditCollege = (c: College) => {
    setCForm({ name: c.name, code: c.code, description: c.description ?? "" });
    setEditCollege(c);
    setCollegeModal("edit");
  };

  const saveCollege = async () => {
    if (!cForm.name.trim() || !cForm.code.trim()) {
      toast.error("Name and code are required."); return;
    }
    setCSaving(true);
    try {
      const body = { name: cForm.name.trim(), code: cForm.code.trim(), description: cForm.description.trim() || undefined };
      const url  = collegeModal === "edit" ? `${API}/colleges/${editCollege!.id}` : `${API}/colleges`;
      const res  = await fetch(url, {
        method: collegeModal === "edit" ? "PATCH" : "POST",
        headers: authHeaders(), body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      toast.success(`College ${collegeModal === "edit" ? "updated" : "created"} successfully!`);
      setCollegeModal(null);
      fetchColleges();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save college."); }
    finally { setCSaving(false); }
  };

  // ── Department CRUD ──────────────────────────────────────────────────────

  const openCreateDept = (college: College) => {
    setDForm({ name: "", code: "", description: "" });
    setEditDept(null);
    setDeptCollege(college);
    setDeptModal("create");
  };

  const openEditDept = (dept: Department, college: College) => {
    setDForm({ name: dept.name, code: dept.code, description: dept.description ?? "" });
    setEditDept(dept);
    setDeptCollege(college);
    setDeptModal("edit");
  };

  const saveDept = async () => {
    if (!dForm.name.trim() || !dForm.code.trim()) {
      toast.error("Name and code are required."); return;
    }
    setDSaving(true);
    try {
      const body = {
        name: dForm.name.trim(), code: dForm.code.trim(),
        description: dForm.description.trim() || undefined,
        ...(deptModal === "create" && { collegeId: deptCollege!.id }),
      };
      const url  = deptModal === "edit" ? `${API}/departments/${editDept!.id}` : `${API}/departments`;
      const res  = await fetch(url, {
        method: deptModal === "edit" ? "PATCH" : "POST",
        headers: authHeaders(), body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      toast.success(`Department ${deptModal === "edit" ? "updated" : "created"} successfully!`);
      setDeptModal(null);
      fetchColleges();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save department."); }
    finally { setDSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url = deleteTarget.type === "college"
        ? `${API}/colleges/${deleteTarget.id}`
        : `${API}/departments/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      toast.success(`${deleteTarget.label} deleted successfully.`);
      setDeleteTarget(null);
      fetchColleges();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete."); }
    finally { setDeleting(false); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDepts = colleges.reduce((s, c) => s + c.departments.length, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* College modal */}
      {collegeModal && (
        <Modal
          title={collegeModal === "create" ? "Add College" : "Edit College"}
          onClose={() => setCollegeModal(null)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCollegeModal(null)}
                disabled={cSaving}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCollege}
                disabled={cSaving}
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
              >
                {cSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {cSaving ? "Saving…" : collegeModal === "create" ? "Add College" : "Save Changes"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="College Name" required>
              <input value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. College of Computing and Informatics" className={INPUT} />
            </Field>
            <Field label="College Code" required>
              <input value={cForm.code} onChange={e => setCForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. CCI" className={INPUT} />
            </Field>
            <Field label="Description">
              <textarea value={cForm.description} onChange={e => setCForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Optional description…" className={INPUT} />
            </Field>
          </div>
        </Modal>
      )}

      {/* Department modal */}
      {deptModal && (
        <Modal
          title={deptModal === "create" ? `Add Department to ${deptCollege?.code}` : "Edit Department"}
          onClose={() => setDeptModal(null)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeptModal(null)}
                disabled={dSaving}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDept}
                disabled={dSaving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {dSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {dSaving ? "Saving…" : deptModal === "create" ? "Add Department" : "Save Changes"}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {deptModal === "create" && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                <Building2 className="h-4 w-4 shrink-0" />
                <span><strong>{deptCollege?.code}</strong> — {deptCollege?.name}</span>
              </div>
            )}
            <Field label="Department Name" required>
              <input value={dForm.name} onChange={e => setDForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Software Engineering" className={INPUT} />
            </Field>
            <Field label="Department Code" required>
              <input value={dForm.code} onChange={e => setDForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SE" className={INPUT} />
            </Field>
            <Field label="Description">
              <textarea value={dForm.description} onChange={e => setDForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Optional description…" className={INPUT} />
            </Field>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDelete
          label={deleteTarget.label}
          warning={deleteTarget.warning}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* ── Page ── */}
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Colleges & Departments</h1>
              <p className="text-sm text-gray-500">Manage university organisational structure</p>
            </div>
          </div>
          <button onClick={openCreateCollege}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
            <Plus className="h-4 w-4" /> Add College
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2,    label: "Colleges",    value: colleges.length,  color: "bg-blue-50 text-blue-700"    },
            { icon: BookOpen,     label: "Departments", value: totalDepts,        color: "bg-emerald-50 text-emerald-700" },
            { icon: GraduationCap,label: "Total Users", value: colleges.reduce((s, c) => s + (c._count?.users ?? 0), 0), color: "bg-violet-50 text-violet-700" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tree */}
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : colleges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">No colleges yet</p>
            <button onClick={openCreateCollege}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" /> Add First College
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {colleges.map(college => {
              const open = expanded.has(college.id);
              return (
                <div key={college.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                  {/* College row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => toggle(college.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Building2 className="h-5 w-5 text-blue-700" />
                    </div>

                    <div className="min-w-0 flex-1" onClick={() => toggle(college.id)} role="button">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-gray-900">{college.name}</span>
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                          {college.code}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {college.departments.length} department{college.departments.length !== 1 ? "s" : ""}
                        </span>
                        {college._count?.users ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {college._count.users} user{college._count.users !== 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {college.description && <span className="truncate max-w-xs">{college.description}</span>}
                      </div>
                    </div>

                    {/* College actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => openCreateDept(college)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                        <Plus className="h-3.5 w-3.5" /> Add Department
                      </button>
                      <button onClick={() => openEditCollege(college)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-100">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget({
                        type: "college", id: college.id, label: college.name,
                        warning: college.departments.length > 0
                          ? `This college has ${college.departments.length} department(s). Remove them first.`
                          : undefined,
                      })}
                        className="rounded-lg border border-red-100 p-1.5 text-red-500 transition hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Departments tree */}
                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {college.departments.length === 0 ? (
                        <div className="flex items-center gap-3 px-14 py-4 text-sm text-gray-400">
                          <span className="text-gray-300">└──</span>
                          <span className="italic">No departments yet.</span>
                          <button onClick={() => openCreateDept(college)}
                            className="ml-2 text-xs font-medium text-emerald-600 hover:text-emerald-800">
                            + Add one
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {college.departments.map((dept, idx) => {
                            const isLast = idx === college.departments.length - 1;
                            return (
                              <div key={dept.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-white">
                                {/* Tree lines */}
                                <div className="flex shrink-0 items-center pl-8">
                                  <span className="mr-2 font-mono text-xs text-gray-300 select-none">
                                    {isLast ? "└──" : "├──"}
                                  </span>
                                </div>

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                  <BookOpen className="h-4 w-4 text-emerald-700" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-800">{dept.name}</span>
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                      {dept.code}
                                    </span>
                                  </div>
                                  {dept._count && (
                                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                                      {dept._count.laboratories > 0 && (
                                        <span className="flex items-center gap-1">
                                          <FlaskRound className="h-3 w-3" /> {dept._count.laboratories} lab{dept._count.laboratories !== 1 ? "s" : ""}
                                        </span>
                                      )}
                                      {dept._count.users > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" /> {dept._count.users} user{dept._count.users !== 1 ? "s" : ""}
                                        </span>
                                      )}
                                      {dept.description && <span className="truncate max-w-xs">{dept.description}</span>}
                                    </div>
                                  )}
                                </div>

                                {/* Department actions */}
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button onClick={() => openEditDept(dept, college)}
                                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-100">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteTarget({
                                    type: "dept", id: dept.id, label: dept.name,
                                    warning: (dept._count?.laboratories ?? 0) + (dept._count?.users ?? 0) > 0
                                      ? "This department has labs or users assigned. Deletion may be blocked."
                                      : undefined,
                                  })}
                                    className="rounded-lg border border-red-100 p-1.5 text-red-400 transition hover:bg-red-50">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom "Add department" shortcut */}
                      {college.departments.length > 0 && (
                        <div className="border-t border-gray-100 px-14 py-2.5">
                          <button onClick={() => openCreateDept(college)}
                            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800">
                            <Plus className="h-3.5 w-3.5" /> Add another department
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
