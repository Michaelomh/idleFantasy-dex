import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

/** Drilled-down simulator page header: back button and name, with an optional badge on the right. */
export function SimulatorHeader({
  title,
  backLabel,
  backPath,
  badge,
}: {
  title: string;
  /** Read out for the back button, e.g. "Back to bosses". */
  backLabel: string;
  backPath: string;
  badge?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        aria-label={backLabel}
        className="-ml-1 inline-flex shrink-0 text-text-secondary"
      >
        <ChevronLeft className="size-6" />
      </button>
      <h1 className="h1 min-w-0 flex-1">{title}</h1>
      {badge && (
        <span className="label shrink-0 rounded-full border border-border px-2 py-0.5 text-text-secondary">
          {badge}
        </span>
      )}
    </div>
  );
}
