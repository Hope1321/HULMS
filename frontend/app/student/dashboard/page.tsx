"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle, Send, Bell,
  Plus, ChevronRight, FlaskConical, XCircle,
  AlertCircle, TrendingUp, ArrowRight, Package,
  Activity, Calendar,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestItem { id: string; chemical: { name: string }; unit: { symbol: string }; approvedQty?: number | null; }
interface RecentRequest { id: string; requestNumber: string; status: string; requiredDate: string | null; createdAt: string; items: RequestItem[]; }
interface RecentIssuance { id: string; issuanceNumber: string; quantity: number; issuedAt: string | null; createdAt: string; batch: { chemical: { name: string }; unit: { symbol: string } }; }
interface RecentNotification { id: string; title: string; message: string; isRead: boolean; createdAt: string; }
interface ApprovedRequest { id: string; requestNumber: string; updatedAt: string; items: { approvedQty?: number | null; unit: { symbol: string } }[]; approvals: { createdAt: string }[]; }
interface DashboardData {
  summary: {
    requests: { total: number; pending: number; approved: number; rejected: number };
    issuances: { total: number };
    notifications: { unread: number };
  };
  recentRequests: RecentRequest[];
  recentIssuances: RecentIssuance[];
  recentNotifications: RecentNotification[];
  approvedRequestsList: ApprovedRequest[];
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtRel = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED:  "bg-green-50 text-green-700 border border-green-200",
  REJECTED:  "bg-red-50 text-red-700 border border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
  ISSUED:    "bg-blue-50 text-blue-700 border border-blue-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:   <Clock      className="h-3 w-3" />,
  APPROVED:  <CheckCircle className="h-3 w-3" />,
  REJECTED:  <XCircle    className="h-3 w-3" />,
  ISSUED:    <Send       className="h-3 w-3" />,
};

