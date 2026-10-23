import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

/**
 * GuestOnlyBoundary restricts routes (such as /login, /register, /forgot-password)
 * to unauthenticated visitors only. If an authenticated user enters these URLs directly,
 * they are automatically redirected to their appropriate workspace.
 */
export function GuestOnlyBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

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
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
