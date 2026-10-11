"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical, Package, AlertTriangle, ClipboardList,
  CheckCircle, Send, ChevronRight, ArrowRight,
  XCircle, Clock, TrendingUp, AlertCircle, Plus,
  RefreshCw, Layers,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ── Types ── */
interface Chemical  { id: string; name: string; hazardLevel: string; status: string; }
interface Unit      { id: string; name: string; symbol: string; }
interface Batch {
  id: string; batchNumber: string; quantity: number; minimumStock: number;
  status: string; expiryDate: string | null;
  chemical: Chemical; unit: Unit;
}
interface ReqItem   { chemical: { name: string }; unit: { symbol: string }; approvedQty?: number | null; }
interface Request {
  id: string; requestNumber: string; status: string;
  requiredDate: string | null; createdAt: string;
  requestedBy: { firstName: string; lastName: string };
  items: ReqItem[];
}
interface Issuance {
  id: string; issuanceNumber: string; quantity: number;
  issuedAt: string | null; createdAt: string;
  batch: { chemical: { name: string }; unit: { symbol: string } };
  issuedTo: { firstName: string; lastName: string };
}
interface Alert {
  id: string; title: string; type: string; status: string; createdAt: string;
  chemical: { name: string; hazardLevel: string } | null;
  batch: { quantity: number; minimumStock: number; expiryDate: string | null } | null;
}

interface DashboardData {
  summary: {
    chemicals: { total: number; active: number };
    batches: { total: number; lowStock: number; expired: number };
    requests: { total: number; pending: number; approved: number; rejected: number };
    issuances: { total: number };
    alerts: { active: number };
  };
  recentRequests: Request[];
  recentIssuances: Issuance[];
  recentAlerts: Alert[];
}

