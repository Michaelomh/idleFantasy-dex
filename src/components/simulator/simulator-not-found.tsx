import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

export function SimulatorNotFound({
  title,
  backLabel,
  backPath,
}: {
  title: string;
  backLabel: string;
  backPath: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <h1 className="h1">{title}</h1>
      <Button variant="secondary" onClick={() => navigate(backPath)}>
        {backLabel}
      </Button>
    </div>
  );
}
