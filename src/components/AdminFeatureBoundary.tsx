import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

export function AdminFeatureBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  // Prevent guests from rendering administrative screens through direct URLs.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // When an authenticated non-admin user attempts to enter admin URLs, render explicit forbidden state
  if (user?.role !== 'admin') {
    return <Navigate to="/forbidden" replace state={{ attemptedPath: location.pathname }} />;
  }
  return <>{children}</>;
}
