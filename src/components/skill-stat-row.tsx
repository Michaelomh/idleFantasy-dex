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
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <img src={icon} alt="" className={cn('size-4 shrink-0', iconClassName)} />}
        <div className="flex min-w-0 flex-col">
          <span className="body">{label}</span>
          {description && <span className="description text-text-secondary">{description}</span>}
        </div>
      </div>
      {right}
    </div>
  );
}
