"use client";
import { redirect } from "next/navigation";
export default function ApprovalsPage() { redirect("/director/requests?status=PENDING"); }