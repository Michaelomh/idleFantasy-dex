import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button.tsx';
import { getChildren, isRouteDisabled, matchRoute } from '@/lib/app/routes.ts';
import { notifyComingSoon } from '@/lib/app/notify-coming-soon.ts';

export function RoutePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const children = match ? getChildren(match.path) : [];

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="h1">{match?.title ?? 'Not Found'}</h1>
      {children.map((child) => {
        const disabled = isRouteDisabled(child.path);
        return (
          <Button
            key={child.path}
            variant="secondary"
            className={disabled ? 'opacity-50' : undefined}
            onClick={() => (disabled ? notifyComingSoon() : navigate(child.path))}
          >
            {child.title}
          </Button>
        );
      })}
    </div>
  );
}
