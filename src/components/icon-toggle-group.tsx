import { cn } from 'cn';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { LucideIcon } from 'lucide-react';

export type IconToggleOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

export function IconToggleGroup<T extends string>({
  value,
  onValueChange,
  options,
  showLabel = 'always',
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: IconToggleOption<T>[];
  showLabel?: 'never' | 'selected' | 'always';
  className?: string;
}) {
  const iconOnly = showLabel === 'never';

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const next = values[0] as T | undefined;
        if (next) onValueChange(next);
      }}
      className={cn('gap-1 rounded-full border border-border bg-bg-overlay p-1', className)}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = optionValue === value;
        const showText = showLabel === 'always' || (showLabel === 'selected' && selected);
        return (
          <ToggleGroupItem
            key={optionValue}
            value={optionValue}
            size="sm"
            aria-label={label}
            className={cn(
              'rounded-full text-text-secondary data-pressed:bg-primary data-pressed:text-primary-foreground',
              iconOnly ? 'size-8' : 'h-8 gap-1.5 px-3 font-bold',
            )}
          >
            <Icon className={iconOnly ? 'size-4' : 'size-3.5'} />
            {showText && label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
