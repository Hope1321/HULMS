import type { ReactNode } from "react";

// Layout is handled by app/admin/layout.tsx — no wrapper needed here
export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
