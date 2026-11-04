import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';
import { loginDestination } from '../utils/authRedirect';

/**
 * GuestOnlyBoundary restricts routes (such as /login, /register, /forgot-password)
 * to unauthenticated visitors only. If an authenticated user enters these URLs directly,
 * they are automatically redirected to their appropriate workspace — or back to the page
 * that originally sent them to login (e.g. /ai-chef after using up the guest AI trial).
 */
export function GuestOnlyBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <MainLayout>
        <p role="status" className="p-8 text-center text-sm font-medium text-stone-500">
          Đang tải phiên đăng nhập...
        </p>
      </MainLayout>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={loginDestination(user?.role, location.state?.from)} replace />;
  }

  return <>{children}</>;
}
