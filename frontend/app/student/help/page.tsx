"use client";

import Link from "next/link";
import {
  HelpCircle, ClipboardList, FlaskConical, Bell,
  User, Send, ShieldCheck, Mail, BookOpen,
  ChevronDown, ChevronRight, CheckCircle2,
} from "lucide-react";
import { useState } from "react";

/* ── FAQ data ────────────────────────────────────────────────────────────── */
const FAQS = [
  {
    question: "How do I submit a chemical request?",
    answer: "Go to My Requests → Create Request. Fill in the purpose, required date, and add the chemicals you need with quantities. Click Submit to send your request for approval.",
  },
  {
    question: "How long does approval take?",
    answer: "Approval time depends on the laboratory administrator. You will receive a notification once your request is reviewed. Standard turnaround is within 1–3 working days.",
  },
  {
    question: "Can I cancel my request?",
    answer: "Yes — you can cancel a request while it is still in PENDING status. Open the request from My Requests, scroll to the bottom, and click Cancel Request.",
  },
  {
    question: "What does 'Issued' status mean?",
    answer: "Issued means your approved request has had chemicals physically issued to you from the laboratory store. You can view the full issuance details under Issued Chemicals.",
  },
  {
    question: "Where do I see the chemicals issued to me?",
    answer: "Go to Issued Chemicals in the sidebar. All chemical issuances assigned to you are listed there with batch details, quantities, and issuance date.",
  },
  {
    question: "How do I update my profile or change my password?",
    answer: "Go to Profile in the sidebar. You can edit your first name, last name, and phone number there. Switch to the Change Password tab to update your password.",
  },
  {
    question: "Why is my request rejected?",
    answer: "Requests may be rejected due to unavailable chemicals, insufficient stock, incorrect quantities, or missing safety compliance. The reviewer will provide a reason in the Review History section of your request.",
  },
  {
    question: "I forgot my password. What should I do?",
    answer: "Contact the University Laboratory Management Office (ULMO) to reset your password. Send an email to ulmo@haramaya.edu.et with your registered email address.",
  },
];

/* ── Quick links ─────────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  { icon: ClipboardList, label: "My Requests",     href: "/student/requests",       color: "bg-blue-50 text-blue-700"    },
  { icon: ClipboardList, label: "Create Request",  href: "/student/requests/create",color: "bg-green-50 text-green-700"  },
  { icon: FlaskConical,  label: "Issued Chemicals",href: "/student/issuances",       color: "bg-purple-50 text-purple-700"},
  { icon: Bell,          label: "Notifications",   href: "/student/notifications",   color: "bg-rose-50 text-rose-700"    },
  { icon: User,          label: "My Profile",      href: "/student/profile",         color: "bg-amber-50 text-amber-700"  },
  { icon: Send,          label: "View Approved",   href: "/student/requests?status=APPROVED", color: "bg-teal-50 text-teal-700" },
];

/* ── Workflow steps ──────────────────────────────────────────────────────── */
const STEPS = [
  { step: "1", title: "Create a Request",    desc: "Go to Create Request and fill in the purpose, chemicals needed, and required date.",                    icon: ClipboardList },
  { step: "2", title: "Wait for Review",     desc: "Your request is sent to the lab admin for review. You will be notified when a decision is made.",       icon: ShieldCheck   },
  { step: "3", title: "Approval",            desc: "If approved, the admin sets the approved quantities per chemical. You receive an approval notification.", icon: CheckCircle2  },
  { step: "4", title: "Chemicals Issued",    desc: "The lab storekeeper issues the chemicals from the central store. Check Issued Chemicals to track this.", icon: FlaskConical  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-xl border transition-all ${open ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-white"}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0 text-green-700" />
          : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-green-100 px-5 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-gray-600">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function StudentHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-900">
          <HelpCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-sm text-gray-500">Everything you need to use HULMS as a student</p>
        </div>
      </div>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(({ icon: Icon, label, href, color }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-gray-800">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">How the Request Process Works</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {STEPS.map(({ step, title, desc, icon: Icon }, i) => (
            <div key={step} className={`flex items-start gap-4 px-5 py-5 ${i < STEPS.length - 1 ? "border-b border-gray-100" : ""}`}>
              {/* Step number + line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-900 text-xs font-bold text-white">
                  {step}
                </div>
                {i < STEPS.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" style={{ height: "24px" }} />}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-green-700" />
                  <p className="font-semibold text-gray-900">{title}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map(f => (
            <FAQItem key={f.question} q={f.question} a={f.answer} />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Still Need Help?</h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100">
              <Mail className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Contact ULMO</p>
              <p className="mt-1 text-sm text-gray-600">
                For issues not covered here, contact the University Laboratory Management Office directly.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href="mailto:ulmo@haramaya.edu.et"
                  className="inline-flex items-center gap-2 rounded-xl bg-green-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800">
                  <Mail className="h-4 w-4" /> ulmo@haramaya.edu.et
                </a>
                <Link href="/student/notifications"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                  <Bell className="h-4 w-4" /> View Notifications
                </Link>
              </div>
            </div>
          </div>

          {/* HULMS guideline reference */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-xs leading-relaxed text-blue-700">
              <strong>Reference:</strong> Haramaya University Laboratory Resource Use and Management Guidelines (March 2015) —
              all laboratory use, chemical requests, safety rules, and issuance procedures follow the guidelines published by ULMO.
              Only authorized individuals are permitted in specific university laboratories.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
