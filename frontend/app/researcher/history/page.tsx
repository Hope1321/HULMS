"use client";

import Link from "next/link";
import { FolderOpen, FileText, FlaskConical, Plus, ChevronRight, Clock } from "lucide-react";

/* Static research projects — in a real system this would come from an API */
const PROJECTS = [
  {
    id: "1",
    title: "Thesis: Water Quality Analysis",
    description: "Analysis of water samples from Haramaya Lake for chemical composition and safety.",
    status: "Ongoing",
    chemicals: ["Hydrochloric Acid", "Sodium Hydroxide", "Ethanol"],
    startDate: "15 Jan 2026",
    color: "bg-violet-100 text-violet-700",
    borderColor: "border-l-violet-500",
  },
  {
    id: "2",
    title: "Project: Organic Synthesis",
    description: "Synthesis of organic compounds for pharmaceutical research applications.",
    status: "Ongoing",
    chemicals: ["Methanol", "Acetone", "Benzene"],
    startDate: "10 Mar 2026",
    color: "bg-cyan-100 text-cyan-700",
    borderColor: "border-l-cyan-500",
  },
  {
    id: "3",
    title: "Study: Soil Chemical Composition",
    description: "Comprehensive study of soil samples from Haramaya University farm lands.",
    status: "Completed",
    chemicals: ["Sulfuric Acid", "Potassium Chloride"],
    startDate: "1 Aug 2025",
    endDate: "30 Dec 2025",
    color: "bg-green-100 text-green-700",
    borderColor: "border-l-green-500",
  },
];

export default function ResearcherHistoryPage() {
  const ongoing   = PROJECTS.filter(p => p.status === "Ongoing");
  const completed = PROJECTS.filter(p => p.status === "Completed");

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#7c3aed" }}>
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Research History</h1>
            <p className="text-sm text-gray-500">Your active and completed research projects</p>
          </div>
        </div>
        <Link href="/researcher/requests/create"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: "#7c3aed" }}>
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Projects",    value: PROJECTS.length, color: "text-gray-900"   },
          { label: "Active / Ongoing",  value: ongoing.length,  color: "text-violet-700" },
          { label: "Completed",         value: completed.length, color: "text-green-700" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      {ongoing.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Active Projects</h2>
          <div className="space-y-3">
            {ongoing.map(proj => (
              <div key={proj.id} className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${proj.borderColor}`}>
                <div className="px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                        <FileText className="h-5 w-5 text-violet-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{proj.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{proj.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Started: {proj.startDate}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {proj.chemicals.map(c => (
                            <span key={c} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                              <FlaskConical className="h-3 w-3 text-violet-500" /> {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${proj.color}`}>{proj.status}</span>
                      <Link href="/researcher/requests?status=APPROVED"
                        className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">
                        View requests <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Projects */}
      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Completed Projects</h2>
          <div className="space-y-3">
            {completed.map(proj => (
              <div key={proj.id} className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${proj.borderColor} opacity-80`}>
                <div className="px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
                        <FileText className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{proj.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{proj.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Started: {proj.startDate}</span>
                          {"endDate" in proj && <span className="flex items-center gap-1">Ended: {proj.endDate}</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {proj.chemicals.map(c => (
                            <span key={c} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                              <FlaskConical className="h-3 w-3 text-green-500" /> {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${proj.color}`}>{proj.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
