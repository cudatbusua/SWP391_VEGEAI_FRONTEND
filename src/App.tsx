import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RecipeDiscoveryPage } from './pages/RecipeDiscoveryPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';
import { WorkspacePage } from './pages/WorkspacePages';
import { MainLayout } from './layouts/MainLayout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for refresh-cookie restoration before deciding whether the dashboard is public.
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Đang kiểm tra phiên đăng nhập...</div>;
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Đang kiểm tra phiên đăng nhập...</div>;
  }

  // Admin preview is started from the shared layout; real customer accounts stay denied.
  return user?.role === 'admin'
    ? <WorkspacePage kind="admin" />
    : <MainLayout><div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Bạn không có quyền truy cập</h1><p className="mt-2 text-slate-600">Khu vực quản trị chỉ dành cho tài khoản admin. Trong môi trường phát triển, dùng nút Demo Admin ở thanh trạng thái để xem bản minh họa.</p></div></MainLayout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecipeDiscoveryPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><WorkspacePage kind="notifications" /></ProtectedRoute>} />
          <Route path="/grocery-list" element={<ProtectedRoute><WorkspacePage kind="grocery" /></ProtectedRoute>} />
          <Route path="/meal-plan" element={<ProtectedRoute><WorkspacePage kind="meal-plan" /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><WorkspacePage kind="ai" /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><WorkspacePage kind="onboarding" /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute><WorkspacePage kind="reviews" /></ProtectedRoute>} />
          <Route path="/saved-recipes" element={<ProtectedRoute><WorkspacePage kind="saved" /></ProtectedRoute>} />
          <Route path="/blog" element={<WorkspacePage kind="blog" />} />
          <Route path="/blog/write" element={<ProtectedRoute><WorkspacePage kind="blog-editor" /></ProtectedRoute>} />
          <Route path="/blog/preview" element={<ProtectedRoute><WorkspacePage kind="blog-preview" /></ProtectedRoute>} />
          <Route path="/blog/:id" element={<WorkspacePage kind="blog" />} />
          <Route path="/restaurants" element={<WorkspacePage kind="restaurants" />} />
          <Route path="/restaurants/:id" element={<WorkspacePage kind="restaurants" />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
