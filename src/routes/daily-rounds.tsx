import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { DailyRoundsView } from '../features/dailyrounds/DailyRoundsView';

// Register the route with TanStack Router
export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily-rounds',
  component: DailyRoundsView,
});