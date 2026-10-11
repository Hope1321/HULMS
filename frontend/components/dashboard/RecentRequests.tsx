"use client";

import Link from "next/link";

export interface RequestItem {
  id: string;
  requestedQty: string;
  approvedQty: string | null;
  chemical: {
    id: string;
    name: string;
    hazardLevel: string;
  };
  unit: {
    id: string;
    name: string;
    symbol: string;
  };
}

export interface RecentRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requiredDate: string | null;
  status: string;
  createdAt: string;
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: RequestItem[];
}

interface RecentRequestsProps {
  requests: RecentRequest[];
}

const statusStyles: Record<string, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",

  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",

  REJECTED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const formatDate = (date: string | null) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function RecentRequests({
  requests,
}: RecentRequestsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Requests
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Latest chemical requests
          </p>
        </div>

        <Link
          href="/admin/dashboard/requests"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          View All
        </Link>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        {requests.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recent requests found.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-175">
            <thead>
              <tr className="border-b border-gray-200 text-left dark:border-gray-800">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Request
                </th>

                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Requester
                </th>

                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Chemical
                </th>

                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Required Date
                </th>

                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => {
                const firstItem = request.items?.[0];

                return (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                  >
                    {/* Request */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/dashboard/requests/${request.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {request.requestNumber}
                      </Link>

                      <p className="mt-1 max-w-55 truncate text-xs text-gray-500">
                        {request.purpose}
                      </p>
                    </td>

                    {/* Requester */}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.requestedBy.firstName}{" "}
                        {request.requestedBy.lastName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {request.requestedBy.email}
                      </p>
                    </td>

                    {/* Chemical */}
                    <td className="px-6 py-4">
                      {firstItem ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {firstItem.chemical.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {firstItem.requestedQty}{" "}
                            {firstItem.unit.symbol}
                          </p>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No item
                        </span>
                      )}
                    </td>

                    {/* Required Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(request.requiredDate)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[request.status] ||
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}