import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createHashRouter, RouterProvider, type RouteObject } from 'react-router';
import './index.css';
import { AppLayout } from './components/app-layout.tsx';
import { DashboardPage } from './components/dashboard-page.tsx';
import { WelcomePage } from './components/welcome-page.tsx';
import { OnboardingPage } from './components/onboarding-page.tsx';
import { NoSavePage } from './components/no-save-page.tsx';
import { SettingsPage } from './components/settings-page.tsx';
import { ProgressOverviewPage } from './components/progress/progress-overview-page.tsx';
import { ProgressCategoryAwardPage } from './components/progress/progress-category-award-page.tsx';
import { ProgressCategorySkillPage } from './components/progress/progress-category-skill-page.tsx';
import { ProgressCategoryCombatPage } from './components/progress/progress-category-combat-page.tsx';
import { ProgressCategoryCollectionPage } from './components/progress/progress-category-collection-page.tsx';
import { CalculatorOverviewPage } from './components/calculator/calculator-overview-page.tsx';
import { CalculatorSkillPage } from './components/calculator/calculator-skill-page.tsx';
import { SimulatorOverviewPage } from './components/simulator/simulator-overview-page.tsx';
import { SimulatorBossListPage } from './components/simulator/simulator-boss-list-page.tsx';
import { SimulatorBossDetailPage } from './components/simulator/simulator-boss-detail-page.tsx';
import { NotFoundPage } from './components/not-found-page.tsx';
import { ROUTES } from './lib/app/routes.ts';
import { ReloadPrompt } from './components/reload-prompt.tsx';

const ROUTE_OVERRIDES: Record<string, RouteObject['element']> = {
  '/welcome': <WelcomePage />,
  '/onboarding': <OnboardingPage />,
  '/no-save': <NoSavePage />,
  '/settings': <SettingsPage />,
  '/progress': <ProgressOverviewPage />,
  '/progress/levels': <ProgressCategorySkillPage />,
  '/progress/guilds': <ProgressCategorySkillPage />,
  '/progress/bosses': <ProgressCategoryCombatPage />,
  '/progress/bestiary': <ProgressCategoryCombatPage />,
  '/progress/armoury': <ProgressCategoryCollectionPage />,
  '/progress/inventory': <ProgressCategoryCollectionPage />,
  '/progress/pets': <ProgressCategoryCollectionPage />,
  '/progress/heirloom-tools': <ProgressCategoryCollectionPage />,
  '/progress/expeditions': <ProgressCategoryCollectionPage />,
  '/progress/quests': <ProgressCategoryAwardPage />,
  '/progress/achievements': <ProgressCategoryAwardPage />,
  '/progress/titles': <ProgressCategoryAwardPage />,
  '/calculator': <CalculatorOverviewPage />,
  '/simulator': <SimulatorOverviewPage />,
  '/simulator/bosses': <SimulatorBossListPage />,
  '/simulator/bosses/:bossId': <SimulatorBossDetailPage />,
};

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: ROUTES.map((route) => {
      if (route.path === '/') return { index: true, element: <DashboardPage /> };
      const element = route.parent === '/calculator' ? <CalculatorSkillPage /> : ROUTE_OVERRIDES[route.path];
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
    </TooltipProvider>
  </StrictMode>,
);
