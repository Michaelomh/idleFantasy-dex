import type { ReactNode } from 'react';
import { cn } from 'cn';

export type BannerTone = 'notice' | 'aging' | 'stale';

const TONE_STYLES: Record<BannerTone, string> = {
  notice: 'border-notice-border bg-notice-bg text-notice-text',
  aging: 'border-aging/40 bg-card text-foreground',
  stale: 'border-stale/40 bg-card text-foreground',
};

export function Banner({
  tone = 'notice',
  icon,
  title,
  description,
  action,
  className,
}: {
  tone?: BannerTone;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-4 my-4 flex items-center gap-3 rounded-card border p-4', TONE_STYLES[tone], className)}>
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="body font-bold text-white">{title}</span>
        {description && <span className="body text-text-secondary">{description}</span>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
