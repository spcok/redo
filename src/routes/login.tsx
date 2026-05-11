import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { LoginForm } from '../features/auth/components/LoginForm';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginScreen,
});

function LoginScreen() {
  return (
    <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center p-4 bg-grid-slate-900/[0.05]">
      <LoginForm />
    </div>
  );
}
