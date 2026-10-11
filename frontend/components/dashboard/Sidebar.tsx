"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FlaskConical, Package, Layers,
  ClipboardList, Send, AlertTriangle, Bell,
  FileText, Users, FlaskRound, BarChart2,
  Settings, Shield, X, Building2, UserCheck,
  ChevronDown, ChevronRight,
  BookOpen, Beaker, Boxes, BookMarked,
  Cpu, Wrench,
} from "lucide-react";

interface SidebarProps { open: boolean; onClose: () => void; }

/* ── Menu structure ──────────────────────────────────────────────────────── */
type MenuItem =
  | { kind: "link";  name: string; path: string; icon: React.ElementType }
  | { kind: "group"; name: string; icon: React.ElementType; children: { name: string; path: string; icon: React.ElementType }[] };

const menu: MenuItem[] = [
  {
    kind: "link",
    name: "Dashboard",
    path: "",
    icon: LayoutDashboard,
  },
  {
    kind: "group",
    name: "Chemical Management",
    icon: Beaker,
    children: [
      { name: "Chemicals",   path: "/chemicals",            icon: FlaskConical },
      { name: "Batches",     path: "/batches",              icon: Package      },
      { name: "Categories",  path: "/chemical-categories",  icon: BookMarked   },
    ],
  },
  {
    kind: "group",
    name: "Equipment Management",
    icon: Cpu,
    children: [
      { name: "Equipment",      path: "/equipment/equipment",     icon: Cpu     },
      { name: "Categories",     path: "/equipment/categories",    icon: BookMarked },
      { name: "Requests",       path: "/equipment/requests",      icon: ClipboardList },
      { name: "Maintenance",   path: "/equipment/maintenance",  icon: Wrench },
    ],
  },
  {
    kind: "group",
    name: "Requests & Issuances",
    icon: ClipboardList,
    children: [
      { name: "Requests",   path: "/requests",   icon: ClipboardList },
      { name: "Issuances",  path: "/issuances",  icon: Send          },
    ],
  },
  {
    kind: "group",
    name: "Inventory",
    icon: Boxes,
    children: [
      { name: "Laboratories", path: "/laboratories", icon: FlaskRound },
      { name: "Colleges",     path: "/colleges",     icon: Building2  },
    ],
  },
  {
    kind: "group",
    name: "People",
    icon: Users,
    children: [
      { name: "Users",         path: "/users",         icon: Users     },
      { name: "Registrations", path: "/registrations", icon: UserCheck },
    ],
  },
  {
    kind: "group",
    name: "Monitoring",
    icon: AlertTriangle,
    children: [
      { name: "Alerts",        path: "/alerts",        icon: AlertTriangle },
      { name: "Notifications", path: "/notifications", icon: Bell          },
      { name: "Audit Logs",    path: "/audit-logs",    icon: FileText      },
    ],
  },
{
    kind: "link",
    name: "Reports",
    path: "/reports",
    icon: BarChart2,
  },
  {
    kind: "link",
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const base     = "/admin/dashboard";

  /* Track which groups are open — default all open */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    menu.forEach(item => { if (item.kind === "group") init[item.name] = true; });
    return init;
  });

  const toggleGroup = (name: string) =>
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const isActive = (path: string) =>
    path === ""
      ? pathname === base
      : pathname.startsWith(`${base}${path}`);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-60 shrink-0 transform bg-[#0f172a] text-white transition-transform
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto
        ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* ── Logo ── */}
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-wide">HULMS</span>
          <button onClick={onClose} className="ml-auto rounded p-1 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="py-2 text-sm">
          {menu.map(item => {
            if (item.kind === "link") {
              const Icon   = item.icon;
              const href   = `${base}${item.path}`;
              const active = isActive(item.path);
              return (
                <Link key={href} href={href} onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2.5 font-medium transition-colors
                    ${active
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-white/8 hover:text-white"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            }

            /* Group */
            const GroupIcon  = item.icon;
            const expanded   = openGroups[item.name] ?? true;
            const anyActive  = item.children.some(c => isActive(c.path));

            return (
              <div key={item.name}>
                {/* Group header — clickable to expand/collapse */}
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 font-medium transition-colors
                    ${anyActive ? "text-white" : "text-gray-400 hover:bg-white/8 hover:text-white"}`}>
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {expanded
                    ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />}
                </button>

                {/* Sub-items */}
                {expanded && (
                  <div className="mb-1">
                    {item.children.map(child => {
                      const ChildIcon = child.icon;
                      const href      = `${base}${child.path}`;
                      const active    = isActive(child.path);
                      return (
                        <Link key={`${item.name}-${child.name}`} href={href} onClick={onClose}
                          className={`flex items-center gap-3 py-2 pl-11 pr-4 transition-colors
                            ${active
                              ? "text-white"
                              : "text-gray-500 hover:bg-white/8 hover:text-gray-200"}`}>
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[13px]">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
