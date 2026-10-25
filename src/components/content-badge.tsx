import { SunSnow, Waves } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';

type ContentVariant = 'elder-isle' | 'seasonal';

const VARIANTS: Record<ContentVariant, { icon: typeof Waves; defaultLabel: string }> = {
  'elder-isle': { icon: Waves, defaultLabel: 'Elder Isle' },
  seasonal: { icon: SunSnow, defaultLabel: 'Seasonal Event' },
};

/** Marks where a piece of content comes from (Elder Isle, a seasonal event). */
export function ContentBadge({ variant, label }: { variant: ContentVariant; label?: string }) {
  const [includeElderIsle] = useIncludeElderIsle();
  if (variant === 'elder-isle' && !includeElderIsle) return null;

  const { icon: Icon, defaultLabel } = VARIANTS[variant];
  const content = label ?? defaultLabel;

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex shrink-0 cursor-pointer text-text-secondary"
        aria-label={content}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className="size-4" />
      </PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}
