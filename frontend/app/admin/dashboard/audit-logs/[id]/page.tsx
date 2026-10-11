"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, Pencil, Trash2, Send,
  CheckCircle, XCircle, Ban, User as UserIcon,
  Clock, Globe, Monitor,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: User | null;
}

const ACTION_CFG: Record<string, { label: string; badge: string; bg: string; border: string; icon: React.ReactNode }> = {
  CREATE:  { label: "Create",  badge: "bg-green-100  text-green-700",   bg: "bg-green-50",   border: "border-green-200",   icon: <Plus          className="h-5 w-5 text-green-600"   /> },
  UPDATE:  { label: "Update",  badge: "bg-blue-100   text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    icon: <Pencil        className="h-5 w-5 text-blue-600"    /> },
  DELETE:  { label: "Delete",  badge: "bg-red-100    text-red-700",     bg: "bg-red-50",     border: "border-red-200",     icon: <Trash2        className="h-5 w-5 text-red-600"     /> },
  ISSUE:   { label: "Issue",   badge: "bg-purple-100 text-purple-700",  bg: "bg-purple-50",  border: "border-purple-200",  icon: <Send          className="h-5 w-5 text-purple-600"  /> },
  CANCEL:  { label: "Cancel",  badge: "bg-gray-100   text-gray-600",    bg: "bg-gray-50",    border: "border-gray-200",    icon: <Ban           className="h-5 w-5 text-gray-500"    /> },
  APPROVE: { label: "Approve", badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle   className="h-5 w-5 text-emerald-600" /> },
  REJECT:  { label: "Reject",  badge: "bg-orange-100 text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200",  icon: <XCircle       className="h-5 w-5 text-orange-600"  /> },
};

const ENTITY_COLORS: Record<string, string> = {
  Chemical:          "bg-sky-100    text-sky-700",
  ChemicalBatch:     "bg-indigo-100 text-indigo-700",
  ChemicalRequest:   "bg-amber-100  text-amber-700",
  ChemicalIssuance:  "bg-violet-100 text-violet-700",
  Alert:             "bg-rose-100   text-rose-700",
  User:              "bg-teal-100   text-teal-700",
};

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  Chemical:          id => `/admin/dashboard/chemicals/${id}/edit`,
  ChemicalBatch:     id => `/admin/dashboard/batches/${id}/edit`,
  ChemicalRequest:   id => `/admin/dashboard/requests/${id}`,
  ChemicalIssuance:  id => `/admin/dashboard/issuances/${id}`,
};

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

/* renders a key/value diff table */
function DataTable({ data, title, bg }: { data: Record<string, unknown>; title: string; bg: string }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden`}>
      <div className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 ${bg}`}>
        {title}
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-gray-100">
          {entries.map(([k, v]) => (
            <tr key={k} className="hover:bg-gray-50">
              <td className="w-1/3 px-4 py-2.5 text-xs font-semibold text-gray-500">{k}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-800 break-all">
                {v === null || v === undefined
                  ? <span className="text-gray-400">null</span>
                  : typeof v === "object"
                  ? JSON.stringify(v, null, 2)
                  : String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* diff between old and new — highlights changed keys */
function DiffTable({ oldData, newData }: { oldData: Record<string, unknown>; newData: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  const changed = keys.filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]));
  if (changed.length === 0) return <p className="text-sm text-gray-400">No field differences detected.</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Field", "Before", "After"].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {changed.map(k => (
            <tr key={k} className="bg-yellow-50/50">
              <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{k}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-red-600 line-through break-all">
                {oldData[k] === null ? "null" : String(oldData[k] ?? "—")}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-green-700 break-all">
                {newData[k] === null ? "null" : String(newData[k] ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLogDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [log,     setLog]     = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/audit-logs/${id}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) { setError(result.message || "Log not found."); return; }
        setLog(result.data);
      })
      .catch(() => setError("Failed to load audit log."))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
    </div>
  );

  if (error || !log) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Not found."}</p>
      <Link href="/admin/dashboard/audit-logs" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Back</Link>
    </div>
  );

  const actionCfg  = ACTION_CFG[log.action]  ?? { label: log.action,  badge: "bg-gray-100 text-gray-600", bg: "bg-gray-50", border: "border-gray-200", icon: <FileText className="h-5 w-5 text-gray-500" /> };
  const entityColor = ENTITY_COLORS[log.entity] ?? "bg-gray-100 text-gray-600";
  const entityLink  = log.entityId ? ENTITY_LINKS[log.entity]?.(log.entityId) : null;

  const hasOld  = log.oldData && Object.keys(log.oldData).length > 0;
  const hasNew  = log.newData && Object.keys(log.newData).length > 0;
  const hasDiff = hasOld && hasNew;

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ── Header ── */}
      <div>
        <Link href="/admin/dashboard/audit-logs" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Audit Logs
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${actionCfg.border} ${actionCfg.bg}`}>
            {actionCfg.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${actionCfg.badge}`}>
                {actionCfg.label}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${entityColor}`}>
                {log.entity}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{fmtFull(log.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* ── Summary card ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Log Details</h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Log ID</dt>
            <dd className="mt-0.5 font-mono text-sm text-gray-700 break-all">{log.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Action</dt>
            <dd className="mt-0.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${actionCfg.badge}`}>
                {actionCfg.icon}{actionCfg.label}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Entity Type</dt>
            <dd className="mt-0.5">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${entityColor}`}>
                {log.entity}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Entity ID</dt>
            <dd className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-sm text-gray-700 break-all">{log.entityId || "—"}</span>
              {entityLink && (
                <Link href={entityLink} className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700">
                  View →
                </Link>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</dt>
            <dd className="mt-0.5 text-sm text-gray-800">{log.description || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Timestamp</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-800">
              <Clock className="h-4 w-4 text-gray-400" />
              {fmtFull(log.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── Performed By ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Performed By</h2>
        </div>
        {log.user ? (
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-base font-bold text-gray-600">
              {log.user.firstName[0]}{log.user.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{log.user.firstName} {log.user.lastName}</p>
              <p className="text-sm text-gray-500">{log.user.email}</p>
              {log.user.phone && <p className="text-sm text-gray-400">{log.user.phone}</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">System / automated action</p>
        )}
      </div>

      {/* ── Request Metadata ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Request Metadata</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">IP Address</p>
              <p className="mt-0.5 font-mono text-sm text-gray-800">{log.ipAddress || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">User Agent</p>
              <p className="mt-0.5 text-xs text-gray-600 break-all leading-relaxed">{log.userAgent || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Changes ── */}
      {(hasOld || hasNew) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Pencil className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Data Changes</h2>
          </div>

          <div className="space-y-5">
            {/* Diff view for UPDATE */}
            {hasDiff ? (
              <div>
                <p className="mb-3 text-sm font-semibold text-gray-700">Changed Fields</p>
                <DiffTable
                  oldData={log.oldData as Record<string, unknown>}
                  newData={log.newData as Record<string, unknown>}
                />
              </div>
            ) : null}

            {/* Full old data */}
            {hasOld && (
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  {hasDiff ? "Previous State" : "Deleted Data"}
                </p>
                <DataTable
                  data={log.oldData as Record<string, unknown>}
                  title={hasDiff ? "Before" : "Deleted Record"}
                  bg="bg-red-50"
                />
              </div>
            )}

            {/* Full new data */}
            {hasNew && (
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  {hasDiff ? "New State" : "Created Data"}
                </p>
                <DataTable
                  data={log.newData as Record<string, unknown>}
                  title={hasDiff ? "After" : "Created Record"}
                  bg="bg-green-50"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
