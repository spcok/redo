import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { FeedingScheduleView } from '../features/feedings/FeedingScheduleView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feeding-schedules',
  component: FeedingScheduleView,
});