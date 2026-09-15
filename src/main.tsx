import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createHashRouter, RouterProvider, type RouteObject } from 'react-router';
import './index.css';
import { AppLayout } from './components/app-layout.tsx';
import { RoutePage } from './components/route-page.tsx';
import { DashboardPage } from './components/dashboard-page.tsx';
import { OnboardingPage } from './components/onboarding-page.tsx';
import { NoSavePage } from './components/no-save-page.tsx';
import { SavesPage } from './components/saves-page.tsx';
import { ProgressOverviewPage } from './components/progress/progress-overview-page.tsx';
import { ProgressCategoryPage } from './components/progress/category-page.tsx';
import { BossDetailPage } from './components/progress/boss-detail-page.tsx';
import { NotFoundPage } from './components/not-found-page.tsx';
import { ROUTES } from './lib/app/routes.ts';
import { ReloadPrompt } from './components/reload-prompt.tsx';
import { Toaster } from './components/ui/sonner.tsx';

const PROGRESS_CATEGORY_PATHS = new Set([
  '/progress/quests',
  '/progress/guilds',
  '/progress/bosses',
  '/progress/armoury',
  '/progress/levels',
  '/progress/pets',
  '/progress/titles',
  '/progress/expeditions',
  '/progress/achievements',
  '/progress/bestiary',
  '/progress/inventory',
  '/progress/heirloom-tools',
]);

const ROUTE_OVERRIDES: Record<string, RouteObject['element']> = {
  '/onboarding': <OnboardingPage />,
  '/no-save': <NoSavePage />,
  '/saves': <SavesPage />,
  '/progress': <ProgressOverviewPage />,
  '/progress/bosses/:bossId': <BossDetailPage />,
};

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: ROUTES.map((route) => {
      if (route.path === '/') return { index: true, element: <DashboardPage /> };
      const element =
        ROUTE_OVERRIDES[route.path] ??
        (PROGRESS_CATEGORY_PATHS.has(route.path) ? <ProgressCategoryPage /> : <RoutePage />);
      return { path: route.path.slice(1), element };
    }).concat({ path: '*', element: <NotFoundPage /> }),
  },
  // only for dev - design system overview
  ...(import.meta.env.DEV
    ? [
        { path: '/ds/foundations', lazy: () => import('./pages/ds/foundations/index.tsx') },
        { path: '/ds/components', lazy: () => import('./pages/ds/components/index.tsx') },
      ]
    : []),
];

const router = createHashRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
      <ReloadPrompt />
      <Toaster />
    </TooltipProvider>
  </StrictMode>,
);
