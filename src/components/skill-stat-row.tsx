import type { ReactNode } from 'react';
import { cn } from 'cn';

type SkillStatRowProps = {
  icon?: string;
  iconClassName?: string;
  label: string;
  description?: string | null;
  onClick?: () => void;
  right?: ReactNode;
};

export function SkillStatRow({ icon, iconClassName, label, description, onClick, right }: SkillStatRowProps) {
  const Row = onClick ? 'button' : 'div';
  return (
    <Row
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-4 text-left',
        onClick && 'cursor-pointer active:bg-accent/40',
      )}
    >
      {icon && <img src={icon} alt="" className={cn('size-4 shrink-0', iconClassName)} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base leading-tight">{label}</span>
        {description && <span className="description text-text-secondary">{description}</span>}
      </span>
      {right && <span className="flex w-5 shrink-0 justify-center">{right}</span>}
    </Row>
  );
}
