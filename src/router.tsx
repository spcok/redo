import { createRouter } from '@tanstack/react-router';
import { routeRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as loginRoute } from './routes/login';
import { Route as dailyLogsRoute } from './routes/daily-logs';
import { Route as dailyRoundsRoute } from './routes/daily-rounds';
import { Route as tasksRoute } from './routes/tasks';
import { Route as feedingSchedulesRoute } from './routes/feeding-schedules';
import { Route as medicalIndexRoute } from './routes/medical/index';
import { Route as medicalRecordsRoute } from './routes/medical/records';
import { Route as medicalMedicationsRoute } from './routes/medical/medications';
import { Route as medicalIsolationRoute } from './routes/medical/isolation';
import { Route as medicalScheduleRoute } from './routes/medical/schedule';
import { Route as maintenanceRoute } from './routes/maintenance';
import { Route as incidentsRoute } from './routes/incidents';
import { Route as safetyIncidentsRoute } from './routes/safety-incidents';
import { Route as fireDrillsRoute } from './routes/fire-drills';
import { Route as timesheetsRoute } from './routes/timesheets';
import { Route as animalProfileRoute } from './routes/animals/$animalId';

// Assemble the route tree
const routeTree = routeRoute.addChildren([
  indexRoute,
  loginRoute,
  dailyLogsRoute,
  dailyRoundsRoute,
  tasksRoute,
  feedingSchedulesRoute,
  medicalIndexRoute,
  medicalRecordsRoute,
  medicalMedicationsRoute,
  medicalIsolationRoute,
  medicalScheduleRoute,
  maintenanceRoute,
  incidentsRoute,
  safetyIncidentsRoute,
  fireDrillsRoute,
  timesheetsRoute,
  animalProfileRoute,
]);

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}