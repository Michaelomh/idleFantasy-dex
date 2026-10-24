import { cn } from 'cn';
import { parseQty } from '@/lib/utils/parse-qty';
import { Input } from '@/components/ui/input';

/** Number field that keeps what was typed; empty or out-of-range text shows the error border. */
export function QtyInput({
  value,
  onChange,
  min = 1,
  max,
  className,
  ...props
}: {
  value: string;
  onChange: (text: string) => void;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
  'aria-label'?: string;
}) {
  const valid = parseQty(value, min, max) !== null;
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value}
      aria-invalid={!valid}
      onChange={(e) => onChange(e.target.value)}
      className={cn('w-24', !valid && 'border-destructive', className)}
      {...props}
    />
  );
}
