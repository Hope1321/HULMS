"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserCheck, UserX, UserMinus, Plus,
  Eye, ShieldCheck, X as XIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Role { id: string; name: string; }
interface UserRole { role: Role; }
interface RegistrationRequest { status: string; }

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
  isEmailVerified: boolean;
  createdAt: string;
  roles: UserRole[];
  registrationRequest: RegistrationRequest | null;
  college:    { name: string } | null;
  department: { name: string } | null;
  laboratory: { name: string } | null;
}

const STATUS_CFG: Record<string, { badge: string; label: string; icon: React.ReactNode }> = {
  ACTIVE:    { label: "Active",    badge: "bg-green-100  text-green-700  border border-green-200",  icon: <UserCheck className="h-3.5 w-3.5" /> },
  PENDING:   { label: "Pending",   badge: "bg-amber-100  text-amber-700  border border-amber-200",  icon: <UserMinus className="h-3.5 w-3.5" /> },
  SUSPENDED: { label: "Suspended", badge: "bg-red-100    text-red-700    border border-red-200",    icon: <UserX     className="h-3.5 w-3.5" /> },
  INACTIVE:  { label: "Inactive",  badge: "bg-gray-100   text-gray-600   border border-gray-200",   icon: <UserX     className="h-3.5 w-3.5" /> },
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:          "bg-purple-100 text-purple-700",
  DIRECTOR:       "bg-blue-100   text-blue-700",
  LAB_TECHNICIAN: "bg-teal-100   text-teal-700",
  LECTURER:       "bg-indigo-100 text-indigo-700",
  RESEARCHER:     "bg-cyan-100   text-cyan-700",
  STUDENT:        "bg-gray-100   text-gray-600",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG.INACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.badge}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function UsersPage() {
  const [users,        setUsers]        = useState<User[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* status change modal */
  const [statusTarget,  setStatusTarget]  = useState<User | null>(null);
  const [newStatus,     setNewStatus]     = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError,   setStatusError]   = useState("");

  /* ── fetch ── */
  const fetchUsers = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/users`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load users");
      setUsers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  /* ── change status ── */
  const confirmStatusChange = async () => {
    if (!statusTarget || !newStatus) return;
    setStatusError(""); setStatusLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${statusTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to update status.");
      setUsers(prev => prev.map(u => u.id === statusTarget.id ? { ...u, status: newStatus as User["status"] } : u));
      setStatusTarget(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally { setStatusLoading(false); }
  };

  /* ── filter ── */
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
       u.email.toLowerCase().includes(q) ||
       (u.phone ?? "").toLowerCase().includes(q)) &&
      (statusFilter === "ALL" || u.status === statusFilter)
    );
  });

  const count = (s: string) => users.filter(u => u.status === s).length;

  return (
    <div>
      {/* ── Status Change Modal ── */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <button onClick={() => { setStatusTarget(null); setStatusError(""); }}
                className="rounded-lg p-1 hover:bg-gray-100">
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Change User Status</h2>
            <p className="mt-1 text-sm text-gray-600">
              Update status for <span className="font-semibold text-gray-900">{statusTarget.firstName} {statusTarget.lastName}</span>
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="" disabled>Select status…</option>
                {["ACTIVE", "SUSPENDED", "INACTIVE", "PENDING"].filter(s => s !== statusTarget.status).map(s => (
                  <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
                ))}
              </select>
            </div>
            {statusError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{statusError}</div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setStatusTarget(null); setStatusError(""); }} disabled={statusLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={confirmStatusChange} disabled={statusLoading || !newStatus}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {statusLoading ? "Updating…" : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">Manage system users and their access</p>
          </div>
        </div>
        <Link href="/admin/dashboard/users/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Create User
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Users", value: users.length,         color: "text-gray-900",  bg: "bg-gray-50",  icon: <Users     className="h-5 w-5 text-gray-400"  /> },
          { label: "Active",      value: count("ACTIVE"),       color: "text-green-700", bg: "bg-green-50", icon: <UserCheck className="h-5 w-5 text-green-400" /> },
          { label: "Pending",     value: count("PENDING"),      color: "text-amber-700", bg: "bg-amber-50", icon: <UserMinus className="h-5 w-5 text-amber-400" /> },
          { label: "Suspended",   value: count("SUSPENDED"),    color: "text-red-700",   bg: "bg-red-50",   icon: <UserX    className="h-5 w-5 text-red-400"    /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <div className={`rounded-lg p-1.5 ${s.bg}`}>{s.icon}</div>
            </div>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
            <input type="text" placeholder="Name, email, or phone…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS_CFG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
          <p className="mt-4 text-sm text-gray-500">Loading users…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No users found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["User", "Email", "Roles", "Department", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(user => (
                  <tr key={user.id} className="group transition hover:bg-gray-50">
                    {/* User */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                          {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{user.email}</p>
                      {user.isEmailVerified && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
                          <UserCheck className="h-3 w-3" /> Verified
                        </p>
                      )}
                    </td>
                    {/* Roles */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? user.roles.map(ur => (
                          <span key={ur.role.id} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[ur.role.name] ?? "bg-gray-100 text-gray-600"}`}>
                            {ur.role.name.replace("_", " ")}
                          </span>
                        )) : <span className="text-xs text-gray-400">No roles</span>}
                      </div>
                    </td>
                    {/* Department */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{user.department?.name ?? "—"}</p>
                      {user.laboratory && <p className="text-xs text-gray-400">{user.laboratory.name}</p>}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4"><StatusBadge status={user.status} /></td>
                    {/* Joined */}
                    <td className="px-5 py-4 text-sm text-gray-600">{fmt(user.createdAt)}</td>
                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/dashboard/users/${user.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                        <button
                          onClick={() => { setStatusError(""); setNewStatus(""); setStatusTarget(user); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50">
                          <ShieldCheck className="h-3.5 w-3.5" /> Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3.5 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{users.length}</span> users
          </div>
        </div>
      )}
    </div>
  );
}
