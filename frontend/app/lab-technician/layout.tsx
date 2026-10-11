import type { ReactNode } from "react";
import LabTechLayout from "@/components/lab-technician/layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <LabTechLayout>{children}</LabTechLayout>;
}
