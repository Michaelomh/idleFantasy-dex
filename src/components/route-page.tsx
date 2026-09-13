import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button.tsx';
import { getChildren, matchRoute } from '@/lib/app/routes.ts';

export function RoutePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const children = match ? getChildren(match.path) : [];

  return (
    <div className="flex flex-col gap-2 p-4">
      <h1 className="h1">{match?.title ?? 'Not Found'}</h1>
      {children.map((child) => (
        <Button key={child.path} variant="secondary" onClick={() => navigate(child.path)}>
          {child.title}
        </Button>
      ))}
    </div>
  );
}
