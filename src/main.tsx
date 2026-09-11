import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import './index.css';
import App from './App.tsx';
import { ReloadPrompt } from './components/reload-prompt.tsx';

const routes: RouteObject[] = [
  { path: '/', element: <App /> },
  ...(import.meta.env.DEV
    ? [
        { path: '/ds/foundation', lazy: () => import('./pages/ds/foundation/index.tsx') },
        { path: '/ds/components', lazy: () => import('./pages/ds/components/index.tsx') },
      ]
    : []),
];

const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ReloadPrompt />
  </StrictMode>,
);
