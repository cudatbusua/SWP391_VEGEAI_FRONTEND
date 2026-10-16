import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

export function PersonalFeatureBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}
