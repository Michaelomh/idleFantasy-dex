import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * A tappable list row that can hold its own buttons (badge popovers) without nesting them in the
 * row's button. The name is the real button; its overlay (`after:inset-0`) stretches the tap area
 * over the whole row, and [children] sit above it so they stay separately clickable.
 */
export function ListRow({ name, onSelect, children }: { name: string; onSelect: () => void; children?: ReactNode }) {
  return (
    <div className="relative flex items-center gap-1.5 p-4 active:bg-accent/40">
      <button
        type="button"
        onClick={onSelect}
        className="truncate text-left text-base after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
      >
        {name}
      </button>
      {/* Click-through except for its own buttons, so empty space still opens the row. */}
      <span className="pointer-events-none relative z-10 flex flex-1 items-center gap-1.5 [&_button]:pointer-events-auto">
        {children}
      </span>
      <span className="flex w-5 shrink-0 justify-center">
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </span>
    </div>
  );
}
