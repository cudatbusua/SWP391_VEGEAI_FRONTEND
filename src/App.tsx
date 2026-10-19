import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { PersonalFeatureBoundary } from './components/PersonalFeatureBoundary';
import { AdminFeatureBoundary } from './components/AdminFeatureBoundary';

const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const RecipeDiscoveryPage = lazy(() => import('./pages/RecipeDiscoveryPage').then(module => ({ default: module.RecipeDiscoveryPage })));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then(module => ({ default: module.RecipeDetailPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));
const AiChatPage = lazy(() => import('./pages/AiChatPage').then(module => ({ default: module.AiChatPage })));
const FridgeScanPage = lazy(() => import('./pages/FridgeScanPage').then(module => ({ default: module.FridgeScanPage })));
const FridgeInventoryPage = lazy(() => import('./pages/FridgeInventoryPage').then(module => ({ default: module.FridgeInventoryPage })));
const NutritionCalculatorPage = lazy(() => import('./pages/NutritionCalculatorPage').then(module => ({ default: module.NutritionCalculatorPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const MealPlansPage = lazy(() => import('./pages/MealPlansPage').then(module => ({ default: module.MealPlansPage })));
const AdminRecipesPage = lazy(() => import('./pages/AdminRecipesPage').then(module => ({ default: module.AdminRecipesPage })));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage').then(module => ({ default: module.ChangePasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.BlogPage })));
const BlogDetailPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.BlogDetailPage })));
const BlogEditorPage = lazy(() => import('./pages/BlogEditorPage').then(module => ({ default: module.BlogEditorPage })));
const MyBlogPostsPage = lazy(() => import('./pages/MyBlogPostsPage').then(module => ({ default: module.MyBlogPostsPage })));
const BlogPostStatusPage = lazy(() => import('./pages/BlogPostStatusPage').then(module => ({ default: module.BlogPostStatusPage })));
const AdminBlogPage = lazy(() => import('./pages/AdminBlogPage').then(module => ({ default: module.AdminBlogPage })));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage').then(module => ({ default: module.RestaurantsPage })));
const QuestionsPage = lazy(() => import('./pages/QuestionsPage').then(module => ({ default: module.QuestionsPage })));
const QuestionDetailPage = lazy(() => import('./pages/QuestionsPage').then(module => ({ default: module.QuestionDetailPage })));
const VideosPage = lazy(() => import('./pages/VideosPage').then(module => ({ default: module.VideosPage })));
const VideoDetailPage = lazy(() => import('./pages/VideoDetailPage').then(module => ({ default: module.VideoDetailPage })));
const AdminQuestionsPage = lazy(() => import('./pages/AdminQuestionsPage').then(module => ({ default: module.AdminQuestionsPage })));
const AdminQuestionDetailPage = lazy(() => import('./pages/AdminQuestionsPage').then(module => ({ default: module.AdminQuestionDetailPage })));
const AdminVideosPage = lazy(() => import('./pages/AdminVideosPage').then(module => ({ default: module.AdminVideosPage })));
const AdminVideoEditorPage = lazy(() => import('./pages/AdminVideoEditorPage').then(module => ({ default: module.AdminVideoEditorPage })));
const AdminContentInteractionsPage = lazy(() => import('./pages/AdminContentInteractionsPage').then(module => ({ default: module.AdminContentInteractionsPage })));

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Defer each route bundle until navigation so maps, admin tools and editors stay off the initial download. */}
        <Suspense fallback={<main className="min-h-[60vh] p-10 text-center text-sm font-medium text-slate-600" role="status">Đang tải trang...</main>}>
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
          <Route path="/admin" element={<AdminFeatureBoundary><AdminPage /></AdminFeatureBoundary>} />
          <Route path="/admin/users" element={<AdminFeatureBoundary><AdminPage accountsOnly /></AdminFeatureBoundary>} />
          <Route path="/admin/recipes" element={<AdminFeatureBoundary><AdminRecipesPage /></AdminFeatureBoundary>} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/write" element={<PersonalFeatureBoundary><BlogEditorPage /></PersonalFeatureBoundary>} />
          <Route path="/blog/my-posts" element={<PersonalFeatureBoundary><MyBlogPostsPage /></PersonalFeatureBoundary>} />
          <Route path="/blog/my-posts/:id/edit" element={<PersonalFeatureBoundary><BlogEditorPage /></PersonalFeatureBoundary>} />
          <Route path="/blog/my-posts/:id" element={<PersonalFeatureBoundary><BlogPostStatusPage /></PersonalFeatureBoundary>} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/admin/blog" element={<AdminFeatureBoundary><AdminBlogPage /></AdminFeatureBoundary>} />
          <Route path="/admin/blog/:id" element={<AdminFeatureBoundary><BlogPostStatusPage adminMode /></AdminFeatureBoundary>} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/mine" element={<PersonalFeatureBoundary><QuestionsPage mine /></PersonalFeatureBoundary>} />
          <Route path="/questions/mine/:id" element={<PersonalFeatureBoundary><QuestionDetailPage mine /></PersonalFeatureBoundary>} />
          <Route path="/questions/:id" element={<QuestionDetailPage />} />
          <Route path="/videos" element={<PersonalFeatureBoundary><VideosPage /></PersonalFeatureBoundary>} />
          <Route path="/videos/saved" element={<PersonalFeatureBoundary><VideosPage saved /></PersonalFeatureBoundary>} />
          <Route path="/videos/:id" element={<PersonalFeatureBoundary><VideoDetailPage /></PersonalFeatureBoundary>} />
          <Route path="/admin/questions" element={<AdminFeatureBoundary><AdminQuestionsPage /></AdminFeatureBoundary>} />
          <Route path="/admin/questions/:id" element={<AdminFeatureBoundary><AdminQuestionDetailPage /></AdminFeatureBoundary>} />
          <Route path="/admin/videos" element={<AdminFeatureBoundary><AdminVideosPage /></AdminFeatureBoundary>} />
          <Route path="/admin/content-interactions" element={<AdminFeatureBoundary><AdminContentInteractionsPage /></AdminFeatureBoundary>} />
          <Route path="/admin/videos/new" element={<AdminFeatureBoundary><AdminVideoEditorPage /></AdminFeatureBoundary>} />
          <Route path="/admin/videos/:id/edit" element={<AdminFeatureBoundary><AdminVideoEditorPage /></AdminFeatureBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
