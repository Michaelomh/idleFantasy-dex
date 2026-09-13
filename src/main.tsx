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
import { ROUTES } from './lib/routes.ts';
import { ReloadPrompt } from './components/reload-prompt.tsx';

const ROUTE_OVERRIDES: Record<string, RouteObject['element']> = {
  '/onboarding': <OnboardingPage />,
  '/no-save': <NoSavePage />,
  '/saves': <SavesPage />,
};

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: ROUTES.map((route) =>
      route.path === '/'
        ? { index: true, element: <DashboardPage /> }
        : { path: route.path.slice(1), element: ROUTE_OVERRIDES[route.path] ?? <RoutePage /> },
    ),
  },
  // only for dev - design system overview
  ...(import.meta.env.DEV
    ? [
        { path: '/ds/foundations', lazy: () => import('./pages/ds/foundations/index.tsx') },
        { path: '/ds/components', lazy: () => import('./pages/ds/components/index.tsx') },
      ]
    : []),
];

const router = createHashRouter(routes, { basename: import.meta.env.BASE_URL });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
      <ReloadPrompt />
    </TooltipProvider>
  </StrictMode>,
);
