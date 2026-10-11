"use client";

import Link from "next/link";

interface Chemical {
  id: string;
  name: string;
  hazardLevel: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  quantity: string;
  minimumStock: string;
  expiryDate: string | null;
  status: string;
}

interface Alert {
  id: string;
  type: string;
  status: string;
  title: string;
  message?: string | null;
  chemicalId?: string | null;
  batchId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  chemical?: Chemical | null;
  batch?: Batch | null;
}

interface RecentAlertsProps {
  alerts?: Alert[];
}

const getAlertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "LOW_STOCK":
      return "📦";

    case "EXPIRING_CHEMICAL":
      return "⏳";

    case "EXPIRED_CHEMICAL":
      return "⚠️";

    case "HIGH_HAZARD":
      return "☣️";

    default:
      return "🔔";
  }
};

const getAlertStyle = (type: Alert["type"]) => {
  switch (type) {
    case "LOW_STOCK":
      return "bg-orange-50 text-orange-600 border-orange-200";

    case "EXPIRING_CHEMICAL":
      return "bg-yellow-50 text-yellow-600 border-yellow-200";

    case "EXPIRED_CHEMICAL":
      return "bg-red-50 text-red-600 border-red-200";

    case "HIGH_HAZARD":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RecentAlerts({
  alerts = [],
}: RecentAlertsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Alerts
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Chemical inventory and safety alerts
          </p>
        </div>

        <Link
          href="/admin/dashboard/alerts"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-800"
        >
          View All
        </Link>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {alerts.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mb-3 text-4xl">✅</div>

            <h3 className="text-sm font-semibold text-gray-900">
              No recent alerts
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              There are currently no active chemical alerts.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-4 px-6 py-4 transition hover:bg-gray-50"
            >
              {/* Icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg ${getAlertStyle(
                  alert.type
                )}`}
              >
                {getAlertIcon(alert.type)}
              </div>

              {/* Alert information */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {alert.title}
                    </h3>

                    {alert.message && (
                      <p className="mt-1 text-sm text-gray-600">
                        {alert.message}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                      alert.status === "ACTIVE"
                        ? "bg-red-100 text-red-700"
                        : alert.status === "ACKNOWLEDGED"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>

                {/* Extra information */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                  {alert.chemical && (
                    <span>
                      Chemical:{" "}
                      <span className="font-medium text-gray-700">
                        {alert.chemical.name}
                      </span>
                    </span>
                  )}

                  {alert.batch && (
                    <span>
                      Batch:{" "}
                      <span className="font-medium text-gray-700">
                        {alert.batch.batchNumber}
                      </span>
                    </span>
                  )}

                  <span>{formatDate(alert.createdAt)}</span>
                </div>

                {/* Low stock details */}
                {alert.type === "LOW_STOCK" && alert.batch && (
                  <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                    Current stock:{" "}
                    <strong>{alert.batch.quantity}</strong>{" "}
                    {alert.chemical?.name || "chemical"} — Minimum stock:{" "}
                    <strong>{alert.batch.minimumStock}</strong>
                  </div>
                )}

                {/* High hazard details */}
                {alert.type === "HIGH_HAZARD" &&
                  alert.chemical && (
                    <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      Hazard level:{" "}
                      <strong>{alert.chemical.hazardLevel}</strong>
                    </div>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}