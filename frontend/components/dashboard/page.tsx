"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  Package,
  ClipboardList,
  Send,
  AlertTriangle,
  Users,
  Plus,
  FileText,
  Clock,
  UserCheck,
  TrendingUp,
  Cpu,
  Wrench,
  ChevronRight,
  Activity,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import Loading from "@/components/ui/Loading";
import { getDashboard } from "@/lib/dashboard";
import { DashboardData } from "@/types/dashboard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ─────────────────────────────────────────────
   Chemical Stock Bar Chart  (matches screenshot)
───────────────────────────────────────────── */
interface StockItem {
  id: string;
  name: string;
  hazardLevel: string;
  category: string | null;
  unitSymbol: string;
  totalStock: number;
  batchCount: number;
  hasLowStock: boolean;
  minimumStock: number;
}

function ChemicalBarChart({ data }: { data: StockItem[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        No stock data available.
      </p>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.totalStock), 1);
  const H = 160; // chart height px
  const barW = 28;
  const gap = 16;
  const items = data.slice(0, 8);
  const totalW = items.length * (barW * 2 + gap + 12);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${H + 48}`}
        className="w-full"
        style={{ minWidth: `${totalW}px` }}
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = 8 + (1 - f) * H;
          return (
            <g key={i}>
              <line
                x1={0}
                x2={totalW}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={0} y={y - 3} fontSize="9" fill="#94a3b8">
                {Math.round(f * maxVal)}
              </text>
            </g>
          );
        })}

        {items.map((item, i) => {
          const x = i * (barW * 2 + gap + 12) + 12;
          /* Total stock bar (blue) */
          const totalH = Math.max(2, (item.totalStock / maxVal) * H);
          const totalY = 8 + H - totalH;
          /* Available stock bar (green) — approx 85% of total for visual */
          const availH = Math.max(2, ((item.totalStock * 0.85) / maxVal) * H);
          const availY = 8 + H - availH;

          /* Short name — wrap at 10 chars */
          const words = item.name.split(" ");
          const line1 = words[0] ?? "";
          const line2 = words.slice(1, 3).join(" ");

          return (
            <g key={item.id}>
              {/* Total Stock bar */}
              <rect
                x={x}
                y={totalY}
                width={barW}
                height={totalH}
                rx={4}
                fill="#3b82f6"
              />
              {/* Available Stock bar */}
              <rect
                x={x + barW + 4}
                y={availY}
                width={barW}
                height={availH}
                rx={4}
                fill={item.hasLowStock ? "#f59e0b" : "#22c55e"}
              />
              {/* Value labels */}
              <text
                x={x + barW / 2}
                y={totalY - 4}
                textAnchor="middle"
                fontSize="8.5"
                fill="#374151"
                fontWeight="600"
              >
                {item.totalStock}
              </text>
              {/* Chemical name */}
              <text
                x={x + barW + 2}
                y={H + 24}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {line1}
              </text>
              {line2 && (
                <text
                  x={x + barW + 2}
                  y={H + 36}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                >
                  {line2}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Equipment Status Donut  (matches screenshot)
───────────────────────────────────────────── */
interface EquipmentStats {
  total: number;
  available: number;
  inUse: number;
  maintenance: number;
  damaged: number;
}

function EquipmentDonut({ stats }: { stats: EquipmentStats }) {
  const { total, available, inUse, maintenance, damaged } = stats;
  const r = 54,
    cx = 70,
    cy = 70,
    circ = 2 * Math.PI * r;
  const pct = (n: number) => (total > 0 ? n / total : 0);

  const segments = [
    {
      value: available,
      pct: pct(available),
      color: "#22c55e",
      label: "Working / Available",
    },
    { value: inUse, pct: pct(inUse), color: "#3b82f6", label: "In Use" },
    {
      value: maintenance,
      pct: pct(maintenance),
      color: "#f59e0b",
      label: "Under Maintenance",
    },
    {
      value: damaged,
      pct: pct(damaged),
      color: "#ef4444",
      label: "Damaged / Out of Service",
    },
  ];

  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="h-36 w-36">
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="22"
          />
          {total > 0 &&
            segments.map((seg, i) => {
              const dashArray = `${seg.pct * circ} ${circ}`;
              const dashOffset = -offset * circ;
              offset += seg.pct;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="22"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400 text-center leading-tight">
            Total
            <br />
            Equipment
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm w-full">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="flex-1 text-xs text-gray-600">{seg.label}</span>
            <span className="font-bold text-gray-900 w-6 text-right">
              {seg.value}
            </span>
            <span className="text-xs text-gray-400 w-8 text-right">
              {(pct(seg.value) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Requests Donut  (existing)
───────────────────────────────────────────── */
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
  const r = 52,
    cx = 64,
    cy = 64,
    circ = 2 * Math.PI * r;
  const pct = (n: number) => (total > 0 ? n / total : 0);
  const pP = pct(pending),
    pA = pct(approved),
    pR = pct(rejected);
  const seg = (p: number, offset: number, color: string) => (
    <circle
      key={color}
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="20"
      strokeDasharray={`${p * circ} ${circ}`}
      strokeDashoffset={-offset * circ}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
        <svg viewBox="0 0 128 128" className="h-32 w-32">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="20"
          />
          {total > 0 && (
            <>
              {seg(pP, 0, "#f59e0b")}
              {seg(pA, pP, "#22c55e")}
              {seg(pR, pP + pA, "#ef4444")}
            </>
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {[
          { label: "Pending", value: pending, pct: pP, color: "bg-amber-400" },
          {
            label: "Approved",
            value: approved,
            pct: pA,
            color: "bg-green-500",
          },
          { label: "Rejected", value: rejected, pct: pR, color: "bg-red-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color}`} />
            <span className="w-20 text-gray-600">{s.label}</span>
            <span className="font-semibold text-gray-900">{s.value}</span>
            <span className="text-gray-400">({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Constants / helpers
───────────────────────────────────────────── */
const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  ISSUED: "bg-blue-100 text-blue-700",
};
const ALERT_BADGE: Record<string, string> = {
  LOW_STOCK: "bg-orange-100 text-orange-700",
  EXPIRING_CHEMICAL: "bg-yellow-100 text-yellow-700",
  EXPIRED_CHEMICAL: "bg-red-100 text-red-700",
  HIGH_HAZARD: "bg-purple-100 text-purple-700",
};
const ALERT_LABEL: Record<string, string> = {
  LOW_STOCK: "LOW STOCK",
  EXPIRING_CHEMICAL: "EXPIRING",
  EXPIRED_CHEMICAL: "EXPIRED",
  HIGH_HAZARD: "HIGH HAZARD",
};
const STOCK_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  LOW_STOCK: "bg-amber-100 text-amber-700",
  DEPLETED: "bg-gray-100 text-gray-500",
  EXPIRED: "bg-red-100 text-red-600",
};
const EQ_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  IN_USE: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  DAMAGED: "bg-red-100 text-red-700",
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

