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
import { MealPlansPage } from './pages/MealPlansPage';
import { AdminRecipesPage } from './pages/AdminRecipesPage';
import { PersonalFeatureBoundary } from './components/PersonalFeatureBoundary';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BlogPage, BlogDetailPage } from './pages/BlogPage';
import { BlogEditorPage } from './pages/BlogEditorPage';
import { MyBlogPostsPage } from './pages/MyBlogPostsPage';
import { BlogPostStatusPage } from './pages/BlogPostStatusPage';
import { AdminBlogPage } from './pages/AdminBlogPage';
import { RestaurantsPage } from './pages/RestaurantsPage';
import { QuestionsPage, QuestionDetailPage } from './pages/QuestionsPage';
import { VideosPage } from './pages/VideosPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { AdminQuestionsPage, AdminQuestionDetailPage } from './pages/AdminQuestionsPage';
import { AdminVideosPage } from './pages/AdminVideosPage';
import { AdminVideoEditorPage } from './pages/AdminVideoEditorPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RecipeDiscoveryPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
          <Route path="/dashboard" element={<PersonalFeatureBoundary><DashboardPage /></PersonalFeatureBoundary>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/change-password" element={<PersonalFeatureBoundary><ChangePasswordPage /></PersonalFeatureBoundary>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/ai-chef" element={<PersonalFeatureBoundary><AiChatPage /></PersonalFeatureBoundary>} />
          <Route path="/fridge-scan" element={<PersonalFeatureBoundary><FridgeScanPage /></PersonalFeatureBoundary>} />
          <Route path="/fridge" element={<PersonalFeatureBoundary><FridgeInventoryPage /></PersonalFeatureBoundary>} />
          <Route path="/nutrition" element={<PersonalFeatureBoundary><NutritionCalculatorPage /></PersonalFeatureBoundary>} />
          <Route path="/meal-plans" element={<PersonalFeatureBoundary><MealPlansPage /></PersonalFeatureBoundary>} />
          <Route path="/meal-plans/:id" element={<PersonalFeatureBoundary><MealPlansPage /></PersonalFeatureBoundary>} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/users" element={<AdminPage accountsOnly />} />
          <Route path="/admin/recipes" element={<AdminRecipesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/write" element={<BlogEditorPage />} />
          <Route path="/blog/my-posts" element={<MyBlogPostsPage />} />
          <Route path="/blog/my-posts/:id/edit" element={<BlogEditorPage />} />
          <Route path="/blog/my-posts/:id" element={<BlogPostStatusPage />} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/admin/blog" element={<AdminBlogPage />} />
          <Route path="/admin/blog/:id" element={<BlogPostStatusPage adminMode />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/mine" element={<QuestionsPage mine />} />
          <Route path="/questions/mine/:id" element={<QuestionDetailPage mine />} />
          <Route path="/questions/:id" element={<QuestionDetailPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/saved" element={<VideosPage saved />} />
          <Route path="/videos/:id" element={<VideoDetailPage />} />
          <Route path="/admin/questions" element={<AdminQuestionsPage />} />
          <Route path="/admin/questions/:id" element={<AdminQuestionDetailPage />} />
          <Route path="/admin/videos" element={<AdminVideosPage />} />
          <Route path="/admin/videos/new" element={<AdminVideoEditorPage />} />
          <Route path="/admin/videos/:id/edit" element={<AdminVideoEditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
