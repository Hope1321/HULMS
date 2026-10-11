"use client";

/**
 * SessionSync
 *
 * Runs on every page load. If localStorage has a token but the
 * hulms_token cookie is missing, restores the cookie immediately
 * so the middleware stops redirecting to /login.
 *
 * Also handles the case where the user is on /login with a valid
 * token — redirects them straight to their dashboard.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const API  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const DAYS = 7;

function writeCookie(name: string, value: string) {
  const expires = new Date(Date.now() + DAYS * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

const ROLE_REDIRECT: Record<string, string> = {
  ADMIN:          "/admin/dashboard",
  DIRECTOR:       "/director/dashboard",
  LAB_TECHNICIAN: "/lab-technician/dashboard",
  LECTURER:       "/lecturer/dashboard",
  RESEARCHER:     "/researcher/dashboard",
  STUDENT:        "/student/dashboard",
};

export default function SessionSync() {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const tokenCookie = readCookie("hulms_token");
    const rolesCookie  = readCookie("hulms_roles");

    // ── Always ensure the token cookie is present ─────────────────────────
    if (!tokenCookie) {
      writeCookie("hulms_token", token);
    }

    // ── If roles cookie is missing, fetch and restore it ──────────────────
    if (!rolesCookie) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.userId) {
          fetch(`${API}/users/${payload.userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.data?.roles) {
                const roles: string[] = res.data.roles.map(
                  (r: { role: { name: string } }) => r.role.name
                );
                writeCookie("hulms_roles", roles.join(","));

                // ── If currently on /login, redirect to dashboard ─────────
                if (pathname === "/login") {
                  const order = ["ADMIN","DIRECTOR","LAB_TECHNICIAN","LECTURER","RESEARCHER","STUDENT"];
                  const match = order.find((r) => roles.includes(r));
                  if (match && ROLE_REDIRECT[match]) {
                    router.replace(ROLE_REDIRECT[match]);
                  }
                }
              }
            })
            .catch(() => {
              writeCookie("hulms_roles", "");
            });
        }
      } catch { /* invalid JWT */ }
    } else {
      // ── Roles cookie exists — if on /login, redirect to dashboard ────────
      if (pathname === "/login") {
        const roles = rolesCookie.split(",").map(r => r.trim().toUpperCase()).filter(Boolean);
        const order = ["ADMIN","DIRECTOR","LAB_TECHNICIAN","LECTURER","RESEARCHER","STUDENT"];
        const match = order.find((r) => roles.includes(r));
        if (match && ROLE_REDIRECT[match]) {
          router.replace(ROLE_REDIRECT[match]);
        }
      }
    }
  }, [pathname, router]);

  return null;
}
