"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskRound, Pencil, MapPin, Users, Building2, Calendar, BookOpen } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Department { id: string; name: string; code: string; college: { id: string; name: string; code: string; } | null; }
interface UserRecord {
  id: string; firstName: string; lastName: string; email: string; status: string;
  roles: { role: { name: string } }[];
}
interface Laboratory {
  id: string; name: string; code: string; location: string | null;
  description: string | null; departmentId: string;
  createdAt: string; updatedAt: string;
  department: Department;
  users: UserRecord[];
  _count?: { users: number };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN:          "bg-red-100 text-red-700",
  DIRECTOR:       "bg-purple-100 text-purple-700",
  LAB_TECHNICIAN: "bg-blue-100 text-blue-700",
  LECTURER:       "bg-emerald-100 text-emerald-700",
  RESEARCHER:     "bg-violet-100 text-violet-700",
  STUDENT:        "bg-amber-100 text-amber-700",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700",
  PENDING:   "bg-amber-100 text-amber-700",
  SUSPENDED: "bg-red-100 text-red-700",
  INACTIVE:  "bg-gray-100 text-gray-500",
};

const fmtFull = (d: string) =>
  new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{value ?? <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

export default function LaboratoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [lab,     setLab]     = useState<Laboratory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/laboratories/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.message || "Not found.");
        setLab(res.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
    </div>
  );

  if (error || !lab) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-700">{error || "Laboratory not found."}</p>
      <Link href="/admin/dashboard/laboratories" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Laboratories
      </Link>
    </div>
  );

  const userCount = lab._count?.users ?? lab.users.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin/dashboard/laboratories" className="text-sm font-medium text-teal-600 hover:text-teal-700">
            ← Back to Laboratories
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100">
              <FlaskRound className="h-6 w-6 text-teal-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lab.name}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{lab.department?.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-teal-200 bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">
            {lab.code}
          </span>
          <Link href={`/admin/dashboard/laboratories/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { icon: Users,    label: "Total Users",   value: userCount,                             color: "bg-teal-50 text-teal-700"   },
          { icon: Building2,label: "Department",    value: lab.department?.name ?? "—",            color: "bg-blue-50 text-blue-700"   },
          { icon: BookOpen, label: "College",       value: lab.department?.college?.name ?? "—",   color: "bg-violet-50 text-violet-700" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-3 truncate text-sm font-bold text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-5">
          <h2 className="font-semibold text-gray-900">Laboratory Information</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Name"        value={lab.name} />
            <Field label="Code"        value={
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-700">{lab.code}</span>
            } />
            <Field label="Department"  value={lab.department?.name} />
            <Field label="College"     value={lab.department?.college?.name} />
            <Field label="Location"    value={lab.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {lab.location}
              </span>
            )} />
            <Field label="Created"     value={fmtFull(lab.createdAt)} />
            <Field label="Last Updated" value={fmtFull(lab.updatedAt)} />
            {lab.description && (
              <div className="sm:col-span-2">
                <Field label="Description" value={lab.description} />
              </div>
            )}
          </div>
        </div>

        {/* Dept / College side card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Affiliation</h2>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Department</p>
                <p className="mt-0.5 font-medium text-gray-800">{lab.department?.name ?? "—"}</p>
                {lab.department?.code && (
                  <p className="text-xs text-gray-500">Code: {lab.department.code}</p>
                )}
              </div>
              {lab.department?.college && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">College</p>
                  <p className="mt-0.5 font-medium text-gray-800">{lab.department.college.name}</p>
                  <p className="text-xs text-gray-500">Code: {lab.department.college.code}</p>
                </div>
              )}
            </div>
          </div>

          {lab.location && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Location</h2>
              </div>
              <p className="mt-3 text-sm text-gray-700">{lab.location}</p>
            </div>
          )}
        </div>
      </div>

      {/* Users table */}
      {lab.users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Assigned Users</h2>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {lab.users.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["User", "Email", "Roles", "Status"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lab.users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(r => (
                          <span key={r.role.name} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.role.name] ?? "bg-gray-100 text-gray-600"}`}>
                            {r.role.name.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
