"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, User, ChevronDown, LogOut } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface HeaderProps { onMenuClick: () => void; unread: number; }

export default function LecturerHeader({ onMenuClick, unread }: HeaderProps) {
  const router = useRouter();
  const [userName,     setUserName]     = useState("Lecturer");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.userId) {
        fetch(`${API}/users/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(res => { if (res.success && res.data) setUserName(`${res.data.firstName} ${res.data.lastName}`); })
          .catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    document.cookie = "hulms_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    document.cookie = "hulms_roles=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden">
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="hidden text-lg font-extrabold tracking-wide sm:block" style={{ color: "#6d28d9" }}>
          LECTURER DASHBOARD
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search anything..."
            className="w-40 bg-transparent text-sm outline-none placeholder:text-gray-400" />
        </div>

        <button onClick={() => router.push("/lecturer/notifications")}
          className="relative rounded-lg p-2 hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="relative">
          <button onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: "#6d28d9" }}>
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold text-gray-800 sm:block">{userName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
