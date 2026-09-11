import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, RefreshCw, Settings } from 'lucide-react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function TopStatusBar({
  characterName,
  hasMultipleSlots,
  onCharacterClick,
  freshness,
  manualUploadOnly,
  onLoad,
  onRefresh,
  onSettings,
  className,
}: {
  characterName: string;
  hasMultipleSlots?: boolean;
  onCharacterClick?: () => void;
  freshness?: ReactNode;
  manualUploadOnly?: boolean;
  onLoad?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-2.5 border-b border-(--border-hairline) bg-(--bg-overlay) px-4 backdrop-blur-md',
        className,
      )}
      style={{ height: 'var(--statusbar-height)' }}
    >
      <button
        type="button"
        onClick={hasMultipleSlots ? onCharacterClick : undefined}
        disabled={!hasMultipleSlots}
        className="button-label flex items-center gap-1 disabled:cursor-default"
      >
        {characterName}
        {hasMultipleSlots && <ChevronDown className="size-3" />}
      </button>

      <div className="flex flex-1 items-center justify-end gap-2.5">
        {freshness}
        {manualUploadOnly ? (
          <Button variant="text" onClick={onLoad}>
            ＋ LOAD
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" className='border border-(--border-hairline)' onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" className='border border-(--border-hairline)' onClick={onSettings} aria-label="Settings">
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function GoalDetailHeader({
  goalName,
  current,
  total,
  onBack,
  className,
}: {
  goalName: string;
  current: number;
  total: number;
  onBack?: () => void;
  className?: string;
}) {
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div
      className={cn(
        'sticky top-0 z-10 border-b border-(--border-hairline) bg-(--bg-overlay) px-4 pt-3 pb-3.5 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label="Back">
          <ChevronLeft className="size-4.5" />
        </button>
        <span className="h2">{goalName}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="data text-[13px] text-(--text-secondary)">
          {current} / {total}
        </span>
        <Progress value={percent} max={100} className="flex-1" trackClassName="h-1" />
        <span
          className="text-(--text-primary)"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700 }}
        >
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}
