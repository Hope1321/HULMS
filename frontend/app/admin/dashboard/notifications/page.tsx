"use client";

import { useEffect, useState } from "react";
import {
  Bell, Send, CheckCircle, XCircle,
  AlertTriangle, Clock, ShieldAlert,
  CheckCheck, Circle, Check,
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

/* ── type config ── */
const TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
  CHEMICAL_ISSUED:    { label: "Chemical Issued",    icon: <Send          className="h-4 w-4" />, badge: "bg-blue-100   text-blue-700",   dot: "bg-blue-500"   },
  REQUEST_APPROVED:   { label: "Request Approved",   icon: <CheckCircle   className="h-4 w-4" />, badge: "bg-green-100  text-green-700",  dot: "bg-green-500"  },
  REQUEST_REJECTED:   { label: "Request Rejected",   icon: <XCircle       className="h-4 w-4" />, badge: "bg-red-100    text-red-700",    dot: "bg-red-500"    },
  LOW_STOCK:          { label: "Low Stock",          icon: <AlertTriangle className="h-4 w-4" />, badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  CHEMICAL_EXPIRING:  { label: "Chemical Expiring",  icon: <Clock         className="h-4 w-4" />, badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  CHEMICAL_EXPIRED:   { label: "Chemical Expired",   icon: <XCircle       className="h-4 w-4" />, badge: "bg-red-100    text-red-700",    dot: "bg-red-500"    },
  HIGH_HAZARD:        { label: "High Hazard",        icon: <ShieldAlert   className="h-4 w-4" />, badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
};

const fallbackCfg = { label: "Notification", icon: <Bell className="h-4 w-4" />, badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function NotificationsPage() {
  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [filter,         setFilter]         = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [typeFilter,     setTypeFilter]     = useState("ALL");
  const [markingAll,     setMarkingAll]     = useState(false);
  const [readingId,      setReadingId]      = useState<string | null>(null);

  /* ── fetch ── */
  const fetchNotifications = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("token");
      if (!token) { setError("Not authenticated."); return; }
      const res = await fetch(`${API}/notifications`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load notifications");
      setNotifications(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  /* ── mark one as read ── */
  const markAsRead = async (n: Notification) => {
    if (n.isRead) return;
    setReadingId(n.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/notifications/${n.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      setNotifications(prev => prev.map(item =>
        item.id === n.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      ));
    } catch { /* silent */ } finally { setReadingId(null); }
  };

  /* ── mark all as read ── */
  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
    } catch { /* silent */ } finally { setMarkingAll(false); }
  };

  /* ── filter ── */
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = notifications.filter(n => {
    const matchRead = filter === "ALL" || (filter === "UNREAD" ? !n.isRead : n.isRead);
    const matchType = typeFilter === "ALL" || n.type === typeFilter;
    return matchRead && matchType;
  });

  /* group by date */
  const groups: Record<string, Notification[]> = {};
  filtered.forEach(n => {
    const key = new Date(n.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button onClick={markAllAsRead} disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* ── Stats pills ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "All",    value: "ALL",    count: notifications.length },
          { label: "Unread", value: "UNREAD", count: unreadCount },
          { label: "Read",   value: "READ",   count: notifications.length - unreadCount },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value as typeof filter)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition
              ${filter === f.value
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold
              ${filter === f.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
              {f.count}
            </span>
          </button>
        ))}

        {/* type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="ml-auto rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-600 outline-none focus:border-blue-500">
          <option value="ALL">All types</option>
          {Object.entries(TYPE_CFG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Loading notifications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Bell className="mx-auto h-12 w-12 text-gray-200" />
          <p className="mt-4 text-base font-semibold text-gray-500">No notifications</p>
          <p className="mt-1 text-sm text-gray-400">
            {filter === "UNREAD" ? "You have no unread notifications." : "Nothing to show here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              {/* Date divider */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{date}</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {items.map((n, idx) => {
                  const cfg  = TYPE_CFG[n.type] ?? fallbackCfg;
                  const busy = readingId === n.id;
                  return (
                    <div key={n.id}
                      className={`relative flex gap-4 px-5 py-4 transition
                        ${idx !== 0 ? "border-t border-gray-100" : ""}
                        ${!n.isRead ? "bg-blue-50/40" : "bg-white"}
                        hover:bg-gray-50`}>

                      {/* Unread dot */}
                      <div className="flex w-2 shrink-0 items-start pt-1.5">
                        {!n.isRead && (
                          <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        )}
                      </div>

                      {/* Icon */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.badge}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{n.message}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span className="text-xs text-gray-400 whitespace-nowrap" title={fmtFull(n.createdAt)}>
                              {fmtRelative(n.createdAt)}
                            </span>
                            {!n.isRead && (
                              <button onClick={() => markAsRead(n)} disabled={busy}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50">
                                <Check className="h-3 w-3" />
                                {busy ? "…" : "Read"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Type badge + read time */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                          {n.isRead && n.readAt && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Circle className="h-2.5 w-2.5 fill-green-400 text-green-400" />
                              Read {fmtRelative(n.readAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{notifications.length}</span> notifications
        </p>
      )}
    </div>
  );
}
