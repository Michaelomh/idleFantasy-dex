import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from 'cn';

export type FloatingNavItem = {
  label: string;
  icon: ReactNode;
};

export function FloatingNavBar({
  items,
  activeIndex,
  onChange,
  className,
}: {
  items: FloatingNavItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      const btn = itemRefs.current[activeIndex];
      const container = containerRef.current;
      if (!btn || !container) return;
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setIndicator({ width: btnRect.width, left: btnRect.left - containerRect.left });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeIndex, items.length]);

  return (
    <div className={cn('fixed bottom-4 left-1/2 z-40 -translate-x-1/2', className)}>
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 rounded-full border border-(--border-hairline) bg-(--bg-overlay) p-1 shadow-lg backdrop-blur-md"
      >
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              onClick={() => onChange(index)}
              className="relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5"
            >
              <span className={cn('relative z-10', active ? 'text-(--accent)' : 'text-(--text-muted)')}>
                {item.icon}
              </span>
              <span className={cn('label relative z-10', active ? 'text-(--accent)' : 'text-(--text-muted)')}>
                {item.label}
              </span>
            </button>
          );
        })}

        <motion.div
          animate={indicator}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-1 bottom-1 rounded-full"
          style={{ background: 'var(--accent-track)' }}
        />
      </div>
    </div>
  );
}
