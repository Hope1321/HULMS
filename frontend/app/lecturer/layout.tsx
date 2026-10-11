import type { ReactNode } from "react";
import LecturerLayout from "@/components/lecturer/layout";

export default function Layout({ children }: { children: ReactNode }) {
  return <LecturerLayout>{children}</LecturerLayout>;
}
