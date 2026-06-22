type BadgeVariant = "content_status" | "review_status" | "live" | "role";

interface CasePrepStatusBadgeProps {
  value: string;
  variant: BadgeVariant;
}

function contentStatusStyle(value: string): string {
  switch (value) {
    case "certified":
      return "bg-green-100 text-green-800 border border-green-200";
    case "partial":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "missing":
      return "bg-red-100 text-red-800 border border-red-200";
    case "draft":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
}

function reviewStatusStyle(value: string): string {
  switch (value) {
    case "approved":
      return "bg-green-100 text-green-800 border border-green-200";
    case "needs_review":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "in_review":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    case "changes_requested":
      return "bg-red-100 text-red-800 border border-red-200";
    case "not_started":
      return "bg-gray-100 text-gray-500 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
}

function roleStyle(): string {
  return "bg-indigo-100 text-indigo-800 border border-indigo-200";
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CasePrepStatusBadge({ value, variant }: CasePrepStatusBadgeProps) {
  let cls = "";
  if (variant === "content_status") cls = contentStatusStyle(value);
  else if (variant === "review_status") cls = reviewStatusStyle(value);
  else if (variant === "live") cls = "bg-teal-100 text-teal-800 border border-teal-200";
  else if (variant === "role") cls = roleStyle();
  else cls = "bg-gray-100 text-gray-700 border border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {formatLabel(value)}
    </span>
  );
}
