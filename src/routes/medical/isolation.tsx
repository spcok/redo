import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';
import { IsolationView } from '../../features/medical/IsolationView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical/isolation',
  component: IsolationView,
});