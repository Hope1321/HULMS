"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, User, Lock, Info,
  CheckCircle, AlertCircle, Eye, EyeOff,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Role { id: string; name: string; }
interface UserRole { role: Role; }
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
  college:    { name: string } | null;
  department: { name: string } | null;
  laboratory: { name: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:          "bg-purple-100 text-purple-700",
  DIRECTOR:       "bg-blue-100   text-blue-700",
  LAB_TECHNICIAN: "bg-teal-100   text-teal-700",
  LECTURER:       "bg-indigo-100 text-indigo-700",
  RESEARCHER:     "bg-cyan-100   text-cyan-700",
  STUDENT:        "bg-gray-100   text-gray-600",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

type Tab = "profile" | "password" | "system";

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium
      ${type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
      {type === "success"
        ? <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
        : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  /* profile */
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [profLoad,  setProfLoad]  = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [profSaving, setProfSaving] = useState(false);

  /* password */
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [pwSaving,   setPwSaving]   = useState(false);

  /* toast */
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  /* ── load profile ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/users/me`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(result => {
        if (!result.success) { router.push("/login"); return; }
        const u: UserProfile = result.data;
        setProfile(u);
        setFirstName(u.firstName);
        setLastName(u.lastName);
        setPhone(u.phone ?? "");
      })
      .catch(() => router.push("/login"))
      .finally(() => setProfLoad(false));
  }, [router]);

  /* ── save profile ── */
  const handleProfileSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName.trim()) { showToast("First name is required.", "error"); return; }
    if (!lastName.trim())  { showToast("Last name is required.",  "error"); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setProfSaving(true);
      const res = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to update profile.");
      setProfile(result.data);
      showToast("Profile updated successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update profile.", "error");
    } finally { setProfSaving(false); }
  };

  /* ── change password ── */
  const handlePasswordSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPw)          { showToast("Current password is required.", "error"); return; }
    if (newPw.length < 6)    { showToast("New password must be at least 6 characters.", "error"); return; }
    if (newPw !== confirmPw) { showToast("Passwords do not match.", "error"); return; }
    if (newPw === currentPw) { showToast("New password must differ from current password.", "error"); return; }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      setPwSaving(true);
      const res = await fetch(`${API}/users/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to change password.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to change password.", "error");
    } finally { setPwSaving(false); }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile",  label: "Profile",          icon: <User  className="h-4 w-4" /> },
    { key: "password", label: "Change Password",   icon: <Lock  className="h-4 w-4" /> },
    { key: "system",   label: "System Info",       icon: <Info  className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and system preferences</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

        {/* ── Sidebar tabs ── */}
        <nav className="flex shrink-0 flex-row gap-1 sm:w-44 sm:flex-col">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition
                ${tab === t.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        {/* ── Panel ── */}
        <div className="flex-1">

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div className="space-y-5">
              {/* Avatar + summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {profLoad ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ) : profile && (
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 text-xl font-bold text-white">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{profile.firstName} {profile.lastName}</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {profile.roles.map(ur => (
                          <span key={ur.role.id} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[ur.role.name] ?? "bg-gray-100 text-gray-600"}`}>
                            {ur.role.name.replace(/_/g, " ")}
                          </span>
                        ))}
                        {profile.isEmailVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit form */}
              <form onSubmit={handleProfileSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 font-semibold text-gray-900">Edit Profile</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input id="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-800 focus:ring-2 focus:ring-gray-200" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input id="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-800 focus:ring-2 focus:ring-gray-200" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <input id="email" type="email" value={profile?.email ?? ""} disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
                    <p className="mt-1 text-xs text-gray-400">Email address cannot be changed.</p>
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Phone <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +251911234567"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-800 focus:ring-2 focus:ring-gray-200" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="submit" disabled={profSaving || profLoad}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {profSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* Read-only affiliation */}
              {profile && (profile.college || profile.department || profile.laboratory) && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 font-semibold text-gray-900">Affiliation</h2>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: "College",    value: profile.college?.name    },
                      { label: "Department", value: profile.department?.name },
                      { label: "Laboratory", value: profile.laboratory?.name },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{f.label}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-gray-800">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}

          {/* ── PASSWORD TAB ── */}
          {tab === "password" && (
            <form onSubmit={handlePasswordSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 font-semibold text-gray-900">Change Password</h2>
              <div className="space-y-4">

                {/* Current */}
                <div>
                  <label htmlFor="currentPw" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input id="currentPw" type={showCur ? "text" : "password"} required value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-gray-800 focus:ring-2 focus:ring-gray-200" />
                    <button type="button" onClick={() => setShowCur(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New */}
                <div>
                  <label htmlFor="newPw" className="mb-1.5 block text-sm font-medium text-gray-700">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input id="newPw" type={showNew ? "text" : "password"} required value={newPw}
                      onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 characters"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-gray-800 focus:ring-2 focus:ring-gray-200" />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPw && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                            newPw.length >= i * 3
                              ? i <= 1 ? "bg-red-400" : i <= 2 ? "bg-yellow-400" : i <= 3 ? "bg-blue-400" : "bg-green-500"
                              : "bg-gray-200"
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {newPw.length < 6 ? "Too short" : newPw.length < 9 ? "Weak" : newPw.length < 12 ? "Fair" : "Strong"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label htmlFor="confirmPw" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input id="confirmPw" type={showConf ? "text" : "password"} required value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm outline-none transition focus:ring-2
                        ${confirmPw && confirmPw !== newPw
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-300 focus:border-gray-800 focus:ring-gray-200"}`} />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPw && confirmPw !== newPw && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirmPw && confirmPw === newPw && newPw.length >= 6 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Passwords match
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={pwSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <Lock className="h-4 w-4" />
                  {pwSaving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          )}

          {/* ── SYSTEM INFO TAB ── */}
          {tab === "system" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 font-semibold text-gray-900">System Information</h2>
                <dl className="space-y-4">
                  {[
                    { label: "Application",      value: "Haramaya University Laboratory Management System" },
                    { label: "Version",           value: "1.0.0" },
                    { label: "Institution",       value: "Haramaya University" },
                    { label: "API Base URL",      value: API },
                    { label: "Environment",       value: process.env.NODE_ENV ?? "production" },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-0.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <dt className="text-sm font-semibold text-gray-500">{f.label}</dt>
                      <dd className="font-mono text-sm text-gray-800">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {profile && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 font-semibold text-gray-900">Account Details</h2>
                  <dl className="space-y-4">
                    {[
                      { label: "Account ID",     value: profile.id },
                      { label: "Account Status", value: profile.status },
                      { label: "Email Verified", value: profile.isEmailVerified ? "Yes" : "No" },
                      { label: "Member Since",   value: fmt(profile.createdAt) },
                      { label: "Last Updated",   value: fmt(profile.updatedAt) },
                    ].map(f => (
                      <div key={f.label} className="flex flex-col gap-0.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                        <dt className="text-sm font-semibold text-gray-500">{f.label}</dt>
                        <dd className="font-mono text-sm text-gray-800 break-all">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
