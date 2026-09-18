import { CircleAlert, Info, OctagonX, ShieldAlert } from 'lucide-react';
import { cn } from 'cn';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

type StatusVariant = 'wip' | 'unvalidated' | 'unconfident' | 'info';

export const WIP_MESSAGE =
  'Work in progress. Feature is not ready, might contain bugs, unvalidated or all of the above.';

const VARIANTS: Record<StatusVariant, { icon: typeof Info; color: string; defaultMessage?: string }> = {
  wip: {
    icon: OctagonX,
    color: 'text-destructive',
    defaultMessage: WIP_MESSAGE,
  },
  unvalidated: {
    icon: ShieldAlert,
    color: 'text-primary',
    defaultMessage: "This is complete, but hasn't been fully validated against real data yet.",
  },
  unconfident: {
    icon: CircleAlert,
    color: 'text-neutral-invert',
    defaultMessage: 'This has been validated, but confidence is low — may be incorrect.',
  },
  info: {
    icon: Info,
    color: 'text-text-secondary',
  },
};

type StatusNoticeProps = {
  variant: StatusVariant;
  message?: string;
  className?: string;
};

export function StatusNotice({ variant, message, className }: StatusNoticeProps) {
  const { icon: Icon, color, defaultMessage } = VARIANTS[variant];
  const content = message ?? defaultMessage;

  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex shrink-0 cursor-pointer', color)}
        aria-label={variant}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className={cn('size-4', className)} />
      </PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}
