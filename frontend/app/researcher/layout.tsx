import type { ReactNode } from "react";
import ResearcherLayout from "@/components/researcher/layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <ResearcherLayout>{children}</ResearcherLayout>;
}
