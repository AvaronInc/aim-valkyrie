import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '../components/AppShell';
import { isAuthed } from '../lib/auth';

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!isAuthed() && location.pathname !== '/login') {
      throw redirect({ to: '/login' });
    }
  },
  component: () => {
    const location = window.location.pathname;
    if (location === '/login') return <Outlet />;
    return <AppShell><Outlet /></AppShell>;
  },
});