/* ── Helpers ── */
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtRel = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
  if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`; return `${dy}d ago`;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-700 border border-amber-200",
  APPROVED:  "bg-green-100 text-green-700 border border-green-200",
  REJECTED:  "bg-red-100 text-red-700 border border-red-200",
  ISSUED:    "bg-blue-100 text-blue-700 border border-blue-200",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const ALERT_BADGE: Record<string, string> = {
  LOW_STOCK:         "bg-orange-100 text-orange-700",
  EXPIRING_CHEMICAL: "bg-yellow-100 text-yellow-700",
  EXPIRED_CHEMICAL:  "bg-red-100 text-red-700",
  HIGH_HAZARD:       "bg-purple-100 text-purple-700",
};

const ALERT_LABEL: Record<string, string> = {
  LOW_STOCK: "LOW STOCK", EXPIRING_CHEMICAL: "EXPIRING",
  EXPIRED_CHEMICAL: "EXPIRED", HIGH_HAZARD: "HIGH HAZARD",
};

/* ── Inventory Donut ── */
function InventoryDonut({ available, lowStock, outOfStock, total }: {
  available: number; lowStock: number; outOfStock: number; total: number;
}) {
  const r = 44, cx = 56, cy = 56, c = 2 * Math.PI * r;
  const p = (n: number) => total > 0 ? n / total : 0;
  const pA = p(available), pL = p(lowStock), pO = p(outOfStock);
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
          {total > 0 && <>
            {seg(pA, 0, "#3b82f6")}
            {seg(pL, pA, "#eab308")}
            {seg(pO, pA + pL, "#22c55e")}
          </>}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-400">Total</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Available",   v: available,  pct: pA, dot: "bg-blue-500"   },
          { label: "Low Stock",   v: lowStock,   pct: pL, dot: "bg-yellow-400" },
          { label: "Out of Stock",v: outOfStock, pct: pO, dot: "bg-green-500"  },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
            <span className="w-24 text-sm text-gray-500">{s.label}</span>
            <span className="text-sm font-bold text-gray-900">{s.v}</span>
            <span className="text-xs text-gray-400">({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LabTechDashboardPage() {
  const [data,     setData]     = useState<DashboardData | null>(null);
  const [batches,  setBatches]  = useState<Batch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

    // Get user name
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.userId) {
        fetch(`${API}/users/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(res => { if (res.success && res.data) setUserName(res.data.firstName); })
          .catch(() => {});
      }
    } catch { /* ignore */ }

    const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    // Load dashboard data + batches in parallel
    Promise.all([
      fetch(`${API}/dashboard`, { headers: h }).then(r => r.json()),
      fetch(`${API}/chemical-batches`, { headers: h }).then(r => r.json()),
    ])
      .then(([dashRes, batchRes]) => {
        if (!dashRes.success) throw new Error(dashRes.message || "Failed to load dashboard");
        setData(dashRes.data);
        if (batchRes.success) setBatches(batchRes.data ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-orange-600" />
    </div>
  );
  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-600" />
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    </div>
  );
  if (!data) return null;

  const { summary, recentRequests, recentIssuances, recentAlerts } = data;

  // Compute inventory stats from batches
  const availableCount  = batches.filter(b => b.status === "AVAILABLE").length;
  const lowStockCount   = batches.filter(b => b.status === "LOW_STOCK").length;
  const depletedCount   = batches.filter(b => b.status === "DEPLETED" || b.status === "EXPIRED").length;
  const totalBatchCount = batches.length;

  // Today's issuances (issued today)
  const today = new Date().toDateString();
  const todayIssuances = recentIssuances.filter(i => {
    const d = i.issuedAt ?? i.createdAt;
    return new Date(d).toDateString() === today;
  }).length;

  // Total available stock in grams
  const totalStock = batches
    .filter(b => b.status === "AVAILABLE" || b.status === "LOW_STOCK")
    .reduce((s, b) => s + b.quantity, 0);

  // Pending & approved requests from recent list
  const pendingReqs  = recentRequests.filter(r => r.status === "PENDING");
  const approvedReqs = recentRequests.filter(r => r.status === "APPROVED");

  return (
    <div className="space-y-6">

      {/* ── Welcome ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Welcome back, {userName || "Lab Technician"} 👋
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Total Chemicals", sub: "Total Chemicals",
            value: summary.chemicals.total,
            icon: FlaskConical, bg: "#fff7ed", color: "#c2410c",
            href: "/lab-technician/inventory",
          },
          {
            label: "Available Stock", sub: "Total Available",
            value: `${totalStock.toLocaleString()} g`,
            icon: Package, bg: "#f0fdf4", color: "#15803d",
            href: "/lab-technician/inventory",
          },
          {
            label: "Low Stock", sub: "Low Stock Items",
            value: summary.batches.lowStock,
            icon: AlertTriangle, bg: "#fef3c7", color: "#d97706",
            href: "/lab-technician/batches",
          },
          {
            label: "Pending Requests", sub: "Pending Requests",
            value: summary.requests.pending,
            icon: ClipboardList, bg: "#fef2f2", color: "#dc2626",
            href: "/lab-technician/requests",
          },
          {
            label: "Approved Requests", sub: "Approved Requests",
            value: summary.requests.approved,
            icon: CheckCircle, bg: "#f0fdf4", color: "#16a34a",
            href: "/lab-technician/requests?status=APPROVED",
          },
          {
            label: "Today's Issuances", sub: "Today's Issuances",
            value: todayIssuances,
            icon: Send, bg: "#eff6ff", color: "#2563eb",
            href: "/lab-technician/issuances",
          },
        ].map(({ label, sub, value, icon: Icon, bg, color, href }) => (
          <Link key={label} href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-gray-900">{value}</p>
                <p className="truncate text-[11px] text-gray-500">{label}</p>
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-gray-400">{sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Inventory Overview donut */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Inventory Overview</h2>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <InventoryDonut
            available={availableCount}
            lowStock={lowStockCount}
            outOfStock={depletedCount}
            total={totalBatchCount}
          />
          <Link href="/lab-technician/inventory"
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
            View full inventory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Pending Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Pending Requests</h2>
              {summary.requests.pending > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {summary.requests.pending}
                </span>
              )}
            </div>
            <Link href="/lab-technician/requests?status=PENDING"
              className="flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingReqs.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <CheckCircle className="h-8 w-8 text-green-300" />
                <p className="mt-2 text-sm text-gray-400">No pending requests</p>
              </div>
            ) : (
              pendingReqs.map(req => (
                <Link key={req.id} href={`/lab-technician/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {req.items[0]?.chemical?.name ?? "—"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{fmt(req.createdAt)}</span>
                      {req.requiredDate && <><span>·</span><span>{fmt(req.requiredDate)}</span></>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE.PENDING}`}>
                    PENDING
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="font-semibold text-gray-900">Alerts</h2>
              {summary.alerts.active > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {summary.alerts.active}
                </span>
              )}
            </div>
            <Link href="/lab-technician/alerts"
              className="flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <CheckCircle className="h-8 w-8 text-green-300" />
                <p className="mt-2 text-sm text-gray-400">No active alerts</p>
              </div>
            ) : (
              recentAlerts.slice(0, 4).map(alert => (
                <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    {alert.chemical && <p className="text-xs text-gray-500">{alert.chemical.name}</p>}
                    <p className="mt-0.5 text-xs text-gray-400">{fmt(alert.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ALERT_BADGE[alert.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {ALERT_LABEL[alert.type] ?? alert.type}
                  </span>
                </div>
              ))
            )}
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
            <Link href="/lab-technician/requests?status=APPROVED"
              className="flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {approvedReqs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No approved requests</p>
            ) : (
              approvedReqs.map(req => {
                const item = req.items?.[0];
                return (
                  <Link key={req.id} href={`/lab-technician/requests/${req.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{req.requestNumber}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{item?.chemical?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">Approved: {fmt(req.createdAt)}</p>
                    </div>
                    {item?.approvedQty != null && (
                      <span className="ml-3 shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                        Qty: {item.approvedQty} {item.unit?.symbol}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Issuances */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Recent Issuances</h2>
            </div>
            <Link href="/lab-technician/issuances"
              className="flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIssuances.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-8 text-center">
                <Send className="h-8 w-8 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">No issuances yet</p>
              </div>
            ) : (
              recentIssuances.slice(0, 4).map(iss => (
                <div key={iss.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{iss.issuanceNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {iss.batch.chemical.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      Issued: {fmt(iss.issuedAt ?? iss.createdAt)}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    Qty: {iss.quantity} {iss.batch.unit.symbol}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/lab-technician/issuances/create"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "#2563eb" }}>
              <Send className="h-4 w-4" /> Issue Chemical
            </Link>
            <Link href="/lab-technician/batches/create"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "#dc2626" }}>
              <Plus className="h-4 w-4" /> Add New Batch
            </Link>
            <Link href="/lab-technician/inventory"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "#16a34a" }}>
              <RefreshCw className="h-4 w-4" /> Update Stock
            </Link>
            <Link href="/lab-technician/requests"
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
              <ClipboardList className="h-4 w-4 text-gray-500" /> View All Requests
            </Link>
          </div>

          {/* Batch summary strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
            {[
              { label: "Total",     value: summary.batches.total,    color: "text-gray-800"  },
              { label: "Low Stock", value: summary.batches.lowStock, color: "text-amber-600" },
              { label: "Expired",   value: summary.batches.expired,  color: "text-red-600"   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Low Stock Alert banner ── */}
      {summary.batches.lowStock > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {summary.batches.lowStock} batch{summary.batches.lowStock !== 1 ? "es are" : " is"} running low on stock
            </p>
            <p className="text-sm text-amber-600">Restock soon to avoid interruptions to laboratory operations.</p>
          </div>
          <Link href="/lab-technician/batches?status=LOW_STOCK"
            className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
            View Batches
          </Link>
        </div>
      )}
    </div>
  );
}
