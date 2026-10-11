"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, CheckCircle, Eye, EyeOff, User, Mail,
  Phone, Lock, Check, AlertCircle, ChevronDown,
  Building2, GraduationCap, Briefcase,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface College    { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; collegeId: string; }

const ALL_ROLES = ["ADMIN", "DIRECTOR", "LAB_TECHNICIAN", "LECTURER", "RESEARCHER", "STUDENT"];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700", DIRECTOR: "bg-blue-100 text-blue-700",
  LAB_TECHNICIAN: "bg-teal-100 text-teal-700", LECTURER: "bg-indigo-100 text-indigo-700",
  RESEARCHER: "bg-cyan-100 text-cyan-700", STUDENT: "bg-gray-100 text-gray-600",
};

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400";
const INPUT_ERROR =
  "w-full rounded-xl border border-red-300 bg-red-50 py-2.5 pl-9 pr-4 text-sm outline-none transition-all duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400";
const INPUT_SUCCESS =
  "w-full rounded-xl border border-green-300 bg-green-50 py-2.5 pl-9 pr-4 text-sm outline-none transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 placeholder:text-gray-400";
const SELECT =
  "w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {text} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {children}
    </div>
  );
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function FieldStatus({ status, message }: { status: "error" | "success" | null; message?: string }) {
  if (!status) return null;
  return (
    <div className={`mt-1.5 flex items-center gap-1.5 text-xs transition-all duration-200 ${
      status === "error" ? "text-red-600" : "text-green-600"
    }`}>
      {status === "error" ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
      <span>{message}</span>
    </div>
  );
}

export default function CreateUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [status,        setStatus]        = useState("ACTIVE");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [collegeId,     setCollegeId]     = useState("");
  const [departmentId,  setDepartmentId]  = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [showCPw,       setShowCPw]       = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  const [colleges,    setColleges]    = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptOptions, setDeptOptions] = useState<Department[]>([]);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldSuccess, setFieldSuccess] = useState<Record<string, boolean>>({});

  // Load colleges and departments on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API}/colleges`, { headers }).then(r => r.json()),
      fetch(`${API}/departments`, { headers }).then(r => r.json()),
    ])
      .then(([collegeRes, deptRes]) => {
        if (collegeRes.success) setColleges(collegeRes.data ?? []);
        if (deptRes.success) setDepartments(deptRes.data ?? []);
      })
      .catch(() => {});
  }, [router]);

  // Filter departments when college changes
  useEffect(() => {
    setDepartmentId("");
    if (collegeId) {
      setDeptOptions(departments.filter(d => d.collegeId === collegeId));
    } else {
      setDeptOptions([]);
    }
  }, [collegeId, departments]);

  // Password strength
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return null;
  };

  const validatePhone = (phone: string) => {
    if (phone && phone.trim()) {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ""))) return "Please enter a valid phone number";
    }
    return null;
  };

  const validateName = (name: string) => {
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return null;
  };

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm(prev => ({ ...prev, [k]: value }));

      // Real-time validation
      if (k === "email" && value) {
        const error = validateEmail(value);
        setFieldErrors(prev => ({ ...prev, email: error || "" }));
        setFieldSuccess(prev => ({ ...prev, email: !error }));
      } else if (k === "phone" && value) {
        const error = validatePhone(value);
        setFieldErrors(prev => ({ ...prev, phone: error || "" }));
        setFieldSuccess(prev => ({ ...prev, phone: !error }));
      } else if ((k === "firstName" || k === "lastName") && value) {
        const error = validateName(value);
        setFieldErrors(prev => ({ ...prev, [k]: error || "" }));
        setFieldSuccess(prev => ({ ...prev, [k]: !error }));
      } else if (k === "confirmPassword" && value) {
        const error = value !== form.password ? "Passwords do not match" : "";
        setFieldErrors(prev => ({ ...prev, confirmPassword: error }));
        setFieldSuccess(prev => ({ ...prev, confirmPassword: !error }));
      }
    };

  const toggleRole = (role: string) =>
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const getInputClass = (field: string) => {
    if (fieldErrors[field]) return INPUT_ERROR;
    if (fieldSuccess[field]) return INPUT_SUCCESS;
    return INPUT;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setFieldSuccess({});

    // Validate all fields
    const errors: Record<string, string> = {};
    const success: Record<string, boolean> = {};

    if (!form.firstName.trim()) {
      errors.firstName = "First name is required";
    } else {
      const nameError = validateName(form.firstName);
      if (nameError) errors.firstName = nameError;
      else success.firstName = true;
    }

    if (!form.lastName.trim()) {
      errors.lastName = "Last name is required";
    } else {
      const nameError = validateName(form.lastName);
      if (nameError) errors.lastName = nameError;
      else success.lastName = true;
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailError = validateEmail(form.email);
      if (emailError) errors.email = emailError;
      else success.email = true;
    }

    if (form.phone.trim()) {
      const phoneError = validatePhone(form.phone);
      if (phoneError) errors.phone = phoneError;
      else success.phone = true;
    }

    if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (passwordStrength < 2) {
      errors.password = "Password is too weak";
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    } else {
      success.confirmPassword = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFieldSuccess(success);
      setError("Please fix the errors above to continue");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim(),
          phone:     form.phone.trim() || undefined,
          password:  form.password,
          status,
          roles: selectedRoles.length > 0 ? selectedRoles : undefined,
          collegeId: collegeId || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to create user.");

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/dashboard/users");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally { setSubmitting(false); }
  };

  const pwMismatch = form.confirmPassword && form.confirmPassword !== form.password;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard/users" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to Users
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
            <p className="text-sm text-gray-500">Add a new user account to the system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Success Message */}
        {success && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">User Created Successfully!</p>
                <p className="text-xs text-green-600">Redirecting to users list...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !success && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Name & Contact ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label text="First Name" required />
            <div className="relative">
              <IconWrap><User className="h-4 w-4" /></IconWrap>
              <input
                type="text"
                value={form.firstName}
                onChange={set("firstName")}
                required
                placeholder="e.g. Tesfaye"
                className={getInputClass("firstName")}
                aria-invalid={!!fieldErrors.firstName}
              />
              {fieldSuccess.firstName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
            <FieldStatus status={fieldErrors.firstName ? "error" : fieldSuccess.firstName ? "success" : null} message={fieldErrors.firstName} />
          </div>
          <div>
            <Label text="Last Name" required />
            <div className="relative">
              <IconWrap><User className="h-4 w-4" /></IconWrap>
              <input
                type="text"
                value={form.lastName}
                onChange={set("lastName")}
                required
                placeholder="e.g. Eshatu"
                className={getInputClass("lastName")}
                aria-invalid={!!fieldErrors.lastName}
              />
              {fieldSuccess.lastName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
            <FieldStatus status={fieldErrors.lastName ? "error" : fieldSuccess.lastName ? "success" : null} message={fieldErrors.lastName} />
          </div>
        </div>

        <div>
          <Label text="Email" required />
          <div className="relative">
            <IconWrap><Mail className="h-4 w-4" /></IconWrap>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              placeholder="e.g. tesfaye@haramaya.edu.et"
              className={getInputClass("email")}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldSuccess.email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          <FieldStatus status={fieldErrors.email ? "error" : fieldSuccess.email ? "success" : null} message={fieldErrors.email} />
        </div>

        <div>
          <Label text="Phone" />
          <div className="relative">
            <IconWrap><Phone className="h-4 w-4" /></IconWrap>
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="e.g. +251911234567"
              className={getInputClass("phone")}
              aria-invalid={!!fieldErrors.phone}
            />
            {fieldSuccess.phone && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          <FieldStatus status={fieldErrors.phone ? "error" : fieldSuccess.phone ? "success" : null} message={fieldErrors.phone} />
        </div>

        {/* ── College & Department ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label text="College" />
            <SelectWrap>
              <select
                value={collegeId}
                onChange={e => setCollegeId(e.target.value)}
                className={SELECT}
              >
                <option value="">Select College (optional)</option>
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </SelectWrap>
          </div>
          <div>
            <Label text="Department" />
            <SelectWrap>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                disabled={!collegeId}
                className={`${SELECT} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">
                  {collegeId ? "Select Department" : "Select a college first"}
                </option>
                {deptOptions.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </SelectWrap>
          </div>
        </div>

        {/* ── Password ── */}
        <div>
          <Label text="Password" required />
          <div className="relative">
            <IconWrap><Lock className="h-4 w-4" /></IconWrap>
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              placeholder="Min. 6 characters"
              className={getInputClass("password") + " pr-10"}
              aria-invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {form.password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || "bg-gray-200"}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength <= 2 ? "text-red-600" : passwordStrength <= 3 ? "text-yellow-600" : "text-green-600"
                }`}>
                  {strengthLabels[passwordStrength - 1] || "Very Weak"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                <span className={form.password.length >= 6 ? "text-green-600" : ""}>• 6+ characters</span>
                <span className={form.password.length >= 10 ? "text-green-600" : ""}>• 10+ characters</span>
                <span className={/[A-Z]/.test(form.password) ? "text-green-600" : ""}>• Uppercase</span>
                <span className={/[0-9]/.test(form.password) ? "text-green-600" : ""}>• Number</span>
                <span className={/[^A-Za-z0-9]/.test(form.password) ? "text-green-600" : ""}>• Special</span>
              </div>
            </div>
          )}
          <FieldStatus status={fieldErrors.password ? "error" : null} message={fieldErrors.password} />
        </div>

        <div>
          <Label text="Confirm Password" required />
          <div className="relative">
            <IconWrap><Lock className="h-4 w-4" /></IconWrap>
            <input
              type={showCPw ? "text" : "password"}
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
              placeholder="Repeat password"
              className={getInputClass("confirmPassword") + " pr-10"}
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowCPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showCPw ? "Hide password" : "Show password"}
            >
              {showCPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {fieldSuccess.confirmPassword && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          <FieldStatus status={fieldErrors.confirmPassword ? "error" : fieldSuccess.confirmPassword ? "success" : null} message={fieldErrors.confirmPassword} />
        </div>

        {/* ── Account Settings ── */}
        <div>
          <Label text="Initial Status" />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={SELECT}
          >
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <p className="mt-1.5 text-xs text-gray-400">Admin-created accounts are email-verified by default.</p>
        </div>

        {/* ── Roles ── */}
        <div>
          <Label text="Roles" />
          <p className="mb-4 text-xs text-gray-500">Select one or more roles for this user.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_ROLES.map(role => (
              <label key={role} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition
                ${selectedRoles.includes(role) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="sr-only" />
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border
                  ${selectedRoles.includes(role) ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                  {selectedRoles.includes(role) && <CheckCircle className="h-3 w-3 text-white" />}
                </span>
                <span className={`rounded-full px-1.5 text-xs font-semibold ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600"}`}>
                  {role.replace(/_/g, " ")}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/dashboard/users"
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || success}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating…
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Created!
              </>
            ) : (
              "Create User"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
