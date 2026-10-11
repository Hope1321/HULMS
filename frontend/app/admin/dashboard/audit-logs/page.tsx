"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Plus, Pencil, Trash2, Send,
  CheckCircle, XCircle, Ban, Eye, Search,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: User | null;
}

/* ── action config ── */
const ACTION_CFG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  CREATE:  { label: "Create",  badge: "bg-green-100  text-green-700  border border-green-200",  icon: <Plus          className="h-3.5 w-3.5" /> },
  UPDATE:  { label: "Update",  badge: "bg-blue-100   text-blue-700   border border-blue-200",   icon: <Pencil        className="h-3.5 w-3.5" /> },
  DELETE:  { label: "Delete",  badge: "bg-red-100    text-red-700    border border-red-200",    icon: <Trash2        className="h-3.5 w-3.5" /> },
  ISSUE:   { label: "Issue",   badge: "bg-purple-100 text-purple-700 border border-purple-200", icon: <Send          className="h-3.5 w-3.5" /> },
  CANCEL:  { label: "Cancel",  badge: "bg-gray-100   text-gray-600   border border-gray-200",   icon: <Ban           className="h-3.5 w-3.5" /> },
  APPROVE: { label: "Approve", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  REJECT:  { label: "Reject",  badge: "bg-orange-100 text-orange-700 border border-orange-200", icon: <XCircle      className="h-3.5 w-3.5" /> },
};

const ENTITY_COLORS: Record<string, string> = {
  Chemical:           "bg-sky-100     text-sky-700",
  ChemicalBatch:      "bg-indigo-100  text-indigo-700",
  ChemicalRequest:    "bg-amber-100   text-amber-700",
  ChemicalIssuance:   "bg-violet-100  text-violet-700",
  Alert:              "bg-rose-100    text-rose-700",
  User:               "bg-teal-100    text-teal-700",
};

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const fmtRelative = (d: string) => {
  const diff  = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function AuditLogsPage() {
  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  /* ── fetch ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }

    const params = new URLSearchParams();
    fetch(`${API}/audit-logs?${params}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) throw new Error(result.message || "Failed to load audit logs");
        setLogs(result.data || []);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, []);

  /* ── unique entities for filter ── */
  const entities = Array.from(new Set(logs.map(l => l.entity))).sort();
  const actions  = Array.from(new Set(logs.map(l => l.action))).sort();

  /* ── filter ── */
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (
      (l.action.toLowerCase().includes(q) ||
       l.entity.toLowerCase().includes(q) ||
       (l.description ?? "").toLowerCase().includes(q) ||
       (l.user ? `${l.user.firstName} ${l.user.lastName}`.toLowerCase().includes(q) : false) ||
       (l.entityId ?? "").toLowerCase().includes(q)) &&
      (actionFilter === "ALL" || l.action === actionFilter) &&
      (entityFilter === "ALL" || l.entity === entityFilter)
    );
  });

  /* ── stats ── */
  const countAction = (a: string) => logs.filter(l => l.action === a).length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Complete history of system actions and changes</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Logs",  value: logs.length,           color: "text-gray-900"   },
          { label: "Creates",     value: countAction("CREATE"),  color: "text-green-700"  },
          { label: "Issues",      value: countAction("ISSUE"),   color: "text-purple-700" },
          { label: "Deletes",     value: countAction("DELETE"),  color: "text-red-700"    },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Action, entity, description, or user…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Action</label>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{ACTION_CFG[a]?.label ?? a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Entity</label>
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="ALL">All Entities</option>
              {entities.map(e => (
                <option key={e} value={e}>{e}</option>
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
          <p className="mt-4 text-sm text-gray-500">Loading audit logs…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">No audit logs found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Action", "Entity", "Description", "Performed By", "IP Address", "Time", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(log => {
                  const actionCfg = ACTION_CFG[log.action] ?? { label: log.action, badge: "bg-gray-100 text-gray-600 border border-gray-200", icon: null };
                  const entityColor = ENTITY_COLORS[log.entity] ?? "bg-gray-100 text-gray-600";
                  return (
                    <tr key={log.id} className="group transition hover:bg-gray-50">
                      {/* Action */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${actionCfg.badge}`}>
                          {actionCfg.icon}{actionCfg.label}
                        </span>
                      </td>
                      {/* Entity */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${entityColor}`}>
                            {log.entity}
                          </span>
                          {log.entityId && (
                            <span className="font-mono text-xs text-gray-400" title={log.entityId}>
                              {log.entityId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Description */}
                      <td className="max-w-[260px] px-5 py-4">
                        <p className="truncate text-sm text-gray-700" title={log.description ?? ""}>
                          {log.description || <span className="text-gray-400">—</span>}
                        </p>
                      </td>
                      {/* User */}
                      <td className="px-5 py-4">
                        {log.user ? (
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">System</span>
                        )}
                      </td>
                      {/* IP */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500">{log.ipAddress || "—"}</span>
                      </td>
                      {/* Time */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700" title={fmtFull(log.createdAt)}>
                          {fmtRelative(log.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">{fmtFull(log.createdAt)}</p>
                      </td>
                      {/* Detail link */}
                      <td className="px-5 py-4">
                        <Link href={`/admin/dashboard/audit-logs/${log.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 opacity-0 transition hover:bg-gray-100 group-hover:opacity-100">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-3.5 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
            <span className="font-semibold text-gray-700">{logs.length}</span> logs
          </div>
        </div>
      )}
    </div>
  );
}
