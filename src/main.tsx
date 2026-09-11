import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import './index.css';
import App from './App.tsx';
import { ReloadPrompt } from './components/reload-prompt.tsx';

// /ds/foundation is a maintainer-only debug route; dropped from the production
// bundle entirely, since import.meta.env.DEV is inlined to `false` at build
// time and the dead `if` branch (including the lazy import) is tree-shaken.
const routes: RouteObject[] = [
  { path: '/', element: <App /> },
  ...(import.meta.env.DEV
    ? [{ path: '/ds/foundation', lazy: () => import('./pages/ds/foundation/index.tsx') }]
    : []),
];

const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ReloadPrompt />
  </StrictMode>,
);