function DonutChart({ pending, approved, rejected, total }: { pending: number; approved: number; rejected: number; total: number }) {
  const r = 40, cx = 52, cy = 52, c = 2 * Math.PI * r;
  const p = (n: number) => total > 0 ? n / total : 0;
  const pP = p(pending), pA = p(approved), pR = p(rejected);
  const seg = (pct: number, off: number, color: string) => (
    <circle key={color} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="14"
      strokeDasharray={`${pct * c} ${c}`} strokeDashoffset={-off * c}
      transform={`rotate(-90 ${cx} ${cy})`} />
  );
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg viewBox="0 0 104 104" className="h-24 w-24">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {total > 0 && <>{seg(pP, 0, "#f59e0b")}{seg(pA, pP, "#22c55e")}{seg(pR, pP + pA, "#ef4444")}</>}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Pending",  v: pending,  pct: pP, dot: "bg-amber-400" },
          { label: "Approved", v: approved, pct: pA, dot: "bg-green-500" },
          { label: "Rejected", v: rejected, pct: pR, dot: "bg-red-500"   },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <span className="w-14 text-xs text-gray-500">{s.label}</span>
            <span className="text-xs font-bold text-gray-900">{s.v}</span>
            <span className="text-xs text-gray-400">({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Fetch user name
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.userId) {
        fetch(`${API}/users/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(res => { if (res.success && res.data) setUserName(res.data.firstName); })
          .catch(() => {});
      }
    } catch { /* ignore */ }

    fetch(`${API}/dashboard/student`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (!res.success) throw new Error(res.message); setData(res.data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-green-600" />
        <p className="text-sm text-gray-400">Loading your dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;
  const { summary, recentRequests, recentIssuances, recentNotifications, approvedRequestsList } = data;

  return (
    <div className="space-y-5">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-green-900 p-6 text-white shadow-lg" style={{ background: "linear-gradient(to right, #14532d, #166534, #065f46)" }}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 right-32 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white/70" />
              <p className="text-sm font-medium text-white/80">Student Portal · HULMS</p>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Welcome back{userName ? `, ${userName}` : ""}! 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              {summary.requests.pending > 0
                ? <><strong className="text-white">{summary.requests.pending}</strong> pending request{summary.requests.pending !== 1 ? "s" : ""} awaiting review.</>
                : "All your requests are up to date."}
              {summary.notifications.unread > 0 && (
                <> &nbsp;·&nbsp; <strong className="text-yellow-300">{summary.notifications.unread}</strong> unread notification{summary.notifications.unread !== 1 ? "s" : ""}.</>
              )}
            </p>
          </div>
          <Link href="/student/requests/create"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-green-800 shadow-md transition hover:bg-green-50">
            <Plus className="h-4 w-4" /> New Chemical Request
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "My Requests",     value: summary.requests.total,       icon: ClipboardList, color: "text-blue-700",   bg: "bg-blue-50",   href: "/student/requests",                  border: "border-blue-100"   },
          { label: "Pending",         value: summary.requests.pending,     icon: Clock,         color: "text-amber-700",  bg: "bg-amber-50",  href: "/student/requests?status=PENDING",   border: "border-amber-100"  },
          { label: "Approved",        value: summary.requests.approved,    icon: CheckCircle,   color: "text-green-700",  bg: "bg-green-50",  href: "/student/requests?status=APPROVED",  border: "border-green-100"  },
          { label: "Chemicals Issued",value: summary.issuances.total,      icon: Package,       color: "text-purple-700", bg: "bg-purple-50", href: "/student/issuances",                 border: "border-purple-100" },
          { label: "Notifications",   value: summary.notifications.unread, icon: Bell,          color: "text-rose-700",   bg: "bg-rose-50",   href: "/student/notifications",             border: "border-rose-100"   },
        ].map(({ label, value, icon: Icon, color, bg, href, border }) => (
          <Link key={label} href={href}
            className={`group rounded-2xl border ${border} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Donut overview */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Requests Overview</h2>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <DonutChart
            pending={summary.requests.pending}
            approved={summary.requests.approved}
            rejected={summary.requests.rejected}
            total={summary.requests.total}
          />
          <Link href="/student/requests"
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
            View all requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recent requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Recent Requests</h2>
            </div>
            <Link href="/student/requests" className="flex items-center gap-0.5 text-xs font-semibold text-green-600 hover:text-green-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <ClipboardList className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm font-medium text-gray-400">No requests yet</p>
                <Link href="/student/requests/create"
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                  <Plus className="h-3.5 w-3.5" /> Create your first request
                </Link>
              </div>
            ) : (
              recentRequests.map(req => (
                <Link key={req.id} href={`/student/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <FlaskConical className="h-3 w-3 shrink-0" />
                      <span className="truncate">{req.items[0]?.chemical.name ?? "—"}</span>
                      <span>·</span>
                      <span>{fmt(req.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_ICON[req.status]} {req.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Notifications</h2>
              {summary.notifications.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {summary.notifications.unread}
                </span>
              )}
            </div>
            <Link href="/student/notifications" className="flex items-center gap-0.5 text-xs font-semibold text-green-600 hover:text-green-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <Bell className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm font-medium text-gray-400">No notifications</p>
              </div>
            ) : (
              recentNotifications.slice(0, 5).map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-50 ${!n.isRead ? "bg-green-50/30" : ""}`}>
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!n.isRead ? "bg-green-100" : "bg-gray-100"}`}>
                    <Bell className={`h-3.5 w-3.5 ${!n.isRead ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{n.message}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{fmtRel(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Approved requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Approved Requests</h2>
            </div>
            <Link href="/student/requests?status=APPROVED"
              className="flex items-center gap-0.5 text-xs font-semibold text-green-600 hover:text-green-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {approvedRequestsList.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <CheckCircle className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm font-medium text-gray-400">No approved requests yet</p>
              </div>
            ) : (
              approvedRequestsList.map(req => {
                const item     = req.items?.[0];
                const approval = req.approvals?.[0];
                return (
                  <Link key={req.id} href={`/student/requests/${req.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                      {approval && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>Approved {fmt(approval.createdAt)}</span>
                        </div>
                      )}
                    </div>
                    {item && (
                      <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                        {item.approvedQty ?? "—"} {item.unit?.symbol}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Issued chemicals */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                <FlaskConical className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Issued Chemicals</h2>
            </div>
            <Link href="/student/issuances"
              className="flex items-center gap-0.5 text-xs font-semibold text-green-600 hover:text-green-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIssuances.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <FlaskConical className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm font-medium text-gray-400">No chemicals issued yet</p>
                <p className="mt-1 text-xs text-gray-400">Approved requests will appear here after issuance</p>
              </div>
            ) : (
              recentIssuances.map(iss => (
                <div key={iss.id} className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{iss.issuanceNumber}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <FlaskConical className="h-3 w-3 shrink-0" />
                      <span className="truncate">{iss.batch.chemical.name}</span>
                      <span>·</span>
                      <span>{fmt(iss.issuedAt ?? iss.createdAt)}</span>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                    {iss.quantity} {iss.batch.unit.symbol}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
