import { useEffect, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigate, useOutlet } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Calculator, House, Settings, Swords, TrendingUp } from 'lucide-react';
import { FloatingNavBar } from './floating-nav-bar.tsx';
import { ExploreBanner } from './explore-banner.tsx';
import { DesktopNoticeBanner } from './desktop-notice-banner.tsx';
import { NotFoundPage } from './not-found-page.tsx';
import { DOCK_TABS, isRouteDisabled, matchRoute } from '@/lib/app/routes.ts';
import { resolveBootState, type BootState } from '@/lib/app/boot-state.ts';
import { useHideExperimental } from '@/lib/hooks/use-hide-experimental';

const PRE_BOOT_PATHS = new Set(['/welcome', '/onboarding', '/no-save']);
const EXPERIMENTAL_DOCK_PATHS = new Set(['/calculator', '/simulator']);

const DOCK_ICONS = [
  <House key="overview" className="size-5" />,
  <TrendingUp key="progress" className="size-5" />,
  <Calculator key="calculator" className="size-5" />,
  <Swords key="simulator" className="size-5" />,
  <Settings key="settings" className="size-5" />,
];

const DOCK_ENTRIES = DOCK_TABS.map((tab, index) => ({ ...tab, icon: DOCK_ICONS[index] }));

function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-1 flex-col"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rawMatch = matchRoute(location.pathname);
  const disabled = !!rawMatch && isRouteDisabled(location.pathname);
  const match = disabled ? undefined : rawMatch;
  const showDock = match?.dockTab !== undefined;
  const [hideExperimental] = useHideExperimental();
  const dockEntries = DOCK_ENTRIES.filter((tab) => !hideExperimental || !EXPERIMENTAL_DOCK_PATHS.has(tab.path));
  const activeIndex = dockEntries.findIndex((tab) =>
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
      if (pathname === '/welcome' || pathname === '/onboarding') {
        if (realSlotExists) navigate('/', { replace: true });
        return;
      }
      if (pathname === '/no-save') {
        if (state !== 'missing') navigate('/', { replace: true });
        return;
      }
      if (state === 'none') navigate('/welcome', { replace: true });
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
    <div className="flex min-h-screen flex-col pb-24">
      <DesktopNoticeBanner />
      {bootState === 'explore' && <ExploreBanner />}
      <ScrollRestoration getKey={(location) => location.pathname} />
      <div className="flex flex-1 flex-col">
        {disabled ? <NotFoundPage /> : PRE_BOOT_PATHS.has(location.pathname) ? <AnimatedOutlet /> : <Outlet />}
      </div>
      {showDock && (
        <FloatingNavBar
          items={dockEntries.map((tab) => ({ label: tab.label, icon: tab.icon }))}
          activeIndex={activeIndex}
          onChange={(index) => navigate(dockEntries[index].path)}
        />
      )}
    </div>
  );
}
