import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookMarked,
  Search,
  Clock,
  Flame,
  ChefHat,
  ShoppingBag,
  Calendar,
  Trash2,
  AlertCircle,
  RefreshCw,
  Utensils,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { cookbookService } from '../services/cookbookService';
import type { CookbookRecipe } from '../services/cookbookService';
import { errorMessage } from '../services/apiClient';

interface CookbookTabProps {
  onScheduleRecipe?: (title: string, calories: number) => void;
}

export const CookbookTab: React.FC<CookbookTabProps> = ({ onScheduleRecipe }) => {
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const timer = setTimeout(() => {
      cookbookService
        .list(0, 50, keyword)
        .then(res => {
          if (active) setRecipes(res.items || []);
        })
        .catch(err => {
          if (active) setError(errorMessage(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [keyword, reload]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa công thức "${title}" khỏi sổ tay?`)) return;
    setDeletingId(id);
    try {
      await cookbookService.remove(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      setToastMessage(`Đã xóa món "${title}" khỏi sổ tay.`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
            <BookMarked size={14} /> Sổ tay món ăn cá nhân
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
            Món Ăn Đã Lưu &amp; Tùy Biến
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Tất cả công thức bạn đã lưu từ <strong>Kho món chuẩn</strong>, bài đăng <strong>Cộng đồng</strong> hoặc bóc tách từ <strong>Video AI</strong>. Sẵn sàng lên lịch ăn, đi chợ hoặc hỏi AI Bếp trưởng.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Tìm theo tên món hoặc nguyên liệu..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && !recipes.length && (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm space-y-2">
          <RefreshCw size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p>Đang tải danh sách công thức trong sổ tay...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setReload(v => v + 1)}
            className="font-bold underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recipes.length === 0 && (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <BookMarked size={40} className="mx-auto text-emerald-600 opacity-70" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {keyword ? 'Không tìm thấy món ăn nào khớp với từ khóa' : 'Sổ tay món ăn của bạn đang trống'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Khi duyệt công thức trên VEGEAI hoặc bóc tách từ video/bài viết, hãy bấm nút <strong>"Lưu vào Sổ tay"</strong> để tập hợp thực đơn yêu thích tại đây!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/explore"
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
            >
              🍲 Khám phá món chay chuẩn
            </Link>
            <Link
              to="/blog"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:text-emerald-600 transition"
            >
              📰 Bảng tin Cộng đồng &amp; Video
            </Link>
          </div>
        </div>
      )}

      {/* Grid of Saved Recipes */}
      {!error && recipes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => {
            const ingList = recipe.ingredients || [];
            const isDeleting = deletingId === recipe.id;

            return (
              <div
                key={recipe.id}
                className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Top image or cover banner */}
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {recipe.sourceImage ? (
                      <img
                        src={recipe.sourceImage}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-slate-800 dark:to-slate-900 text-emerald-800 dark:text-emerald-400">
                        <Utensils size={36} className="opacity-70 mb-1" />
                        <span className="text-xs font-bold">Món Chay Trong Sổ Tay</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {recipe.aiGenerated ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-600 text-white shadow-2xs flex items-center gap-1">
                          <Sparkles size={11} /> AI Bóc Tách
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-700 text-white shadow-2xs">
                          🌿 Món Chuẩn
                        </span>
                      )}
                      {recipe.dietaryType && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200">
                          {recipe.dietaryType}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      disabled={isDeleting}
                      title="Xóa khỏi sổ tay"
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-900/90 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition shadow-2xs cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                      {recipe.title}
                    </h3>

                    {recipe.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 pt-1">
                      {recipe.cookTimeMinutes ? (
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-emerald-600" /> {recipe.cookTimeMinutes} phút
                        </span>
                      ) : null}
                      {recipe.estimatedCalories ? (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Flame size={14} /> {recipe.estimatedCalories} kcal
                        </span>
                      ) : null}
                    </div>

                    {/* Ingredients preview */}
                    {ingList.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          Nguyên liệu chính ({ingList.length}):
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                          {ingList.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ecosystem Action Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Đi chợ mua nguyên liệu */}
                    <Link
                      to="/smart-market"
                      state={{
                        planTitle: recipe.title,
                        recipeSummary: {
                          title: recipe.title,
                          cookTimeMinutes: recipe.cookTimeMinutes || 20,
                          calories: recipe.estimatedCalories || 250,
                          servings: 2,
                        },
                        importedItems: ingList.map((ing, idx) => ({
                          id: `cb-ing-${recipe.id}-${idx}`,
                          name: ing.split(':')[0].trim(),
                          amount: ing.includes(':') ? ing.split(':')[1].trim() : '1 phần',
                          category: 'produce' as const,
                          categoryLabel: 'Rau củ & Nấm tươi',
                          price: 15000,
                          unit: 'phần',
                          inStock: true,
                        }))
                      }}
                      title="Đi chợ mua nguyên liệu cho món này"
                      className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-amber-400 text-amber-600 transition shadow-2xs"
                    >
                      <ShoppingBag size={15} />
                    </Link>

                    {/* Lên lịch ăn */}
                    <button
                      type="button"
                      onClick={() => onScheduleRecipe?.(recipe.title, recipe.estimatedCalories || 250)}
                      title="Thêm vào Lịch ăn 30 ngày"
                      className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-sky-400 text-sky-600 transition shadow-2xs cursor-pointer"
                    >
                      <Calendar size={15} />
                    </button>
                  </div>

                  {/* Hỏi AI Bếp Trưởng */}
                  <Link
                    to="/ai-chef"
                    state={{
                      source: 'cookbook',
                      title: `Nấu từ Sổ tay: ${recipe.title}`,
                      recipeContext: {
                        title: recipe.title,
                        cookTimeMinutes: recipe.cookTimeMinutes || 20,
                        estimatedCalories: recipe.estimatedCalories || 250,
                        dietaryType: recipe.dietaryType || 'Thuần chay',
                        ingredients: recipe.ingredients || [],
                        instructions: recipe.instructions || [],
                      },
                      initialPrompt: `Tôi muốn nấu món "${recipe.title}" đã lưu trong Sổ tay cá nhân (${recipe.estimatedCalories ?? '--'} kcal). Nguyên liệu gồm: ${(recipe.ingredients || []).join(', ')}. Bếp trưởng VEGEAI hãy hướng dẫn bí quyết nấu món này ngon nhất nhé!`
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                  >
                    <ChefHat size={14} />
                    <span>Hỏi AI</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
