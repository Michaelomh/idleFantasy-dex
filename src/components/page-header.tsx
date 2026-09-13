import { ChevronLeft } from 'lucide-react';
import { cn } from 'cn';

export function PageHeader({
  title,
  showBack,
  onBack,
  className,
}: {
  title: string;
  showBack: boolean;
  onBack: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-(--bg-overlay) px-4 py-3 backdrop-blur-md',
        className,
      )}
    >
      {showBack && (
        <button type="button" onClick={onBack} aria-label="Back">
          <ChevronLeft className="size-4.5" />
        </button>
      )}
      <span className="h2">{title}</span>
    </div>
  );
}
