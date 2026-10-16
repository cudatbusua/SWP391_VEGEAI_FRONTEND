import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../layouts/MainLayout';
import { ChangePasswordForm } from '../features/dashboard/components/ChangePasswordForm';

export function ChangePasswordPage() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ChangePasswordForm />
    </div>
  </MainLayout>;
}
