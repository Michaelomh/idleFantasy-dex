import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Calculator, House, Settings, Swords, TrendingUp } from 'lucide-react';
import { PageHeader } from './page-header.tsx';
import { FloatingNavBar } from './floating-nav-bar.tsx';
import { ExploreBanner } from './explore-banner.tsx';
import { DOCK_TABS, matchRoute } from '@/lib/app/routes.ts';
import { resolveBootState, type BootState } from '@/lib/app/boot-state.ts';

const DOCK_ICONS = [
  <House key="overview" className="size-4" />,
  <TrendingUp key="progress" className="size-4" />,
  <Calculator key="calculator" className="size-4" />,
  <Swords key="simulator" className="size-4" />,
  <Settings key="settings" className="size-4" />,
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = matchRoute(location.pathname);
  const showDock = match?.dockTab !== undefined;
  const activeIndex = DOCK_TABS.findIndex((tab) =>
    tab.path === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.path),
  );
  const [bootState, setBootState] = useState<BootState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pathname = location.pathname;

    resolveBootState().then((state) => {
      if (cancelled) return;
      setBootState(state);

      const realSlotExists = state === 'ok' || state === 'missing';

      // redirects for char saves
      if (pathname === '/onboarding') {
        if (realSlotExists) navigate('/', { replace: true });
        return;
      }
      if (pathname === '/no-save') {
        if (state !== 'missing') navigate('/', { replace: true });
        return;
      }
      if (state === 'none') navigate('/onboarding', { replace: true });
      else if (state === 'missing') navigate('/no-save', { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  // PWA Loading Screen
  if (bootState === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <div className="relative mb-6 size-36">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="absolute inset-0 m-auto size-30" />
        </div>
        <h1 className="text-xl font-semibold">IdleFantasy-Dex</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          A companion dashboard for tracking your IdleFantasy saves, progress, and stats.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title={match?.title ?? 'Not Found'}
        showBack={!!match?.parent}
        onBack={() => match?.parent && navigate(match.parent)}
      />
      {bootState === 'explore' && <ExploreBanner />}
      <Outlet />
      {showDock && (
        <FloatingNavBar
          items={DOCK_TABS.map((tab, index) => ({ label: tab.label, icon: DOCK_ICONS[index] }))}
          activeIndex={activeIndex}
          onChange={(index) => navigate(DOCK_TABS[index].path)}
        />
      )}
    </div>
  );
}
