import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const buttonVariants = cva(
  "button-label group/button inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-button border border-transparent bg-clip-padding px-4 transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-border bg-transparent text-foreground hover:bg-card',
        text: 'bg-transparent px-2 text-primary hover:opacity-80',
        destructive: 'bg-transparent px-2 text-destructive hover:opacity-80',
        ghost: 'bg-transparent text-foreground hover:bg-card',
      },
      size: {
        sm: 'h-8 px-3',
        default: '',
        lg: 'h-14 px-6',
        icon: 'size-12 px-0',
        'icon-sm': 'size-8 rounded-full px-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
