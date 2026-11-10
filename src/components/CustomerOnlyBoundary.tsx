import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

export function CustomerOnlyBoundary({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user?.role === 'admin') return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
