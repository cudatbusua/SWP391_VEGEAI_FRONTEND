import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

export function PersonalFeatureBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, sessionError, retrySession } = useAuth();
  const location = useLocation();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (sessionError && !isAuthenticated) return <MainLayout><div role="alert" className="p-8 text-center">{sessionError}<button onClick={retrySession} className="ml-2 underline">Thử lại</button></div></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
