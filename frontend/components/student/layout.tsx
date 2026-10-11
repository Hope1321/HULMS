"use client";

import { ReactNode, useState, useEffect } from "react";
import StudentSidebar from "@/components/student/Sidebar";
import StudentHeader  from "@/components/student/Header";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread,      setUnread]      = useState(0);

  /* fetch unread count once so sidebar badge + header bell stay in sync */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const count = (res.data as { isRead: boolean }[]).filter((n) => !n.isRead).length;
          setUnread(count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StudentSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unread={unread}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader
          onMenuClick={() => setSidebarOpen(true)}
          unread={unread}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