interface PendingReg {
  id: string;
  status: string;
  userType: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}
interface EquipmentItem {
  id: string;
  name: string;
  code: string;
  status: string;
  location?: string | null;
  updatedAt: string;
  category?: { name: string };
  laboratory?: { name: string };
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingRegs, setPendingRegs] = useState<PendingReg[]>([]);
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [eqList, setEqList] = useState<EquipmentItem[]>([]);
  const [eqStats, setEqStats] = useState<EquipmentStats>({
    total: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
    damaged: 0,
  });
  const [eqLoading, setEqLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    /* main dashboard data */
    const load = async () => {
      try {
        const res = await getDashboard();
        if (!res.success) throw new Error(res.message);
        setData(res.data);
      } catch (err) {
        const is401 =
          (err as { response?: { status?: number } })?.response?.status === 401;
        if (is401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    /* pending registrations */
    const loadRegs = async () => {
      try {
        const res = await fetch(`${API}/registrations/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (j.success) setPendingRegs(j.data ?? []);
      } catch {
        /* non-fatal */
      }
    };

    /* chemical stock */
    const loadStock = async () => {
      setStockLoading(true);
      try {
        const res = await fetch(`${API}/dashboard/chemical-stock?limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (j.success) setStockData(j.data?.chemicals ?? []);
      } catch {
        /* non-fatal */
      } finally {
        setStockLoading(false);
      }
    };

    /* equipment */
    const loadEquipment = async () => {
      setEqLoading(true);
      try {
        const res = await fetch(`${API}/equipment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (j.success) {
          const eq: EquipmentItem[] = j.data ?? [];
          setEqList(eq.slice(0, 6));
          setEqStats({
            total: eq.length,
            available: eq.filter((e) => e.status === "AVAILABLE").length,
            inUse: eq.filter((e) => e.status === "IN_USE").length,
            maintenance: eq.filter((e) => e.status === "MAINTENANCE").length,
            damaged: eq.filter((e) => e.status === "DAMAGED").length,
          });
        }
      } catch {
        /* non-fatal */
      } finally {
        setEqLoading(false);
      }
    };

    load();
    loadRegs();
    loadStock();
    loadEquipment();
  }, [router]);

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-700">Dashboard Error</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  if (!data) return null;

  const { summary, recentRequests, recentAlerts } = data;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-300" />
              <p className="text-sm font-medium text-blue-200">
                Administration Dashboard
              </p>
            </div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-blue-200 text-sm">
              {summary.requests.pending > 0 && (
                <span className="mr-4">
                  <span className="font-bold text-amber-300">
                    {summary.requests.pending}
                  </span>{" "}
                  pending request{summary.requests.pending !== 1 ? "s" : ""}
                </span>
              )}
              {pendingRegs.length > 0 && (
                <span>
                  <span className="font-bold text-yellow-300">
                    {pendingRegs.length}
                  </span>{" "}
                  registration{pendingRegs.length !== 1 ? "s" : ""} awaiting
                  approval
                </span>
              )}
              {summary.requests.pending === 0 &&
                pendingRegs.length === 0 &&
                "Everything is up to date ✓"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.requests.pending > 0 && (
              <Link
                href="/admin/dashboard/requests?status=PENDING"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400 shadow-lg"
              >
                <Clock className="h-4 w-4" /> {summary.requests.pending} Pending
              </Link>
            )}
            {pendingRegs.length > 0 && (
              <Link
                href="/admin/dashboard/registrations"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30 border border-white/20"
              >
                <UserCheck className="h-4 w-4" /> {pendingRegs.length}{" "}
                Registrations
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {[
          {
            label: "Chemicals",
            value: summary.chemicals.total,
            sub: `${summary.chemicals.active} active`,
            icon: FlaskConical,
            href: "/admin/dashboard/chemicals",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Batches",
            value: summary.batches.total,
            sub: `${summary.batches.lowStock} low stock`,
            icon: Package,
            href: "/admin/dashboard/batches",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Requests",
            value: summary.requests.total,
            sub: `${summary.requests.pending} pending`,
            icon: ClipboardList,
            href: "/admin/dashboard/requests",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Issuances",
            value: summary.issuances.total,
            sub: "Total issued",
            icon: Send,
            href: "/admin/dashboard/issuances",
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Equipment",
            value: eqStats.total,
            sub: `${eqStats.available} available`,
            icon: Cpu,
            href: "/admin/dashboard/equipment/equipment",
            color: "text-teal-600",
            bg: "bg-teal-50",
          },
          {
            label: "Maintenance",
            value: eqStats.maintenance,
            sub: "Scheduled",
            icon: Wrench,
            href: "/admin/dashboard/equipment/maintenance",
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Alerts",
            value: summary.alerts.active,
            sub: "Active alerts",
            icon: AlertTriangle,
            href: "/admin/dashboard/alerts",
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Users",
            value: summary.users.total,
            sub: `${pendingRegs.length} pending reg.`,
            icon: Users,
            href: "/admin/dashboard/users",
            color: "text-cyan-600",
            bg: "bg-cyan-50",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg} group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {s.label}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-gray-400">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Middle Row: Requests Donut + Recent Requests + Alerts/Regs ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Requests Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Chemical request status
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <DonutChart
            pending={summary.requests.pending}
            approved={summary.requests.approved}
            rejected={summary.requests.rejected}
            total={summary.requests.total}
          />
          {summary.requests.pending > 0 && (
            <Link
              href="/admin/dashboard/requests?status=PENDING"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              Review {summary.requests.pending} pending{" "}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Requests</h3>
            <Link
              href="/admin/dashboard/requests"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentRequests.slice(0, 5).map((req) => (
              <Link
                key={req.id}
                href={`/admin/dashboard/requests/${req.id}`}
                className="flex items-start justify-between gap-2 rounded-xl p-2.5 transition hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {req.requestNumber}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {req.items?.[0]?.chemical?.name ?? req.purpose}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {fmt(req.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {req.status}
                </span>
              </Link>
            ))}
            {recentRequests.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                No recent requests
              </p>
            )}
          </div>
        </div>

        {pendingRegs.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">
                  Pending Registrations
                </h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {pendingRegs.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingRegs.slice(0, 5).map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {reg.user.firstName} {reg.user.lastName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {reg.user.email}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {reg.userType}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/admin/dashboard/registrations"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              Review all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Alerts</h3>
              <Link
                href="/admin/dashboard/alerts"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentAlerts.slice(0, 5).map((alert) => (
                <Link
                  key={alert.id}
                  href={`/admin/dashboard/alerts`}
                  className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-gray-50"
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      alert.type === "LOW_STOCK"
                        ? "text-orange-500"
                        : alert.type === "EXPIRING_CHEMICAL"
                          ? "text-yellow-500"
                          : alert.type === "EXPIRED_CHEMICAL"
                            ? "text-red-500"
                            : "text-purple-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmt(alert.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ALERT_BADGE[alert.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {ALERT_LABEL[alert.type] ?? alert.type}
                  </span>
                </Link>
              ))}
              {recentAlerts.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No active alerts
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          Chemical Stock Overview + Equipment Status
          (matches screenshot exactly)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Chemical Stock Overview bar chart ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                Chemical Stock Overview
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />{" "}
                Total Stock
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />{" "}
                Available Stock
              </span>
            </div>
          </div>
          {stockLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <ChemicalBarChart data={stockData} />
          )}
        </div>

        {/* ── Equipment Status donut ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Equipment Status</h3>
          </div>
          {eqLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <EquipmentDonut stats={eqStats} />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          Recent Chemical Stock + Recent Equipment tables
          (matches screenshot exactly)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Recent Chemical Stock table ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                Recent Chemical Stock
              </h3>
            </div>
            <Link
              href="/admin/dashboard/chemicals"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          {stockLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : stockData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No chemical stock data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      "Chemical Name",
                      "Available Qty",
                      "Unit",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stockData.slice(0, 6).map((chem) => {
                    const statusKey =
                      chem.totalStock === 0
                        ? "DEPLETED"
                        : chem.hasLowStock
                          ? "LOW_STOCK"
                          : "AVAILABLE";
                    const statusLabel =
                      chem.totalStock === 0
                        ? "Out of Stock"
                        : chem.hasLowStock
                          ? "Low Stock"
                          : "In Stock";
                    return (
                      <tr key={chem.id} className="transition hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {chem.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-bold text-gray-900">
                            {chem.totalStock.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {chem.unitSymbol}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STOCK_STATUS_BADGE[statusKey]}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/admin/dashboard/chemicals/${chem.id}`}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Equipment table ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Recent Equipment</h3>
            </div>
            <Link
              href="/admin/dashboard/equipment/equipment"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          {eqLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : eqList.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No equipment data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Equipment Name", "Code", "Status", "Location"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-500"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {eqList.map((eq) => (
                    <tr key={eq.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">
                        {eq.name}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-gray-500">
                        {eq.code ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EQ_STATUS_BADGE[eq.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {eq.status === "IN_USE"
                            ? "In Use"
                            : eq.status === "MAINTENANCE"
                              ? "Under Maintenance"
                              : eq.status === "DAMAGED"
                                ? "Damaged"
                                : "Available"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {eq.laboratory?.name ?? eq.location ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Common tasks</p>
          </div>
          <Plus className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Add Chemical",
              href: "/admin/dashboard/chemicals/create",
              icon: FlaskConical,
              color:
                "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
            },
            {
              label: "Create Batch",
              href: "/admin/dashboard/batches/create",
              icon: Package,
              color:
                "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
            },
            {
              label: "Add Equipment",
              href: "/admin/dashboard/equipment/equipment/create",
              icon: Cpu,
              color:
                "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
            },
            {
              label: "New Issuance",
              href: "/admin/dashboard/issuances/create",
              icon: Send,
              color:
                "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
            },
            {
              label: "Maintenance",
              href: "/admin/dashboard/equipment/maintenance",
              icon: Wrench,
              color:
                "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
            },
            {
              label: "Reports",
              href: "/admin/dashboard/reports",
              icon: FileText,
              color:
                "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
            },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-xs font-semibold transition ${a.color}`}
              >
                <Icon className="h-5 w-5" />
                {a.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
