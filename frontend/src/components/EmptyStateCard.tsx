import { Link } from "react-router-dom";

export function EmptyStateCard({
  title,
  hint,
  actionLabel,
  actionTo,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="app-card p-5">
      <p className="font-medium text-gray-900">{title}</p>
      {hint && <p className="text-sm text-gray-600 mt-1">{hint}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="inline-block mt-3 text-sm text-indigo-600 hover:underline">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

