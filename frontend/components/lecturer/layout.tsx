"use client";

import { ReactNode, useState, useEffect } from "react";
import LecturerSidebar from "@/components/lecturer/Sidebar";
import LecturerHeader  from "@/components/lecturer/Header";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function LecturerLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread,      setUnread]      = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (res.success) setUnread((res.data as { isRead: boolean }[]).filter(n => !n.isRead).length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LecturerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} unread={unread} />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <LecturerHeader onMenuClick={() => setSidebarOpen(true)} unread={unread} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
