import { useNavigate } from 'react-router';
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
    <Banner>
      <span className="body flex-1 text-white">Currently exploring with a sample character.</span>
      <Button variant="text" className="h-7" onClick={handleLoadSave}>
        Upload
      </Button>
    </Banner>
  );
}
