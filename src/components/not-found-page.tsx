import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button.tsx';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="mb-4 size-24" />
      <h1 className="h1">Page not found</h1>
      <p className="body text-text-secondary">That page doesn't exist.</p>
      <Button variant="primary" onClick={() => navigate('/')}>
        Go home
      </Button>
    </div>
  );
}
