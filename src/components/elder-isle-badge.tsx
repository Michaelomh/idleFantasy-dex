import { Waves } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useIncludeElderIsle } from '@/lib/hooks/use-include-elder-isle';

export function ElderIsleBadge({ label = 'Elder Isle' }: { label?: string }) {
  const [includeElderIsle] = useIncludeElderIsle();
  if (!includeElderIsle) return null;

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex shrink-0 cursor-pointer text-text-secondary"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <Waves className="size-4" />
      </PopoverTrigger>
      <PopoverContent>{label}</PopoverContent>
    </Popover>
  );
}
