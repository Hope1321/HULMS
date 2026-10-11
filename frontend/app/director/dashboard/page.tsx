"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  FlaskConical,
  TrendingUp,
  ArrowRight,
  BarChart2,
  FileText,
  AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ── Types ── */
interface RecentRequest {
  id: string;
  requestNumber: string;
  status: string;
  requiredDate: string | null;
  createdAt: string;
  items?: { chemical?: { name: string } }[];
}
interface RecentIssuance {
  id: string;
  issuanceNumber: string;
  quantity: number;
  issuedAt: string | null;
  createdAt: string;
  batch?: { chemical?: { name: string }; unit?: { symbol: string } };
}
interface RecentAlert {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  chemical?: { name: string; hazardLevel: string } | null;
  batch?: { quantity: number; minimumStock: number } | null;
}
interface DashboardData {
  summary: {
    chemicals: { total: number };
    batches: { total: number; lowStock: number; expired: number };
    requests: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
    issuances: { total: number };
    alerts: { active: number };
  };
  recentRequests: RecentRequest[];
  recentIssuances: RecentIssuance[];
  recentAlerts: RecentAlert[];
}

/* ── Helpers ── */
const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtRel = (d: string | null) => {
  if (!d) return "—";

  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000),
    h = Math.floor(diff / 3600000),
    dy = Math.floor(diff / 86400000);

  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
  APPROVED: "bg-green-100 text-green-700 border border-green-200",
  REJECTED: "bg-red-100 text-red-700 border border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500",
  ISSUED: "bg-blue-100 text-blue-700",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3 w-3" />,
  APPROVED: <CheckCircle className="h-3 w-3" />,
  REJECTED: <XCircle className="h-3 w-3" />,
};

