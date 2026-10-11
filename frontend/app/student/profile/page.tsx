"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  Pencil, Check, X, ShieldCheck, Building2,
  BookOpen, FlaskRound, Calendar, BadgeCheck,
} from "lucide-react";
import { toast } from "react-toastify";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface UserProfile {
  id: string;
  firstName: string; lastName: string;
  email: string; phone: string | null;
  status: string; isEmailVerified: boolean;
  createdAt: string; updatedAt: string;
  college:    { name: string; code: string } | null;
  department: { name: string; code: string } | null;
  laboratory: { name: string; code: string } | null;
  roles: { role: { name: string } }[];
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN:          "bg-purple-100 text-purple-700",
  DIRECTOR:       "bg-blue-100 text-blue-700",
  LAB_TECHNICIAN: "bg-teal-100 text-teal-700",
  LECTURER:       "bg-indigo-100 text-indigo-700",
  RESEARCHER:     "bg-violet-100 text-violet-700",
  STUDENT:        "bg-green-100 text-green-700",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

const INPUT = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-400";

type Tab = "profile" | "password";

export default function StudentProfilePage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [tab,      setTab]      = useState<Tab>("profile");

  /* Edit profile state */
  const [editing,  setEditing]  = useState(false);
  const [pForm,    setPForm]    = useState({ firstName: "", lastName: "", phone: "" });
  const [pSaving,  setPSaving]  = useState(false);

  /* Change password state */
  const [pwForm,   setPwForm]   = useState({ current: "", next: "", confirm: "" });
  const [showPw,   setShowPw]   = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  /* Fetch profile */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message);
        setProfile(res.data);
        setPForm({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone ?? "" });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  /* Save profile */
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!pForm.firstName.trim() || !pForm.lastName.trim()) { toast.error("Name fields are required."); return; }
    setPSaving(true);
    try {
      const token = localStorage.getItem("token")!;
      const res   = await fetch(`${API}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName: pForm.firstName.trim(), lastName: pForm.lastName.trim(), phone: pForm.phone.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      setProfile(prev => prev ? { ...prev, firstName: pForm.firstName.trim(), lastName: pForm.lastName.trim(), phone: pForm.phone.trim() || null } : prev);
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update profile."); }
    finally { setPSaving(false); }
  };

  /* Change password */
  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) { toast.error("Current password is required."); return; }
    if (pwForm.next.length < 6) { toast.error("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords do not match."); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem("token")!;
      const res   = await fetch(`${API}/users/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      setPwForm({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to change password."); }
    finally { setPwSaving(false); }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-green-600" />
    </div>
  );

  if (error || !profile) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
      <p className="font-semibold text-red-700">{error || "Failed to load profile."}</p>
    </div>
  );

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  const pwStrength = pwForm.next.length === 0 ? 0 : pwForm.next.length < 6 ? 1 : pwForm.next.length < 10 ? 2 : pwForm.next.length < 14 ? 3 : 4;
  const strengthColors = ["bg-gray-200", "bg-red-400", "bg-amber-400", "bg-blue-500", "bg-green-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ── Profile card ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Green top banner */}
        <div className="h-24" style={{ background: "linear-gradient(to right, #14532d, #166534, #065f46)" }} />

        <div className="px-6 pb-6">
          {/* Avatar + name */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-12 flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-green-900 text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {profile.roles.map(r => (
                    <span key={r.role.name} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_BADGE[r.role.name] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.role.name.replace(/_/g, " ")}
                    </span>
                  ))}
                  {profile.isEmailVerified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!editing && (
                <button onClick={() => setEditing(true)}
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#14532d" }}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90">
                  <Pencil className="h-4 w-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Mail,      label: "Email",      value: profile.email },
              { icon: Phone,     label: "Phone",      value: profile.phone || "Not provided" },
              { icon: Building2, label: "College",    value: profile.college ? `${profile.college.name} (${profile.college.code})` : "—" },
              { icon: BookOpen,  label: "Department", value: profile.department ? `${profile.department.name} (${profile.department.code})` : "—" },
              { icon: FlaskRound,label: "Laboratory", value: profile.laboratory ? `${profile.laboratory.name}` : "—" },
              { icon: ShieldCheck,label:"Status",     value: profile.status },
              { icon: Calendar,  label: "Member Since", value: fmtDate(profile.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {(["profile", "password"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={tab === t ? { background: "#14532d", color: "#ffffff" } : { color: "#6b7280" }}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition hover:opacity-90 shadow-sm">
            {t === "profile" ? "Edit Profile" : "Change Password"}
          </button>
        ))}
      </div>

      {/* ── Edit Profile form ── */}
      {tab === "profile" && (
        <form onSubmit={saveProfile} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Personal Information</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={pForm.firstName} onChange={e => setPForm(p => ({ ...p, firstName: e.target.value }))}
                  required className={INPUT + " pl-9"} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={pForm.lastName} onChange={e => setPForm(p => ({ ...p, lastName: e.target.value }))}
                  required className={INPUT + " pl-9"} />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email <span className="text-xs font-normal text-gray-400">(cannot be changed)</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={profile.email} disabled className={INPUT + " pl-9 cursor-not-allowed"} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="tel" value={pForm.phone} onChange={e => setPForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+251 911 000 000" className={INPUT + " pl-9"} />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={() => { setEditing(false); setPForm({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? "" }); }}
              disabled={pSaving}
              style={{ border: "1px solid #d1d5db", background: "#ffffff", color: "#374151" }}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="submit" disabled={pSaving}
              style={{ background: "#14532d", color: "#ffffff" }}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-60">
              {pSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
              {pSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* ── Change Password form ── */}
      {tab === "password" && (
        <form onSubmit={savePassword} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Change Password</h2>

          {/* Current password */}
          {[
            { key: "current" as const, label: "Current Password" },
            { key: "next"    as const, label: "New Password" },
            { key: "confirm" as const, label: "Confirm New Password" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw[key] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                  required minLength={key !== "current" ? 6 : undefined}
                  placeholder={key === "current" ? "Enter current password" : "Min. 6 characters"}
                  className={`${INPUT} pl-9 pr-10 ${key === "confirm" && pwForm.confirm && pwForm.confirm !== pwForm.next ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {key === "confirm" && pwForm.confirm && pwForm.confirm !== pwForm.next && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          ))}

          {/* Strength bar */}
          {pwForm.next.length > 0 && (
            <div>
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength ? strengthColors[pwStrength] : "bg-gray-100"}`} />
                ))}
              </div>
              <p className={`mt-1 text-xs font-medium ${["","text-red-500","text-amber-500","text-blue-500","text-green-600"][pwStrength]}`}>
                {strengthLabels[pwStrength]}
              </p>
            </div>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button type="submit" disabled={pwSaving}
              style={{ background: "#14532d", color: "#ffffff" }}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-60">
              {pwSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Lock className="h-4 w-4" />}
              {pwSaving ? "Changing…" : "Change Password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
