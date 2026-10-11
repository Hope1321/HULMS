import { redirect } from "next/navigation";

// Root URL → always go to login
export default function RootPage() {
  redirect("/login");
}
