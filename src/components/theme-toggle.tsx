import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useResolvedTheme, useTheme } from '@/lib/app/theme';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const resolved = useResolvedTheme(theme);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
