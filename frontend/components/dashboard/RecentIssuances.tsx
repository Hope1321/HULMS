"use client";


import {DashboardIssuance} from "@/types/dashboard";

import Badge from "@/components/ui/Badge";

interface Props {
  issuances: DashboardIssuance[];
}

export default function RecentIssuances({
  issuances,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold text-gray-900">
          Recent Issuances
        </h2>

        <p className="text-xs text-gray-500">
          Recently issued chemicals
        </p>
      </div>

      <div className="divide-y">
        {issuances.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No recent issuances.
          </p>
        ) : (
          issuances.map((issuance) => (
            <div
              key={issuance.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {issuance.issuanceNumber}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {issuance.batch.chemical.name}
                </p>

                <p className="text-xs text-gray-500">
                  {issuance.issuedTo.firstName}{" "}
                  {issuance.issuedTo.lastName}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {issuance.quantity}{" "}
                  {issuance.batch.unit.symbol}
                </p>

                <div className="mt-1">
                  <Badge
                    status={issuance.status}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}