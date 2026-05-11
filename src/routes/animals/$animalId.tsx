import { createRoute, useNavigate } from '@tanstack/react-router';
import { rootRoute } from '../__root';
import { AnimalProfileView } from '../../features/animals/AnimalProfileView';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/animals/$animalId',
  component: ProfileRouteComponent,
});

function ProfileRouteComponent() {
  // Extract the ID securely from the URL
  const { animalId } = Route.useParams();
  const navigate = useNavigate();

  // Route the "Back" button to the Dashboard
  return (
    <AnimalProfileView 
      animalId={animalId} 
      onBack={() => navigate({ to: '/' })} 
    />
  );
}