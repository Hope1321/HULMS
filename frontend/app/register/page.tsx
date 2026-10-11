"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Eye, EyeOff, User, Mail,
  Phone, Lock, ChevronDown, Check, X, AlertCircle,
  Building2, GraduationCap, Briefcase, CheckCircle2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface College    { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; collegeId: string; }

const USER_TYPES = [
  { value: "STUDENT",    label: "Student",                    desc: "Undergraduate student",    icon: GraduationCap },
  { value: "LECTURER",   label: "Lecturer",                   desc: "Instructor or faculty member", icon: Briefcase },
  { value: "RESEARCHER", label: "Researcher / Postgraduate",  desc: "Staff researcher or PhD candidate", icon: Building2 },
] as const;
type UserTypeValue = (typeof USER_TYPES)[number]["value"];

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed";
const INPUT_ERROR =
  "w-full rounded-xl border border-red-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100";
const INPUT_SUCCESS =
  "w-full rounded-xl border border-green-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100";
const SELECT =
  "w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400";

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
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
    <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
      status === "error" ? "text-red-600" : "text-green-600"
    }`}>
      {status === "error" ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      <span>{message}</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [userType,      setUserType]      = useState<UserTypeValue>("STUDENT");
  const [collegeId,     setCollegeId]     = useState("");
  const [departmentId,  setDepartmentId]  = useState("");
  const [agreed,        setAgreed]        = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const [showCPw,       setShowCPw]       = useState(false);
  const [error,         setError]         = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState(false);

  const [colleges,    setColleges]    = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const deptOptions = useMemo(() => {
    if (!collegeId) return [];
    return departments.filter(d => d.collegeId === collegeId);
  }, [collegeId, departments]);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldSuccess, setFieldSuccess] = useState<Record<string, boolean>>({});

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
  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-blue-400", "bg-green-400"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (!email.toLowerCase().endsWith("@haramaya.edu.et")) return "Must use haramaya.edu.et email";
    return null;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) return "Please enter a valid phone number";
    return null;
  };

  const validateName = (name: string) => {
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return null;
  };

  // Load colleges on mount
  useEffect(() => {
    fetch(`${API}/colleges`, {
      headers: { "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(res => { if (res.success) setColleges(res.data ?? []); })
      .catch(() => {});

    fetch(`${API}/departments`, {
      headers: { "Content-Type": "application/json" },
    })
      .then(r => r.json())
      .then(res => { if (res.success) setDepartments(res.data ?? []); })
      .catch(() => {});
  }, []);

  // Reset department when college changes
  useEffect(() => {
    setDepartmentId("");
  }, [collegeId]);

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

    if (!form.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const phoneError = validatePhone(form.phone);
      if (phoneError) errors.phone = phoneError;
      else success.phone = true;
    }

    if (!collegeId) errors.college = "Please select your college";
    if (!departmentId) errors.department = "Please select your department";
    if (!userType) errors.userType = "Please select your user type";

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

    if (!agreed) errors.agreed = "You must agree to the terms and conditions";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFieldSuccess(success);
      setError("Please fix the errors above to continue");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:    form.firstName.trim(),
          lastName:     form.lastName.trim(),
          email:        form.email.trim().toLowerCase(),
          phone:        form.phone.trim(),
          password:     form.password,
          userType,
          collegeId,
          departmentId,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Registration failed.");

      setSuccess(true);
      setTimeout(async () => {
        const token: string    = result.data.token;
        const roles: string[]  = result.data.user.roles ?? [];

        const { setToken } = await import("@/lib/auth");
        setToken(token, roles);

        // Use window.location.href to force full page reload and ensure cookies are committed
        setTimeout(() => {
          const REDIRECT: Record<string, string> = {
            ADMIN: "/admin/dashboard", DIRECTOR: "/director/dashboard",
            LAB_TECHNICIAN: "/lab-technician/dashboard", LECTURER: "/lecturer/dashboard",
            RESEARCHER: "/researcher/dashboard", STUDENT: "/student/dashboard",
          };
          const order   = ["ADMIN","DIRECTOR","LAB_TECHNICIAN","LECTURER","RESEARCHER","STUDENT"];
          const matched = order.find(r => roles.includes(r));
          window.location.href = matched ? REDIRECT[matched] : "/student/dashboard";
        }, 500);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pwMismatch = !!form.confirmPassword && form.confirmPassword !== form.password;

  const getInputClass = (field: string) => {
    if (fieldErrors[field]) return INPUT_ERROR;
    if (fieldSuccess[field]) return INPUT_SUCCESS;
    return INPUT;
  };

  return (
    <main className="min-h-screen px-4 py-10"
      style={{ background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #dbeafe 100%)" }}>

      <div className="mx-auto w-full max-w-lg">

        {/* Header */}
        <div className="mb-7 text-center">
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
              <h1 className="text-3xl font-bold text-gray-900">Create HULMS Account</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Haramaya University Laboratory Management System
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-xl shadow-blue-200/50">
          <div className="px-8 py-7">

            {/* Success Message */}
            {success && (
              <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Registration Successful!</p>
                    <p className="text-xs text-green-600">Redirecting to your dashboard...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !success && (
              <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Registration Error</p>
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Name Fields ── */}
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
                      placeholder="Abebe"
                      className={getInputClass("firstName")}
                      aria-invalid={!!fieldErrors.firstName}
                      aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
                    />
                    {fieldSuccess.firstName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
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
                      placeholder="Tadesse"
                      className={getInputClass("lastName")}
                      aria-invalid={!!fieldErrors.lastName}
                      aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                    />
                    {fieldSuccess.lastName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <FieldStatus status={fieldErrors.lastName ? "error" : fieldSuccess.lastName ? "success" : null} message={fieldErrors.lastName} />
                </div>
              </div>

              {/* ── Email ── */}
              <div>
                <Label text="Haramaya Email" required />
                <div className="relative">
                  <IconWrap><Mail className="h-4 w-4" /></IconWrap>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    required
                    placeholder="tesfaye@haramaya.edu.et"
                    className={getInputClass("email")}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  />
                  {fieldSuccess.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <FieldStatus status={fieldErrors.email ? "error" : fieldSuccess.email ? "success" : null} message={fieldErrors.email} />
                {!fieldErrors.email && !fieldSuccess.email && (
                  <p className="mt-1 text-xs text-gray-400">Must be a valid @haramaya.edu.et email</p>
                )}
              </div>

              {/* ── Phone ── */}
              <div>
                <Label text="Phone Number" required />
                <div className="relative">
                  <IconWrap><Phone className="h-4 w-4" /></IconWrap>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    required
                    placeholder="+251 911 000 000"
                    className={getInputClass("phone")}
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  />
                  {fieldSuccess.phone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <FieldStatus status={fieldErrors.phone ? "error" : fieldSuccess.phone ? "success" : null} message={fieldErrors.phone} />
              </div>

              {/* ── College & Department ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label text="College" required />
                  <SelectWrap>
                    <select
                      value={collegeId}
                      onChange={e => setCollegeId(e.target.value)}
                      required
                      className={fieldErrors.college ? INPUT_ERROR : SELECT}
                      aria-invalid={!!fieldErrors.college}
                    >
                      <option value="">Select College</option>
                      {colleges.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </SelectWrap>
                  <FieldStatus status={fieldErrors.college ? "error" : null} message={fieldErrors.college} />
                </div>
                <div>
                  <Label text="Department" required />
                  <SelectWrap>
                    <select
                      value={departmentId}
                      onChange={e => setDepartmentId(e.target.value)}
                      required
                      disabled={!collegeId}
                      className={`${fieldErrors.department ? INPUT_ERROR : SELECT} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                      aria-invalid={!!fieldErrors.department}
                    >
                      <option value="">
                        {collegeId ? "Select Department" : "Select a college first"}
                      </option>
                      {deptOptions.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </SelectWrap>
                  <FieldStatus status={fieldErrors.department ? "error" : null} message={fieldErrors.department} />
                </div>
              </div>

              {/* ── User Type ── */}
              <div>
                <Label text="User Type" required />
                <SelectWrap>
                  <select
                    value={userType}
                    onChange={e => setUserType(e.target.value as UserTypeValue)}
                    required
                    className={fieldErrors.userType ? INPUT_ERROR : SELECT}
                    aria-invalid={!!fieldErrors.userType}
                  >
                    {USER_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </SelectWrap>
                <FieldStatus status={fieldErrors.userType ? "error" : null} message={fieldErrors.userType} />
                <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  {USER_TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                      <div
                        key={t.value}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                          userType === t.value
                            ? "border-blue-300 bg-blue-50"
                            : "border-transparent hover:bg-gray-100"
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          userType === t.value ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${userType === t.value ? "text-blue-800" : "text-gray-700"}`}>
                            {t.label}
                          </p>
                          <p className="text-xs text-gray-500">{t.desc}</p>
                        </div>
                        {userType === t.value && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    );
                  })}
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
                    aria-describedby={fieldErrors.password ? "password-error" : "password-strength"}
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
                  <div id="password-strength" className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || "bg-gray-200"}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength <= 2 ? "text-red-500" : passwordStrength <= 3 ? "text-amber-500" : "text-green-600"
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

              {/* ── Confirm Password ── */}
              <div>
                <Label text="Confirm Password" required />
                <div className="relative">
                  <IconWrap><Lock className="h-4 w-4" /></IconWrap>
                  <input
                    type={showCPw ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    required
                    placeholder="Repeat your password"
                    className={getInputClass("confirmPassword") + " pr-10"}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
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
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 text-green-600">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <FieldStatus status={fieldErrors.confirmPassword ? "error" : fieldSuccess.confirmPassword ? "success" : null} message={fieldErrors.confirmPassword} />
              </div>

              {/* ── Terms ── */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition-all hover:bg-gray-100 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-400 focus:ring-offset-0"
                  aria-invalid={!!fieldErrors.agreed}
                />
                <span className="text-sm text-gray-600">
                  I agree to the{" "}
                  <span className="font-semibold text-blue-700">HULMS terms and conditions</span>
                  {" "}and the Haramaya University Laboratory Resource Use and Management Guidelines.
                </span>
              </label>
              <FieldStatus status={fieldErrors.agreed ? "error" : null} message={fieldErrors.agreed} />

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={submitting || success}
                className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #2d4fa1)" }}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Account Created!
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold transition hover:opacity-80" style={{ color: "#1e3a8a" }}>
                Login
              </Link>
            </p>

          </div>
        </div>
      </div>
    </main>
  );
}
