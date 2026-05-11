import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../__root';
import { GlobalMedicationLogsView } from '../../features/medical/GlobalMedicationLogsView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical/medications',
  component: GlobalMedicationLogsView,
});