import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';

export function PersonalFeatureBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  // Guests may browse only exploration, published blogs, public Q&A, and verified restaurants.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
