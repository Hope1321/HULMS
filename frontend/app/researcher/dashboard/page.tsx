"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle, FlaskConical,
  FolderOpen, Bell, Plus, ChevronRight, ArrowRight,
  TrendingUp, XCircle, Send, FileText, AlertCircle,
  Calendar, Activity,
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
  PENDING:   "bg-amber-100 text-amber-700 border border-amber-200",
  APPROVED:  "bg-green-100 text-green-700 border border-green-200",
  REJECTED:  "bg-red-100 text-red-700 border border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
  ISSUED:    "bg-blue-100 text-blue-700 border border-blue-200",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:   <Clock       className="h-3 w-3" />,
  APPROVED:  <CheckCircle className="h-3 w-3" />,
  REJECTED:  <XCircle     className="h-3 w-3" />,
  ISSUED:    <Send        className="h-3 w-3" />,
};

function DonutChart({ pending, approved, rejected, total }: { pending: number; approved: number; rejected: number; total: number }) {
  const r = 44, cx = 56, cy = 56, c = 2 * Math.PI * r;
  const p = (n: number) => total > 0 ? n / total : 0;
  const pP = p(pending), pA = p(approved), pR = p(rejected);
  const seg = (pct: number, off: number, color: string) => (
    <circle key={color} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="16"
      strokeDasharray={`${pct * c} ${c}`} strokeDashoffset={-off * c}
      transform={`rotate(-90 ${cx} ${cy})`} />
  );
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 112 112" className="h-28 w-28">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
          {total > 0 && <>{seg(pP, 0, "#3b82f6")}{seg(pA, pP, "#22c55e")}{seg(pR, pP + pA, "#ef4444")}</>}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Pending",  v: pending,  pct: pP, dot: "bg-blue-500"  },
          { label: "Approved", v: approved, pct: pA, dot: "bg-green-500" },
          { label: "Rejected", v: rejected, pct: pR, dot: "bg-red-500"   },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="w-16 text-sm text-gray-500">{s.label}</span>
            <span className="text-sm font-bold text-gray-900">{s.v}</span>
            <span className="text-xs text-gray-400">({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Static research projects — can be replaced with real API */
const PROJECTS = [
  { title: "Thesis: Water Quality Analysis",     status: "Ongoing",     color: "bg-violet-100 text-violet-700" },
  { title: "Project: Organic Synthesis",         status: "Ongoing",     color: "bg-cyan-100 text-cyan-700"    },
  { title: "Study: Soil Chemical Composition",   status: "Completed",   color: "bg-green-100 text-green-700"  },
];

export default function ResearcherDashboardPage() {
  const [data,     setData]     = useState<DashboardData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-violet-600" />
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    </div>
  );
  if (!data) return null;

  const { summary, recentRequests, recentIssuances, recentNotifications, approvedRequestsList } = data;

  return (
    <div className="space-y-6">

      {/* ── Welcome ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Welcome back, {userName || "Researcher"} 👋
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "My Requests",      value: summary.requests.total,       icon: ClipboardList, bg: "#eff6ff", color: "#1d4ed8", href: "/researcher/requests"                 },
          { label: "Pending Requests", value: summary.requests.pending,     icon: Clock,         bg: "#fffbeb", color: "#d97706", href: "/researcher/requests?status=PENDING"  },
          { label: "Approved Requests",value: summary.requests.approved,    icon: CheckCircle,   bg: "#f0fdf4", color: "#16a34a", href: "/researcher/requests?status=APPROVED" },
          { label: "Issued Chemicals", value: summary.issuances.total,      icon: FlaskConical,  bg: "#faf5ff", color: "#7c3aed", href: "/researcher/issuances"                },
          { label: "Active Projects",  value: PROJECTS.filter(p=>p.status==="Ongoing").length, icon: FolderOpen, bg: "#ecfeff", color: "#0891b2", href: "/researcher/history" },
        ].map(({ label, value, icon: Icon, bg, color, href }) => (
          <Link key={label} href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Donut */}
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
          <Link href="/researcher/requests"
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
            View all requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recent Research Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Recent Research Requests</h2>
            </div>
            <Link href="/researcher/requests" className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <ClipboardList className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">No requests yet</p>
                <Link href="/researcher/requests/create"
                  className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:opacity-90"
                  style={{ background: "#f5f3ff" }}>
                  <Plus className="h-3.5 w-3.5" /> Create your first request
                </Link>
              </div>
            ) : (
              recentRequests.map(req => (
                <Link key={req.id} href={`/researcher/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <FlaskConical className="h-3 w-3 shrink-0" />
                      <span className="truncate">{req.items[0]?.chemical.name ?? "—"}</span>
                      <span>·</span>
                      <span>{fmt(req.createdAt)}</span>
                    </div>
                    {req.requiredDate && (
                      <p className="mt-0.5 text-xs text-gray-400">{fmt(req.requiredDate)}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_ICON[req.status]} {req.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/researcher/requests/create"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "#7c3aed" }}>
              <Plus className="h-4 w-4" /> New Research Request
            </Link>
            <Link href="/researcher/requests"
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
              <ClipboardList className="h-4 w-4" /> View My Requests
            </Link>
            <Link href="/researcher/notifications"
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
              <Bell className="h-4 w-4" /> Notifications
              {summary.notifications.unread > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {summary.notifications.unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Approved Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Approved Requests</h2>
            </div>
            <Link href="/researcher/requests?status=APPROVED"
              className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {approvedRequestsList.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No approved requests yet</p>
            ) : (
              approvedRequestsList.map(req => {
                const item     = req.items?.[0];
                const approval = req.approvals?.[0];
                return (
                  <Link key={req.id} href={`/researcher/requests/${req.id}`}
                    className="flex items-center justify-between px-5 py-3.5 transition hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                      {approval && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>Approved: {fmt(approval.createdAt)}</span>
                        </div>
                      )}
                    </div>
                    {item && (
                      <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                        Qty: {item.approvedQty ?? "—"} {item.unit?.symbol}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Issued Chemicals */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                <FlaskConical className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Issued Chemicals</h2>
            </div>
            <Link href="/researcher/issuances"
              className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIssuances.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <FlaskConical className="h-9 w-9 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">No chemicals issued yet</p>
              </div>
            ) : (
              recentIssuances.map(iss => (
                <div key={iss.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{iss.issuanceNumber}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <FlaskConical className="h-3 w-3 shrink-0" />
                      <span>{iss.batch.chemical.name}</span>
                      <span>·</span>
                      <span>Issued: {fmt(iss.issuedAt ?? iss.createdAt)}</span>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                    Qty: {iss.quantity} {iss.batch.unit.symbol}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Research Projects */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100">
                <FolderOpen className="h-4 w-4 text-cyan-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Active Research Projects</h2>
            </div>
            <Link href="/researcher/history"
              className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {PROJECTS.filter(p => p.status === "Ongoing").map(proj => (
              <div key={proj.title} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
                    <FileText className="h-3.5 w-3.5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{proj.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{proj.status}</p>
                  </div>
                </div>
                <span className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${proj.color}`}>
                  {proj.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notifications strip ── */}
      {recentNotifications.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Recent Notifications</h2>
              {summary.notifications.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {summary.notifications.unread}
                </span>
              )}
            </div>
            <Link href="/researcher/notifications" className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentNotifications.slice(0, 3).map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-50 ${!n.isRead ? "bg-violet-50/30" : ""}`}>
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!n.isRead ? "bg-violet-100" : "bg-gray-100"}`}>
                  <Bell className={`h-3.5 w-3.5 ${!n.isRead ? "text-violet-600" : "text-gray-400"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{n.message}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{fmtRel(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
