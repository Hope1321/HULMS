"use client";

import { useEffect, useState } from "react";
import {
  BarChart2, FlaskConical, Package, ClipboardList,
  Send, AlertTriangle, FileText, Download, RefreshCw,
  Cpu, Wrench,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* ── types ── */
interface Chemical  { id: string; name: string; casNumber: string; formula: string; hazardLevel: string; status: string; category?: { name: string } | null; }
interface Unit      { id: string; name: string; symbol: string; }
interface Batch     { id: string; batchNumber: string; quantity: number; minimumStock: number; status: string; expiryDate: string | null; purchaseDate: string | null; chemical: Chemical; unit: Unit; storageLocation: { name: string }; }
interface User      { id: string; firstName: string; lastName: string; email: string; }
interface ReqItem   { chemical: { name: string }; requestedQty: number; approvedQty: number | null; unit: { symbol: string }; }
interface Request   { id: string; requestNumber: string; purpose: string; status: string; createdAt: string; requiredDate: string | null; requestedBy: User; items: ReqItem[]; }
interface Issuance  { id: string; issuanceNumber: string; quantity: number; status: string; issuedAt: string | null; batch: { chemical: Chemical; unit: Unit; batchNumber: string }; request: { requestNumber: string; purpose: string }; issuedTo: User; issuedBy: User; }
interface Alert     { id: string; title: string; type: string; status: string; createdAt: string; resolvedAt: string | null; chemical: Chemical | null; batch: { batchNumber: string; quantity: number; minimumStock: number } | null; }
interface Equipment { id: string; name: string; code: string; model: string | null; manufacturer: string | null; serialNumber: string | null; status: string; location: string | null; category: { name: string; code: string }; laboratory: { name: string } | null; }
interface Maintenance { id: string; maintenanceNumber: string; type: string; status: string; scheduledDate: string; completedDate: string | null; description: string; equipment: { name: string; code: string }; performedBy: string | null; cost: number | null; }

type ReportKey = "chemicals" | "batches" | "requests" | "issuances" | "alerts" | "equipment" | "maintenance";

const REPORTS: { key: ReportKey; label: string; desc: string; icon: React.ReactNode; color: string; endpoint: string }[] = [
  { key: "chemicals",  label: "Chemicals Inventory",    desc: "All chemicals with hazard levels, status, and categories",   icon: <FlaskConical  className="h-5 w-5" />, color: "bg-blue-600",   endpoint: "/chemicals"          },
  { key: "batches",    label: "Batch Stock Report",      desc: "All batches with quantities, expiry dates, and locations",    icon: <Package       className="h-5 w-5" />, color: "bg-indigo-600", endpoint: "/chemical-batches"   },
  { key: "requests",   label: "Chemical Requests",       desc: "All requests with status, items, and requester details",      icon: <ClipboardList className="h-5 w-5" />, color: "bg-amber-600",  endpoint: "/chemical-requests"  },
  { key: "issuances",  label: "Issuances Report",        desc: "All issuances with quantities, batch, and recipient info",    icon: <Send          className="h-5 w-5" />, color: "bg-purple-600", endpoint: "/chemical-issuances" },
  { key: "equipment",  label: "Equipment Inventory",    desc: "All equipment with status, category, and location",         icon: <Cpu           className="h-5 w-5" />, color: "bg-teal-600",    endpoint: "/equipment"           },
  { key: "maintenance", label: "Maintenance Records",   desc: "All maintenance records with equipment, type, and status",      icon: <Wrench        className="h-5 w-5" />, color: "bg-orange-600",  endpoint: "/equipment/maintenance" },
  { key: "alerts",     label: "Alerts Report",           desc: "All alerts with type, status, chemical, and batch details",   icon: <AlertTriangle className="h-5 w-5" />, color: "bg-red-600",    endpoint: "/alerts"             },
];

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

/* ── CSV helpers ── */
const escape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCSV = (rows: string[][]): string =>
  rows.map(r => r.map(escape).join(",")).join("\n");

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ── per-report CSV builders ── */
function buildChemicalsCSV(data: Chemical[]): string {
  const header = ["Name", "CAS Number", "Formula", "Hazard Level", "Status", "Category"];
  const rows   = data.map(c => [c.name, c.casNumber, c.formula, c.hazardLevel, c.status, c.category?.name ?? ""]);
  return toCSV([header, ...rows]);
}

function buildBatchesCSV(data: Batch[]): string {
  const header = ["Batch Number", "Chemical", "Quantity", "Unit", "Min Stock", "Status", "Location", "Purchase Date", "Expiry Date"];
  const rows   = data.map(b => [b.batchNumber, b.chemical.name, String(b.quantity), b.unit.symbol, String(b.minimumStock), b.status, b.storageLocation.name, fmt(b.purchaseDate), fmt(b.expiryDate)]);
  return toCSV([header, ...rows]);
}

function buildRequestsCSV(data: Request[]): string {
  const header = ["Request #", "Purpose", "Requested By", "Email", "Chemicals", "Status", "Required Date", "Created At"];
  const rows   = data.map(r => [r.requestNumber, r.purpose, `${r.requestedBy.firstName} ${r.requestedBy.lastName}`, r.requestedBy.email, r.items.map(i => `${i.chemical.name} (${i.requestedQty} ${i.unit.symbol})`).join("; "), r.status, fmt(r.requiredDate), fmt(r.createdAt)]);
  return toCSV([header, ...rows]);
}

function buildIssuancesCSV(data: Issuance[]): string {
  const header = ["Issuance #", "Chemical", "Batch", "Quantity", "Unit", "Status", "Issued To", "Issued By", "Request #", "Issued At"];
  const rows   = data.map(i => [i.issuanceNumber, i.batch.chemical.name, i.batch.batchNumber, String(i.quantity), i.batch.unit.symbol, i.status, `${i.issuedTo.firstName} ${i.issuedTo.lastName}`, `${i.issuedBy.firstName} ${i.issuedBy.lastName}`, i.request.requestNumber, fmt(i.issuedAt)]);
  return toCSV([header, ...rows]);
}

function buildAlertsCSV(data: Alert[]): string {
  const header = ["Title", "Type", "Status", "Chemical", "Batch", "Current Stock", "Min Stock", "Created At", "Resolved At"];
  const rows   = data.map(a => [a.title, a.type, a.status, a.chemical?.name ?? "", a.batch?.batchNumber ?? "", a.batch ? String(a.batch.quantity) : "", a.batch ? String(a.batch.minimumStock) : "", fmt(a.createdAt), fmt(a.resolvedAt)]);
  return toCSV([header, ...rows]);
}

function buildEquipmentCSV(data: Equipment[]): string {
  const header = ["Name", "Code", "Model", "Manufacturer", "Serial Number", "Status", "Category", "Laboratory", "Location"];
  const rows   = data.map(e => [e.name, e.code, e.model ?? "", e.manufacturer ?? "", e.serialNumber ?? "", e.status, e.category.name, e.laboratory?.name ?? "", e.location ?? ""]);
  return toCSV([header, ...rows]);
}

function buildMaintenanceCSV(data: Maintenance[]): string {
  const header = ["Maintenance #", "Equipment", "Type", "Status", "Scheduled Date", "Completed Date", "Performed By", "Cost", "Description"];
  const rows   = data.map(m => [m.maintenanceNumber, m.equipment.name, m.type, m.status, fmt(m.scheduledDate), fmt(m.completedDate), m.performedBy ?? "", m.cost ? String(m.cost) : "", m.description]);
  return toCSV([header, ...rows]);
}

/* ── preview table builders ── */
function ChemicalsPreview({ data }: { data: Chemical[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Name","CAS Number","Formula","Hazard","Status","Category"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(c => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
            <td className="px-4 py-2.5 text-gray-600">{c.casNumber || "—"}</td>
            <td className="px-4 py-2.5 font-mono text-gray-600">{c.formula || "—"}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.hazardLevel === "EXTREME" ? "bg-red-100 text-red-700" : c.hazardLevel === "HIGH" ? "bg-orange-100 text-orange-700" : c.hazardLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{c.hazardLevel}</span></td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.status}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{c.category?.name ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BatchesPreview({ data }: { data: Batch[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Batch #","Chemical","Quantity","Min Stock","Status","Location","Expiry"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(b => (
          <tr key={b.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-semibold text-gray-900">{b.batchNumber}</td>
            <td className="px-4 py-2.5 text-gray-700">{b.chemical.name}</td>
            <td className="px-4 py-2.5 text-gray-700">{b.quantity} {b.unit.symbol}</td>
            <td className="px-4 py-2.5 text-gray-600">{b.minimumStock} {b.unit.symbol}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "AVAILABLE" ? "bg-green-100 text-green-700" : b.status === "LOW_STOCK" ? "bg-yellow-100 text-yellow-700" : b.status === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{b.status}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{b.storageLocation.name}</td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(b.expiryDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestsPreview({ data }: { data: Request[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Request #","Purpose","Requested By","Items","Status","Created"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(r => (
          <tr key={r.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-semibold text-gray-900">{r.requestNumber}</td>
            <td className="max-w-[160px] px-4 py-2.5"><p className="truncate text-gray-700">{r.purpose}</p></td>
            <td className="px-4 py-2.5 text-gray-700">{r.requestedBy.firstName} {r.requestedBy.lastName}</td>
            <td className="px-4 py-2.5 text-gray-600">{r.items.length} item{r.items.length !== 1 ? "s" : ""}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "APPROVED" ? "bg-green-100 text-green-700" : r.status === "PENDING" ? "bg-amber-100 text-amber-700" : r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(r.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IssuancesPreview({ data }: { data: Issuance[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Issuance #","Chemical","Quantity","Issued To","Request #","Status","Date"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(i => (
          <tr key={i.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-semibold text-gray-900">{i.issuanceNumber}</td>
            <td className="px-4 py-2.5 text-gray-700">{i.batch.chemical.name}</td>
            <td className="px-4 py-2.5 text-gray-700">{i.quantity} {i.batch.unit.symbol}</td>
            <td className="px-4 py-2.5 text-gray-700">{i.issuedTo.firstName} {i.issuedTo.lastName}</td>
            <td className="px-4 py-2.5 text-gray-600">{i.request.requestNumber}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${i.status === "ISSUED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{i.status}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(i.issuedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlertsPreview({ data }: { data: Alert[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Title","Type","Chemical","Batch","Status","Created","Resolved"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(a => (
          <tr key={a.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-900">{a.title}</td>
            <td className="px-4 py-2.5"><span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{a.type.replace(/_/g, " ")}</span></td>
            <td className="px-4 py-2.5 text-gray-700">{a.chemical?.name ?? "—"}</td>
            <td className="px-4 py-2.5 text-gray-600">{a.batch?.batchNumber ?? "—"}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "ACTIVE" ? "bg-red-100 text-red-700" : a.status === "ACKNOWLEDGED" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{a.status}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(a.createdAt)}</td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(a.resolvedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EquipmentPreview({ data }: { data: Equipment[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Name","Code","Model","Manufacturer","Status","Category","Location"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(e => (
          <tr key={e.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-medium text-gray-900">{e.name}</td>
            <td className="px-4 py-2.5 text-gray-600">{e.code}</td>
            <td className="px-4 py-2.5 text-gray-600">{e.model || "—"}</td>
            <td className="px-4 py-2.5 text-gray-600">{e.manufacturer || "—"}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === "AVAILABLE" ? "bg-green-100 text-green-700" : e.status === "IN_USE" ? "bg-blue-100 text-blue-700" : e.status === "UNDER_MAINTENANCE" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{e.status.replace(/_/g, " ")}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{e.category.name}</td>
            <td className="px-4 py-2.5 text-gray-600">{e.location || e.laboratory?.name || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MaintenancePreview({ data }: { data: Maintenance[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50"><tr>
        {["Maintenance #","Equipment","Type","Status","Scheduled","Completed","Performed By"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-gray-100">
        {data.slice(0, 10).map(m => (
          <tr key={m.id} className="hover:bg-gray-50">
            <td className="px-4 py-2.5 font-semibold text-gray-900">{m.maintenanceNumber}</td>
            <td className="px-4 py-2.5 text-gray-700">{m.equipment.name}</td>
            <td className="px-4 py-2.5 text-gray-600">{m.type}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "COMPLETED" ? "bg-green-100 text-green-700" : m.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{m.status.replace(/_/g, " ")}</span></td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(m.scheduledDate)}</td>
            <td className="px-4 py-2.5 text-gray-600">{fmt(m.completedDate)}</td>
            <td className="px-4 py-2.5 text-gray-600">{m.performedBy || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────── */

export default function ReportsPage() {
  const [active,    setActive]    = useState<ReportKey>("chemicals");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data,      setData]      = useState<Record<ReportKey, any[]>>({
    chemicals: [], batches: [], requests: [], issuances: [], alerts: [], equipment: [], maintenance: [],
  });
  const [loading,   setLoading]   = useState<ReportKey | null>(null);
  const [loaded,    setLoaded]    = useState<Set<ReportKey>>(new Set());
  const [error,     setError]     = useState("");

  const fetchReport = async (key: ReportKey, force = false) => {
    if (loaded.has(key) && !force) return;
    setError(""); setLoading(key);
    try {
      const token = localStorage.getItem("token");
      const cfg   = REPORTS.find(r => r.key === key)!;
      const res   = await fetch(`${API}${cfg.endpoint}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to load data");
      setData(prev => ({ ...prev, [key]: result.data || [] }));
      setLoaded(prev => new Set([...prev, key]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report data");
    } finally { setLoading(null); }
  };

  /* load active report on tab switch */
  useEffect(() => { fetchReport(active); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = () => {
    const rows = data[active];
    if (!rows.length) return;
    let csv = "";
    const dateStr = new Date().toISOString().split("T")[0];
    switch (active) {
      case "chemicals":  csv = buildChemicalsCSV(rows as Chemical[]);    break;
      case "batches":    csv = buildBatchesCSV(rows as Batch[]);          break;
      case "requests":   csv = buildRequestsCSV(rows as Request[]);       break;
      case "issuances":  csv = buildIssuancesCSV(rows as Issuance[]);     break;
      case "equipment":  csv = buildEquipmentCSV(rows as Equipment[]);   break;
      case "maintenance": csv = buildMaintenanceCSV(rows as Maintenance[]); break;
      case "alerts":     csv = buildAlertsCSV(rows as Alert[]);           break;
    }
    downloadCSV(csv, `hulms-${active}-${dateStr}.csv`);
  };

  const activeCfg  = REPORTS.find(r => r.key === active)!;
  const activeData = data[active];
  const isLoading  = loading === active;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
          <BarChart2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">View and export laboratory management data</p>
        </div>
      </div>

      {/* ── Report Type Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {REPORTS.map(r => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition
              ${active === r.key
                ? "border-blue-300 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white hover:bg-gray-50"}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${r.color}`}>
              {r.icon}
            </div>
            <div>
              <p className={`text-sm font-semibold ${active === r.key ? "text-blue-700" : "text-gray-900"}`}>
                {r.label}
              </p>
              {loaded.has(r.key) && (
                <p className="mt-0.5 text-xs text-gray-400">{data[r.key].length} records</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ── Active Report Panel ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Panel Header */}
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${activeCfg.color}`}>
              {activeCfg.icon}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{activeCfg.label}</h2>
              <p className="text-xs text-gray-500">{activeCfg.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {activeData.length} record{activeData.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => fetchReport(active, true)} disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button onClick={handleDownload} disabled={!activeData.length || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-gray-500">Loading {activeCfg.label.toLowerCase()}…</p>
          </div>
        ) : activeData.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-500">No data available</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {active === "chemicals"  && <ChemicalsPreview  data={activeData as any}  />}
              {active === "batches"    && <BatchesPreview    data={activeData as any}      />}
              {active === "requests"   && <RequestsPreview   data={activeData as any}   />}
              {active === "issuances"  && <IssuancesPreview  data={activeData as any}  />}
              {active === "equipment"  && <EquipmentPreview  data={activeData as any} />}
              {active === "maintenance" && <MaintenancePreview data={activeData as any} />}
              {active === "alerts"     && <AlertsPreview     data={activeData as any}     />}
            </div>
            {activeData.length > 10 && (
              <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
                Showing first <span className="font-semibold text-gray-700">10</span> of{" "}
                <span className="font-semibold text-gray-700">{activeData.length}</span> records.
                Export CSV to see all.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
