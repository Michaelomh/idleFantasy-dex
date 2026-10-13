import { useNavigate } from 'react-router';
import { FlaskConical } from 'lucide-react';
import { Banner } from './banner.tsx';
import { Button } from './ui/button.tsx';
import { clearExplore } from '@/lib/app/boot-state.ts';

export function ExploreBanner() {
  const navigate = useNavigate();

  function handleLoadSave() {
    clearExplore();
    navigate('/onboarding');
  }

  return (
    <Banner
      icon={<FlaskConical className="size-4 shrink-0 text-primary" />}
      title="You are exploring with a sample character."
      action={
        <Button variant="text" className="h-7" onClick={handleLoadSave}>
          Upload
        </Button>
      }
    />
  );
}
