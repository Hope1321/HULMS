"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  CheckCircle,
  Send,
  Bell,
  User,
  HelpCircle,
  X,
  Shield,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  unread?: number;
}

const menuItems = [
  { name: "Dashboard",         href: "/student/dashboard",           icon: LayoutDashboard },
  { name: "My Requests",       href: "/student/requests",            icon: ClipboardList   },
  { name: "Create Request",    href: "/student/requests/create",     icon: Plus            },
  { name: "Approved Requests", href: "/student/requests?status=APPROVED", icon: CheckCircle },
  { name: "Issued Chemicals",  href: "/student/issuances",           icon: Send            },
  { name: "Notifications",     href: "/student/notifications",       icon: Bell            },
  { name: "Profile",           href: "/student/profile",             icon: User            },
  { name: "Help",              href: "/student/help",                icon: HelpCircle      },
];

export default function StudentSidebar({ open, onClose, unread = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col
          bg-[#1a3a2a] text-white transition-transform duration-200
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:overflow-y-auto
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-wide">HULMS</span>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/student/dashboard" &&
                !item.href.includes("?") &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition
                  ${
                    active
                      ? "bg-green-600 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>

                {/* unread badge on Notifications */}
                {item.name === "Notifications" && unread > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
