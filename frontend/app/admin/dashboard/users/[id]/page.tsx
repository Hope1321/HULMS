"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, UserCheck, UserX, UserMinus, ShieldCheck,
  Mail, Phone, Building, FlaskConical,
  Calendar, CheckCircle, X as XIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Role { id: string; name: string; }
interface UserRole { role: Role; }

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
  registrationRequest: { id: string; status: string; reason: string | null; createdAt: string; reviewedAt: string | null; } | null;
  college:    { id: string; name: string; code: string; } | null;
  department: { id: string; name: string; code: string; } | null;
  laboratory: { id: string; name: string; code: string; } | null;
}

const STATUS_CFG: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  ACTIVE:    { label: "Active",    badge: "bg-green-100 text-green-700 border border-green-200",  icon: <UserCheck className="h-4 w-4" /> },
  PENDING:   { label: "Pending",   badge: "bg-amber-100 text-amber-700 border border-amber-200",  icon: <UserMinus className="h-4 w-4" /> },
  SUSPENDED: { label: "Suspended", badge: "bg-red-100   text-red-700   border border-red-200",    icon: <UserX     className="h-4 w-4" /> },
  INACTIVE:  { label: "Inactive",  badge: "bg-gray-100  text-gray-600  border border-gray-200",   icon: <UserX     className="h-4 w-4" /> },
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700", DIRECTOR: "bg-blue-100 text-blue-700",
  LAB_TECHNICIAN: "bg-teal-100 text-teal-700", LECTURER: "bg-indigo-100 text-indigo-700",
  RESEARCHER: "bg-cyan-100 text-cyan-700", STUDENT: "bg-gray-100 text-gray-600",
};

const ALL_ROLES = ["ADMIN", "DIRECTOR", "LAB_TECHNICIAN", "LECTURER", "RESEARCHER", "STUDENT"];

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

const fmtFull = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function UserDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [user,         setUser]         = useState<User | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  /* status panel */
  const [showStatus,    setShowStatus]    = useState(false);
  const [newStatus,     setNewStatus]     = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError,   setStatusError]   = useState("");

  /* roles panel */
  const [showRoles,    setShowRoles]    = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError,   setRolesError]   = useState("");

  /* ── fetch ── */
  const load = (token: string) =>
    fetch(`${API}/users/${id}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) { setError(result.message || "User not found."); return; }
        setUser(result.data);
        setSelectedRoles(result.data.roles.map((ur: UserRole) => ur.role.name));
      });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    load(token).catch(() => setError("Failed to load user.")).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── status ── */
  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setStatusError(""); setStatusLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res = await fetch(`${API}/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed.");
      setUser(prev => prev ? { ...prev, status: newStatus as User["status"] } : prev);
      setShowStatus(false); setNewStatus("");
    } catch (err) { setStatusError(err instanceof Error ? err.message : "Failed."); }
    finally { setStatusLoading(false); }
  };

  /* ── roles ── */
  const toggleRole = (role: string) =>
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const handleRolesUpdate = async () => {
    if (selectedRoles.length === 0) { setRolesError("Select at least one role."); return; }
    setRolesError(""); setRolesLoading(true);
    try {
      const token = localStorage.getItem("token")!;
      const res = await fetch(`${API}/users/${id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roles: selectedRoles }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed.");
      setUser(result.data);
      setShowRoles(false);
    } catch (err) { setRolesError(err instanceof Error ? err.message : "Failed."); }
    finally { setRolesLoading(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
    </div>
  );

  if (error || !user) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "User not found."}</p>
      <Link href="/admin/dashboard/users" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
    </div>
  );

  const statusCfg = STATUS_CFG[user.status] ?? STATUS_CFG.INACTIVE;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ── */}
      <div>
        <Link href="/admin/dashboard/users" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Users
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200 text-xl font-bold text-gray-600">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.badge}`}>
                {statusCfg.icon}{statusCfg.label}
              </span>
              {user.isEmailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact & Account ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Account Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-0.5 text-sm text-gray-800">{user.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</p>
              <p className="mt-0.5 text-sm text-gray-800">{user.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Joined</p>
              <p className="mt-0.5 text-sm text-gray-800">{fmt(user.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-gray-800">{fmtFull(user.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Affiliation ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Affiliation</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "College",    value: user.college?.name,    icon: <Building      className="h-4 w-4 text-gray-400" /> },
            { label: "Department", value: user.department?.name, icon: <Building      className="h-4 w-4 text-gray-400" /> },
            { label: "Laboratory", value: user.laboratory?.name, icon: <FlaskConical  className="h-4 w-4 text-gray-400" /> },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-3">
              {f.icon}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
                <p className="mt-0.5 text-sm text-gray-800">{f.value || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Roles ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Roles</h2>
          <button onClick={() => { setShowRoles(v => !v); setRolesError(""); }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700">
            {showRoles ? "Cancel" : "Edit Roles"}
          </button>
        </div>

        {!showRoles ? (
          <div className="flex flex-wrap gap-2">
            {user.roles.length > 0 ? user.roles.map(ur => (
              <span key={ur.role.id} className={`rounded-full px-3 py-1 text-sm font-semibold ${ROLE_COLORS[ur.role.name] ?? "bg-gray-100 text-gray-600"}`}>
                {ur.role.name.replace(/_/g, " ")}
              </span>
            )) : <p className="text-sm text-gray-400">No roles assigned</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_ROLES.map(role => (
                <label key={role} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition
                  ${selectedRoles.includes(role) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="sr-only" />
                  <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0
                    ${selectedRoles.includes(role) ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                    {selectedRoles.includes(role) && <CheckCircle className="h-3 w-3 text-white" />}
                  </span>
                  {role.replace(/_/g, " ")}
                </label>
              ))}
            </div>
            {rolesError && <p className="text-sm text-red-600">{rolesError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setShowRoles(false); setSelectedRoles(user.roles.map(ur => ur.role.name)); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleRolesUpdate} disabled={rolesLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {rolesLoading ? "Saving…" : "Save Roles"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Registration Request ── */}
      {user.registrationRequest && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Registration Request</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Status",      value: user.registrationRequest.status },
              { label: "Submitted",   value: fmtFull(user.registrationRequest.createdAt) },
              { label: "Reviewed At", value: fmtFull(user.registrationRequest.reviewedAt) },
              { label: "Reason",      value: user.registrationRequest.reason || "—" },
            ].map(f => (
              <div key={f.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-gray-800">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Actions</h2>

        {!showStatus ? (
          <button onClick={() => { setShowStatus(true); setNewStatus(""); setStatusError(""); }}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100">
            <ShieldCheck className="h-4 w-4" /> Change Status
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Current:</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.badge}`}>
                {statusCfg.icon}{statusCfg.label}
              </span>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="" disabled>Select status…</option>
                {["ACTIVE", "SUSPENDED", "INACTIVE", "PENDING"].filter(s => s !== user.status).map(s => (
                  <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            {statusError && <p className="text-sm text-red-600">{statusError}</p>}
            <div className="flex gap-3">
              <button onClick={handleStatusUpdate} disabled={statusLoading || !newStatus}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {statusLoading ? "Updating…" : "Update Status"}
              </button>
              <button onClick={() => { setShowStatus(false); setStatusError(""); }}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
