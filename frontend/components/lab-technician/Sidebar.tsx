"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, Layers, ClipboardList,
  Send, RotateCcw, AlertTriangle, Bell,
  User, HelpCircle, X, Wrench, LogOut,
} from "lucide-react";

interface SidebarProps { open: boolean; onClose: () => void; unread?: number; }

const menuItems = [
  { label: "Dashboard",     href: "/lab-technician/dashboard",     icon: LayoutDashboard },
  { label: "Inventory",     href: "/lab-technician/inventory",     icon: Package         },
  { label: "Batches",       href: "/lab-technician/batches",       icon: Layers          },
  { label: "Requests",      href: "/lab-technician/requests",      icon: ClipboardList   },
  { label: "Issuances",     href: "/lab-technician/issuances",     icon: Send            },
  { label: "Returns",       href: "/lab-technician/returns",       icon: RotateCcw       },
  { label: "Equipment",     href: "/lab-technician/equipment",     icon: Wrench          },
  { label: "Alerts",        href: "/lab-technician/alerts",        icon: AlertTriangle   },
  { label: "Notifications", href: "/lab-technician/notifications", icon: Bell, badge: true },
  { label: "Profile",       href: "/lab-technician/profile",       icon: User            },
  { label: "Help",          href: "/lab-technician/help",          icon: HelpCircle      },
];

export default function LabTechSidebar({ open, onClose, unread = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const isActive = (href: string) =>
    href === "/lab-technician/dashboard" ? pathname === href : pathname.startsWith(href);

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "hulms_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    document.cookie = "hulms_roles=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    router.push("/login");
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col text-white transition-transform duration-300
          lg:static lg:inset-auto lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto
          ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#2d1a0e" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">HULMS</p>
              <p className="text-[10px] text-white/40">Lab Technician</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5 text-white/50" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {menuItems.map(item => {
              const Icon   = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                      ${active ? "text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                    style={active ? { background: "#c2410c" } : {}}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && unread > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 px-3 py-3">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
