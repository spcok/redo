import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { Dashboard } from '../features/dashboard/Dashboard';

// Create the formal TanStack Route for the root path '/'
export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexScreen,
});

function IndexScreen() {
  return <Dashboard />;
}