import { TriangleAlert } from 'lucide-react';

type WipNoticeProps = {
  message?: string;
};

const DEFAULT_MESSAGE = "This feature isn't finished yet — data shown here may be inaccurate or buggy.";

export function WipNotice({ message = DEFAULT_MESSAGE }: WipNoticeProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="body text-destructive">{message}</p>
    </div>
  );
}
