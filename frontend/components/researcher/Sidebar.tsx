"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Plus, CheckCircle,
  FlaskConical, History, Bell, User, HelpCircle,
  Microscope, X, LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  unread?: number;
}

const menuItems = [
  { label: "Dashboard",         href: "/researcher/dashboard",                   icon: LayoutDashboard },
  { label: "Research Requests", href: "/researcher/requests",                    icon: ClipboardList   },
  { label: "Create Request",    href: "/researcher/requests/create",             icon: Plus            },
  { label: "Approved Requests", href: "/researcher/requests?status=APPROVED",   icon: CheckCircle     },
  { label: "Issued Chemicals",  href: "/researcher/issuances",                  icon: FlaskConical    },
  { label: "Research History",  href: "/researcher/history",                    icon: History         },
  { label: "Notifications",     href: "/researcher/notifications",              icon: Bell, badge: true },
  { label: "Profile",           href: "/researcher/profile",                    icon: User            },
  { label: "Help",              href: "/researcher/help",                       icon: HelpCircle      },
];

export default function ResearcherSidebar({ open, onClose, unread = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/researcher/dashboard") return pathname === base;
    return pathname.startsWith(base);
  };

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "hulms_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    document.cookie = "hulms_roles=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-slate-900 text-white transition-transform duration-300
        lg:static lg:inset-auto lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto
        ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
              <Microscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">HULMS</p>
              <p className="text-[10px] text-slate-400">Researcher Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-800 lg:hidden">
            <X className="h-5 w-5 text-slate-400" />
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
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                      ${active ? "bg-violet-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                  >
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
        <div className="border-t border-slate-800 px-3 py-3">
          <button onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white">
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
