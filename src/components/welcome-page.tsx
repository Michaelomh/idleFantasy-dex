import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 pt-4 text-center">
      <div className="flex flex-col items-center gap-2 pt-32">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="size-20" />
        <h1 className="h1">IdleFantasy-Dex</h1>
        <p className="body text-text-secondary">Dashboard for tracking your IdleFantasy progress.</p>
      </div>

      <div className="rounded-card border border-notice-border bg-notice-bg p-4 text-left text-notice-text">
        <p className="body text-center font-bold text-primary">Notes</p>
        <ul className="body mt-1 list-disc space-y-1 pl-4">
          <li>This version is currently in Beta so expect some bugs.</li>
          <li>Numbers may be inaccurate and some features may break.</li>
          <li>The dashboard is hand-maintained against the game's data and can lag behind after a game update.</li>
        </ul>
      </div>

      <div className="w-full pb-4">
        <Button variant="primary" className="w-full" onClick={() => navigate('/onboarding')}>
          Let's get started <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
