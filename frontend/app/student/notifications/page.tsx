"use client";

import { useEffect, useState } from "react";
import {
  Bell, CheckCheck, Check, FlaskConical,
  PackageCheck, XCircle, AlertTriangle,
  ClipboardList, Info, Filter,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/* ── Type config ─────────────────────────────────────────────────────────── */
const TYPE_CFG: Record<string, { icon: React.ReactNode; badge: string; dot: string }> = {
  REQUEST_APPROVED:  { icon: <CheckCheck    className="h-4 w-4" />, badge: "bg-green-100 text-green-700",  dot: "bg-green-500"  },
  REQUEST_REJECTED:  { icon: <XCircle       className="h-4 w-4" />, badge: "bg-red-100 text-red-700",      dot: "bg-red-500"    },
  REQUEST_CREATED:   { icon: <ClipboardList className="h-4 w-4" />, badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"   },
  CHEMICAL_ISSUED:   { icon: <PackageCheck  className="h-4 w-4" />, badge: "bg-purple-100 text-purple-700",dot: "bg-purple-500" },
  LOW_STOCK:         { icon: <AlertTriangle className="h-4 w-4" />, badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  CHEMICAL_EXPIRING: { icon: <AlertTriangle className="h-4 w-4" />, badge: "bg-orange-100 text-orange-700",dot: "bg-orange-500" },
  CHEMICAL_EXPIRED:  { icon: <FlaskConical  className="h-4 w-4" />, badge: "bg-red-100 text-red-700",      dot: "bg-red-500"    },
  HIGH_HAZARD:       { icon: <AlertTriangle className="h-4 w-4" />, badge: "bg-rose-100 text-rose-700",    dot: "bg-rose-500"   },
  SYSTEM:            { icon: <Info          className="h-4 w-4" />, badge: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"   },
};

const defaultCfg = { icon: <Bell className="h-4 w-4" />, badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtRel = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
};

/* Group notifications by date label */
function groupByDate(list: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  list.forEach(n => {
    const label = fmtDate(n.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [filter,        setFilter]        = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [markingAll,    setMarkingAll]    = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (!res.success) throw new Error(res.message); setNotifications(res.data ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const markOne = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API}/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    const result = await res.json();
    if (result.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
    }
  };

  const markAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setMarkingAll(true);
    const res = await fetch(`${API}/notifications/read-all`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    const result = await res.json();
    if (result.success) {
      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: now })));
    }
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n =>
    filter === "UNREAD" ? !n.isRead : filter === "READ" ? n.isRead : true
  );

  const groups = groupByDate(filtered);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-green-600" />
        <p className="text-sm text-gray-400">Loading notifications…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <p className="font-semibold text-red-700">{error}</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-green-900">
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-100 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",  value: notifications.length,                                   color: "text-gray-700"  },
          { label: "Unread", value: notifications.filter(n => !n.isRead).length,            color: "text-rose-600"  },
          { label: "Read",   value: notifications.filter(n =>  n.isRead).length,            color: "text-green-700" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
        <Filter className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
        {(["ALL", "UNREAD", "READ"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              filter === f
                ? f === "UNREAD" ? "bg-rose-600 text-white shadow-sm"
                : "bg-green-900 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}>
            {f === "ALL" ? "All" : f === "UNREAD" ? `Unread (${notifications.filter(n=>!n.isRead).length})` : "Read"}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Bell className="h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-500">
            {filter === "UNREAD" ? "No unread notifications" : filter === "READ" ? "No read notifications" : "No notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              {/* Date group header */}
              <div className="mb-2 flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{date}</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              {/* Items */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50">
                {items.map(n => {
                  const cfg = TYPE_CFG[n.type] ?? defaultCfg;
                  return (
                    <div key={n.id}
                      className={`flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50 ${!n.isRead ? "bg-green-50/30" : ""}`}>

                      {/* Icon */}
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.badge}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm ${!n.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                            {n.title}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                            {n.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{n.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{fmtRel(n.createdAt)} · {fmtFull(n.createdAt)}</p>
                      </div>

                      {/* Unread indicator + mark read */}
                      <div className="flex shrink-0 flex-col items-center gap-2">
                        {!n.isRead && <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />}
                        {!n.isRead && (
                          <button onClick={() => markOne(n.id)}
                            title="Mark as read"
                            className="rounded-lg p-1.5 text-gray-300 transition hover:bg-gray-100 hover:text-green-600">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
