"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

import api from "@/lib/api";
import { setToken } from "@/lib/auth";

/* Map role → dashboard path. First matching role wins. */
const ROLE_REDIRECT: Record<string, string> = {
  ADMIN:          "/admin/dashboard",
  DIRECTOR:       "/director/dashboard",
  LAB_TECHNICIAN: "/lab-technician/dashboard",
  LECTURER:       "/lecturer/dashboard",
  RESEARCHER:     "/researcher/dashboard",
  STUDENT:        "/student/dashboard",
};

function getDashboardPath(roles: string[]): string {
  const priority = ["ADMIN", "DIRECTOR", "LAB_TECHNICIAN", "LECTURER", "RESEARCHER", "STUDENT"];
  for (const role of priority) {
    if (roles.includes(role)) return ROLE_REDIRECT[role];
  }
  // Fallback: user is approved but has no role yet (shouldn't happen)
  return "/student/dashboard";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await api.post("/auth/login", { email, password });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      const { token, user } = response.data.data;
      const roles: string[] = user.roles ?? [];

      setToken(token, roles);

      // Use window.location.href to force full page reload and ensure cookies are committed
      setTimeout(() => {
        window.location.href = getDashboardPath(roles);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #dbeafe 100%)" }}>

      <div className="w-full max-w-md">

        {/* Logo + Title */}
        <div className="mb-8 text-center">
          {/* University logo + HULMS branding */}
          <div className="mx-auto flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-gray-200">
              <Image
                src="/images/hulms-logo.png"
                alt="Haramaya University Logo"
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
                priority
              />
            </div>
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900">Sign in to HULMS</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Haramaya University Laboratory Management System
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-8 shadow-xl shadow-blue-200/50">

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@haramaya.edu.et"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1e3a8a, #2d4fa1)" }}
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold transition hover:opacity-80" style={{ color: "#1e3a8a" }}>
              Register
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Access is limited to ULMO-authorized users only.
        </p>
      </div>
    </main>
  );
}
