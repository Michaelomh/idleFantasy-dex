import type { ReactNode } from 'react';
import { cn } from 'cn';

export type BadgeVariant = 'kill-tracking' | 'item-tracking' | 'version-unknown';

const BADGE_LABEL: Record<BadgeVariant, string> = {
  'kill-tracking': 'SAVE PREDATES KILL TRACKING',
  'item-tracking': 'SAVE PREDATES ITEM TRACKING',
  'version-unknown': 'SAVE VERSION UNKNOWN',
};

export function Badge({
  variant,
  children,
  onClick,
  className,
}: {
  variant: BadgeVariant;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'label inline-flex w-fit items-center rounded-md border border-(--aging) px-2 py-1 text-(--aging)',
        className,
      )}
    >
      {children ?? BADGE_LABEL[variant]}
    </Tag>
  );
}
