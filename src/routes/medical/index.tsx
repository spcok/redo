import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';
import { MedicalDashboardView } from '../../features/medical/MedicalDashboardView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical',
  component: MedicalDashboardView,
});