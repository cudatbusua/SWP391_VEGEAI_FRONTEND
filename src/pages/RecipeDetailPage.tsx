import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Flame, Clock, Star, Lock } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { RECIPES } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';

export const RecipeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const recipe = RECIPES.find((r) => r.id === id) || RECIPES[0];
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSaved(!isSaved);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" /> Trang chủ
          </Link>
          <span>/</span>
          <Link to="/" className="hover:text-emerald-600 transition">Khám phá công thức</Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Chi tiết món ăn</span>
        </nav>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Image */}
            <div className="lg:col-span-6 relative rounded-2xl overflow-hidden shadow-sm aspect-[4/3] bg-gray-100">
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
                  {recipe.badge}
                </span>
                {recipe.secondaryBadge && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 shadow-2xs">
                    {recipe.secondaryBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{recipe.calories} kcal • Độ khó: {recipe.difficulty}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                ${recipe.title}
              </h1>

              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                {recipe.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-600 mb-6 font-medium">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span className="font-bold text-gray-900">{recipe.rating}</span>
                  <span className="text-gray-400">({recipe.reviewsCount} đánh giá)</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{recipe.cookTime} phút</span>
                </div>
              </div>

              {/* Macronutrients */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Protein</div>
                  <div className="text-base font-bold text-gray-800">{recipe.protein}g</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Carb</div>
                  <div className="text-base font-bold text-gray-800">{recipe.carbs || 24}g</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Fat</div>
                  <div className="text-base font-bold text-gray-800">{recipe.fat || 12}g</div>
                </div>
              </div>

              {/* Save Button */}
              <div>
                <button
                  onClick={handleSave}
                  className={`px-6 py-3 border border-gray-200 hover:border-gray-400 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                    isSaved ? 'text-emerald-600 border-emerald-500' : ''
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isSaved ? 'Đã lưu món ăn' : 'Lưu món'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Nguyên liệu cơ bản (2 khẩu phần)</span>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              Đã chuẩn hóa định lượng chuẩn VEGEAI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recipe.ingredients.map((item, idx) => (
              <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 font-bold text-sm text-gray-700 flex items-center justify-center shadow-2xs shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 truncate">{item.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cooking Steps Barrier (Image 2) */}
        {!isAuthenticated ? (
          <div className="relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs p-8 md:p-12">
            
            {/* Blurred background preview */}
            <div className="filter blur-sm select-none pointer-events-none opacity-40 space-y-6">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="space-y-4">
                <div className="p-4 border rounded-xl bg-gray-50 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-300" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                </div>
                <div className="p-4 border rounded-xl bg-gray-50 flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-300" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Barrier Modal Card (Image 2) */}
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/75 backdrop-blur-[2px]">
              <div className="max-w-md w-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                  <Lock className="w-7 h-7" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Đăng nhập để xem công thức chi tiết
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Mở khóa toàn bộ hướng dẫn nấu ăn từng bước, video hướng dẫn trực quan, đánh giá đầy đủ từ cộng đồng và gợi ý món ăn kèm thông minh.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/login"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-sm text-center"
                  >
                    Đăng nhập ngay
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition cursor-pointer shadow-2xs text-center"
                  >
                    Đăng ký tài khoản mới
                  </Link>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xs space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Hướng dẫn nấu ăn từng bước (Đã mở khóa)
            </h3>
            <div className="space-y-4">
              {(recipe.steps || []).map((step, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};
