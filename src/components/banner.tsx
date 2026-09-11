import type { ReactNode } from 'react';
import { cn } from 'cn';

export function Banner({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 border-b border-(--notice-border) bg-(--notice-bg) px-4 py-3 text-(--notice-text)',
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}