/* ── Donut Chart ── */
function DonutChart({
  pending,
  approved,
  rejected,
  total,
}: {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}) {
  const r = 44,
    cx = 56,
    cy = 56,
    c = 2 * Math.PI * r;
  const pct = (n: number) => (total > 0 ? n / total : 0);
  const pP = pct(pending),
    pA = pct(approved),
    pR = pct(rejected);
  const seg = (p: number, off: number, color: string) => (
    <circle
      key={color}
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="16"
      strokeDasharray={`${p * c} ${c}`}
      strokeDashoffset={-off * c}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 112 112" className="h-28 w-28">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
          />
          {total > 0 && (
            <>
              {seg(pP, 0, "#3b82f6")}
              {seg(pA, pP, "#22c55e")}
              {seg(pR, pP + pA, "#ef4444")}
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Pending", v: pending, pct: pP, dot: "bg-blue-500" },
          { label: "Approved", v: approved, pct: pA, dot: "bg-green-500" },
          { label: "Rejected", v: rejected, pct: pR, dot: "bg-red-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="w-16 text-sm text-gray-500">{s.label}</span>
            <span className="text-sm font-bold text-gray-900">{s.v}</span>
            <span className="text-xs text-gray-400">
              ({(s.pct * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bar Chart — Monthly Usage ── */
function BarChart() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const thisYear = [4, 6, 5, 8, 7, 9, 6, 5];
  const lastYear = [3, 4, 4, 6, 5, 7, 5, 4];
  const max = Math.max(...thisYear, ...lastYear, 1);
  return (
    <div>
      <div className="flex items-end gap-2 h-32">
        {months.map((m, i) => (
          <div key={m} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="flex w-full gap-0.5 items-end"
              style={{ height: "100px" }}
            >
              <div
                className="flex-1 rounded-t-sm bg-red-500 transition-all"
                style={{ height: `${(thisYear[i] / max) * 100}px` }}
              />
              <div
                className="flex-1 rounded-t-sm bg-gray-300 transition-all"
                style={{ height: `${(lastYear[i] / max) * 100}px` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{m}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> This Year
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Last Year
        </span>
      </div>
    </div>
  );
}

/* ── Top Chemicals (mock) ── */
const TOP_CHEMICALS = [
  { name: "Ethanol", qty: "2.5 L" },
  { name: "Sodium Hydroxide", qty: "1.2 kg" },
  { name: "Hydrochloric Acid", qty: "0.8 kg" },
];

/* ── Page ── */
export default function DirectorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.userId) {
        fetch(`${API}/users/${payload.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data) setUserName(res.data.firstName);
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }

    fetch(`${API}/dashboard/director`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) throw new Error(res.message);
        setData(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-red-600" />
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      </div>
    );
  if (!data) return null;

  const { summary, recentRequests, recentAlerts } = data;

  return (
    <div className="space-y-6">
      {/* ── Welcome ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Welcome back, {userName || "Director"} 👋
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: "Total Requests",
            sub: "All Requests",
            value: summary.requests.total,
            icon: ClipboardList,
            bg: "#fff7ed",
            color: "#c2410c",
            href: "/director/requests",
          },
          {
            label: "Pending",
            sub: "Pending Requests",
            value: summary.requests.pending,
            icon: Clock,
            bg: "#fef9c3",
            color: "#a16207",
            href: "/director/requests?status=PENDING",
          },
          {
            label: "Approved",
            sub: "Approved Requests",
            value: summary.requests.approved,
            icon: CheckCircle,
            bg: "#f0fdf4",
            color: "#15803d",
            href: "/director/approvals",
          },
          {
            label: "Rejected",
            sub: "Rejected Requests",
            value: summary.requests.rejected,
            icon: XCircle,
            bg: "#fef2f2",
            color: "#dc2626",
            href: "/director/requests?status=REJECTED",
          },
          {
            label: "Active Alerts",
            sub: "Active Alerts",
            value: summary.alerts.active,
            icon: AlertTriangle,
            bg: "#fdf4ff",
            color: "#9333ea",
            href: "/director/alerts",
          },
        ].map(({ label, sub, value, icon: Icon, bg, color, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: bg }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">{sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Donut */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Requests Overview</h2>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <DonutChart
            pending={summary.requests.pending}
            approved={summary.requests.approved}
            rejected={summary.requests.rejected}
            total={summary.requests.total}
          />
          <Link
            href="/director/requests"
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            View all requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recent Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Recent Requests</h2>
            </div>
            <Link
              href="/director/requests"
              className="flex items-center gap-0.5 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No requests yet
              </p>
            ) : (
              recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {req.requestNumber}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                      <span>{req.items?.[0]?.chemical?.name ?? "—"}</span>
                      <span>{fmt(req.createdAt)}</span>
                      {req.requiredDate && <span>{fmt(req.requiredDate)}</span>}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_ICON[req.status]} {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions + Notifications */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/director/approvals"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: "#dc2626" }}
              >
                <CheckCircle className="h-4 w-4" /> Review Pending Requests
              </Link>
              <Link
                href="/director/reports"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 text-orange-500" /> Generate Report
              </Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-semibold text-gray-900">Notifications</h2>
              <Link
                href="/director/notifications"
                className="flex items-center gap-0.5 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {alert.title}
                    </p>
                    {alert.chemical && (
                      <p className="text-xs text-gray-500">
                        {alert.chemical.name}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {fmt(alert.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {recentAlerts.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">
                  No active alerts
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Monthly Usage Bar Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Monthly Usage (kg/L)
            </h2>
            <BarChart2 className="h-4 w-4 text-gray-400" />
          </div>
          <BarChart />
        </div>

        {/* Top Chemicals Usage */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Top Chemicals Usage
              </h2>
            </div>
            <Link
              href="/director/chemical-usage"
              className="flex items-center gap-0.5 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {TOP_CHEMICALS.map((chem, i) => (
              <div
                key={chem.name}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                    {i + 1}
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {chem.name}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {chem.qty}
                </span>
              </div>
            ))}
          </div>
          {/* Batch overview strip */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            {[
              {
                label: "Total Batches",
                value: summary.batches.total,
                color: "text-gray-800",
              },
              {
                label: "Low Stock",
                value: summary.batches.lowStock,
                color: "text-amber-600",
              },
              {
                label: "Expired",
                value: summary.batches.expired,
                color: "text-red-600",
              },
            ].map((s) => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts Row ── */}
      {recentAlerts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Active Alerts</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                {summary.alerts.active}
              </span>
            </div>
            <Link
              href="/director/alerts"
              className="flex items-center gap-0.5 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {alert.title}
                  </p>
                  {alert.chemical && (
                    <p className="text-xs text-gray-500">
                      {alert.chemical.name}
                      {alert.batch &&
                        ` · Stock: ${alert.batch.quantity} / Min: ${alert.batch.minimumStock}`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {alert.type.replace(/_/g, " ")}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {fmt(alert.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
