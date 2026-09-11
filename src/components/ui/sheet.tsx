import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { motion, useAnimationControls, type PanInfo } from 'motion/react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

const DRAG_CLOSE_OFFSET = 120;
const DRAG_CLOSE_VELOCITY = 500;

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(6,7,8,0.66)] backdrop-blur-[1px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const dragControls = useAnimationControls();

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const shouldClose = info.offset.y > DRAG_CLOSE_OFFSET || info.velocity.y > DRAG_CLOSE_VELOCITY;
    if (shouldClose) {
      closeRef.current?.click();
    } else {
      dragControls.start({ y: 0 });
    }
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        render={
          side === 'bottom' ? (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              dragMomentum={false}
              animate={dragControls}
              onDragEnd={handleDragEnd}
            />
          ) : undefined
        }
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-border bg-(--bg-overlay) bg-clip-padding text-sm text-foreground shadow-lg backdrop-blur-xl transition duration-(--dur-sheet) ease-(--ease-sheet) data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:rounded-t-sheet data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:-translate-x-10 data-[side=left]:data-starting-style:-translate-x-10 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10 data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
          className,
        )}
        {...props}
      >
        {side === 'bottom' && (
          <div className="mx-auto mt-2 h-1 w-9.5 shrink-0 touch-none rounded-full bg-border" aria-hidden />
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
        <SheetPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden />
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('h2', className)} {...props} />;
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn('body', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
