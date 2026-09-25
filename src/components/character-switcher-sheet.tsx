import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from 'cn';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { computeAllCategories, rollUp } from '@/lib/progress';
import { getAllCachedSaves, type CachedSave } from '@/lib/save-source';
import { humanize } from '@/lib/utils/humanize';

export function CharacterSwitcherSheet({
  open,
  onOpenChange,
  currentIdentity,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIdentity: string | null;
  onSelect: (identity: string) => void;
}) {
  const [slots, setSlots] = useState<Record<string, CachedSave> | null>(null);
  const [completions, setCompletions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getAllCachedSaves().then((result) => {
      if (cancelled) return;
      setSlots(result);
      for (const [identity, save] of Object.entries(result)) {
        void computeAllCategories(save.playerState).then((categories) => {
          if (cancelled) return;
          setCompletions((prev) => ({ ...prev, [identity]: rollUp(categories) * 100 }));
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const identities = slots ? Object.keys(slots) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pt-4 pb-4">
        <div className="flex flex-col overflow-hidden">
          {identities.map((identity, index) => {
            const { playerState } = slots![identity];
            const selected = identity === currentIdentity;
            const completion = completions[identity];
            return (
              <div key={identity}>
                {index > 0 && <Separator />}
                <button
                  type="button"
                  onClick={() => onSelect(identity)}
                  className={cn(
                    'flex w-full items-center gap-3 p-4 text-left transition-colors',
                    selected && 'bg-primary/10',
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-primary">
                    {selected && <Check className="size-4" />}
                  </span>
                  <div className="flex-1">
                    <p className="h3">{playerState.character ?? identity}</p>
                    <p className="body text-text-secondary">{humanize(playerState.title)}</p>
                  </div>
                  <span className="data shrink-0 text-xl text-primary">
                    {completion != null ? `${completion.toFixed(1)}%` : '-'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
