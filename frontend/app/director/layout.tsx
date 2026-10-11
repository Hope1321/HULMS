import type { ReactNode } from "react";
import DirectorLayout from "@/components/director/layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <DirectorLayout>{children}</DirectorLayout>;
}
