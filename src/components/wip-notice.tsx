import { OctagonX } from 'lucide-react';

type WipNoticeProps = {
  message?: string;
};

export const WIP_MESSAGE = 'This feature may be incomplete, inaccurate, or not yet validated.';

export function WipNotice({ message = WIP_MESSAGE }: WipNoticeProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <OctagonX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label={message} />
      <p className="body text-destructive">{message}</p>
    </div>
  );
}
