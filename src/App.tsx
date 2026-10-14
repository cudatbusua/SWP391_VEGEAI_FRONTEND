import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RecipeDiscoveryPage } from './pages/RecipeDiscoveryPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AiChatPage } from './pages/AiChatPage';
import { FridgeScanPage } from './pages/FridgeScanPage';
import { FridgeInventoryPage } from './pages/FridgeInventoryPage';
import { NutritionCalculatorPage } from './pages/NutritionCalculatorPage';
import { AdminPage } from './pages/AdminPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BlogPage, BlogDetailPage } from './pages/BlogPage';
import { BlogEditorPage } from './pages/BlogEditorPage';
import { MyBlogPostsPage } from './pages/MyBlogPostsPage';
import { BlogPostStatusPage } from './pages/BlogPostStatusPage';
import { AdminBlogPage } from './pages/AdminBlogPage';
import { RestaurantsPage } from './pages/RestaurantsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecipeDiscoveryPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/ai-chef" element={<AiChatPage />} />
          <Route path="/fridge-scan" element={<FridgeScanPage />} />
          <Route path="/fridge" element={<FridgeInventoryPage />} />
          <Route path="/nutrition" element={<NutritionCalculatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/write" element={<BlogEditorPage />} />
          <Route path="/blog/my-posts" element={<MyBlogPostsPage />} />
          <Route path="/blog/my-posts/:id/edit" element={<BlogEditorPage />} />
          <Route path="/blog/my-posts/:id" element={<BlogPostStatusPage />} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/admin/blog" element={<AdminBlogPage />} />
          <Route path="/admin/blog/:id" element={<BlogPostStatusPage adminMode />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
