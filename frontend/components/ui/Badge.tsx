interface BadgeProps {
  status: string;
}

export default function Badge({
  status,
}: BadgeProps) {
  const styles: Record<string, string> = {
    APPROVED:
      "bg-green-100 text-green-700",

    PENDING:
      "bg-yellow-100 text-yellow-700",

    REJECTED:
      "bg-red-100 text-red-700",

    ISSUED:
      "bg-blue-100 text-blue-700",

    AVAILABLE:
      "bg-green-100 text-green-700",

    LOW_STOCK:
      "bg-orange-100 text-orange-700",

    ACTIVE:
      "bg-green-100 text-green-700",

    RESOLVED:
      "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ??
        "bg-gray-100 text-gray-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}