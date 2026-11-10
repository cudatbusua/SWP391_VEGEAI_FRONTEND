import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Flame,
  Users,
  ChefHat,
  ShoppingBag,
  Calendar,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Utensils,
  AlertCircle
} from 'lucide-react';
import { cookbookService } from '../services/cookbookService';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/apiClient';
import { RecipeStepBox } from './RecipeStepBox';

export interface UnifiedRecipeData {
  title: string;
  description?: string;
  imageUrl?: string;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: string;
  dietaryType?: string;
  tags?: string[];
  ingredients: string[];
  instructions: string[];
  safetyNotes?: string[];
  sourceType: 'VERIFIED_RECIPE' | 'BLOG_AI' | 'VIDEO_AI';
  sourceUrl?: string;
}

function inferCategory(raw: string): { category: 'produce' | 'protein' | 'grains' | 'spices'; categoryLabel: string; name: string; amount: string } {
  let name = raw.trim();
  let amount = '1 phần';
  const colonIdx = raw.indexOf(':');
  if (colonIdx > 0) {
    name = raw.slice(0, colonIdx).trim();
    amount = raw.slice(colonIdx + 1).trim() || '1 phần';
  } else {
    const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      amount = parenMatch[2].trim();
    }
  }

  const lower = name.toLowerCase();
  if (lower.includes('đậu') || lower.includes('tofu') || lower.includes('tàu hũ') || lower.includes('chả') || lower.includes('sườn') || lower.includes('tempeh') || lower.includes('hạt điều') || lower.includes('hạt sen')) {
    return { category: 'protein', categoryLabel: 'Đậu hũ & Đạm thực vật', name, amount };
  }
  if (lower.includes('nước tương') || lower.includes('xì dầu') || lower.includes('muối') || lower.includes('tiêu') || lower.includes('đường') || lower.includes('dầu') || lower.includes('sốt') || lower.includes('hạt nêm') || lower.includes('hạt nấm') || lower.includes('tương') || lower.includes('bột') || lower.includes('mè')) {
    return { category: 'spices', categoryLabel: 'Gia vị bếp chay', name, amount };
  }
  if (lower.includes('gạo') || lower.includes('bún') || lower.includes('phở') || lower.includes('mì') || lower.includes('miến') || lower.includes('yến mạch') || lower.includes('bánh')) {
    return { category: 'grains', categoryLabel: 'Tinh bột & Ngũ cốc', name, amount };
  }
  return { category: 'produce', categoryLabel: 'Rau củ & Nấm tươi', name, amount };
}

export const UnifiedRecipeStandardView: React.FC<{ recipe: UnifiedRecipeData }> = ({ recipe }) => {
  const { isAuthenticated } = useAuth();
  const [savingCookbook, setSavingCookbook] = useState(false);
  const [cookbookSaved, setCookbookSaved] = useState(false);
  const [cookbookError, setCookbookError] = useState('');

  const parsedIngredients = recipe.ingredients.map(ing => inferCategory(ing));
  const totalCookTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 20;

  const handleSaveToCookbook = async () => {
    if (!isAuthenticated) {
      setCookbookError('Vui lòng đăng nhập để lưu công thức vào Sổ tay món ăn.');
      return;
    }
    setSavingCookbook(true);
    setCookbookError('');
    try {
      await cookbookService.save({
        title: recipe.title,
        description: recipe.description || `Công thức món ${recipe.title}`,
        cookTimeMinutes: totalCookTime,
        difficulty: recipe.difficulty || 'EASY',
        estimatedCalories: recipe.calories || 250,
        dietaryType: recipe.dietaryType || 'VEGAN',
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        safetyNotes: recipe.safetyNotes,
        aiGenerated: recipe.sourceType !== 'VERIFIED_RECIPE',
        sourceImage: recipe.imageUrl,
      });
      setCookbookSaved(true);
      setTimeout(() => setCookbookSaved(false), 5000);
    } catch (err) {
      setCookbookError(errorMessage(err));
    } finally {
      setSavingCookbook(false);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-6">
      {/* 1. Header & Source Badge */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border-b border-emerald-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-700 text-white shadow-2xs">
              <Utensils size={13} /> Chuẩn Công Thức VEGEAI
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {recipe.sourceType === 'VERIFIED_RECIPE' ? '🌿 Kho Mẫu Chuẩn' : recipe.sourceType === 'BLOG_AI' ? '🧠 AI Bóc Tách từ Blog' : '🎬 AI Bóc Tách từ Video'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1"><Clock size={15} className="text-emerald-600" /> {totalCookTime} phút</span>
            {recipe.servings && <span className="flex items-center gap-1">· <Users size={15} className="text-emerald-600" /> {recipe.servings} phần</span>}
            {recipe.calories && <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-extrabold">· <Flame size={15} /> {recipe.calories} kcal</span>}
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-3">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            {recipe.description}
          </p>
        )}
      </div>

      {/* 2. Dinh Dưỡng Khoa Học (Nutrition Bar) */}
      <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Flame size={14} className="text-emerald-600" /> Thành phần Dinh dưỡng mỗi khẩu phần:
          </span>
          {recipe.dietaryType && (
            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              {recipe.dietaryType}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Đạm thực vật</span>
            <span className="font-black text-slate-800 dark:text-white text-sm">{recipe.proteinGrams != null ? `${recipe.proteinGrams} g` : '12–18 g'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Tinh bột (Carbs)</span>
            <span className="font-black text-slate-800 dark:text-white text-sm">{recipe.carbsGrams != null ? `${recipe.carbsGrams} g` : '25–40 g'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Chất béo tốt</span>
            <span className="font-black text-slate-800 dark:text-white text-sm">{recipe.fatGrams != null ? `${recipe.fatGrams} g` : '6–10 g'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 block">Chất xơ tự nhiên</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{recipe.fiberGrams != null ? `${recipe.fiberGrams} g` : '5–8 g'}</span>
          </div>
        </div>
      </div>

      {/* 3. Nguyên Liệu & Các Bước Nấu */}
      <div className="p-5 sm:p-6 grid md:grid-cols-2 gap-6 items-start">
        {/* Cột 1: Nguyên liệu */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className="text-emerald-600" /> Nguyên liệu cần có ({recipe.ingredients.length})
            </h4>
          </div>

          <ul className="space-y-2 text-xs sm:text-sm">
            {parsedIngredients.map((ing, idx) => (
              <li
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{ing.name}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                  {ing.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột 2: Các bước thực hiện */}
        <div className="space-y-3">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ChefHat size={16} className="text-emerald-600" /> Các bước nấu ({recipe.instructions.length})
          </h4>

          <div className="space-y-2.5">
            {recipe.instructions.map((step, idx) => (
              <RecipeStepBox
                key={idx}
                stepNumber={idx + 1}
                content={step}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Safety & Chef Tips */}
      {recipe.safetyNotes && recipe.safetyNotes.length > 0 && (
        <div className="px-5 sm:px-6 pb-4">
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong>Mẹo từ Bếp trưởng VEGEAI:</strong>
              <p>{recipe.safetyNotes.join(' · ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. BỘ HÀNH ĐỘNG HỆ SINH THÁI (Cross-ecosystem Action Bar) */}
      <div className="p-4 sm:px-6 bg-slate-100/70 dark:bg-slate-800/80 border-t border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút 1: Lưu vào Cookbook cá nhân */}
          <button
            type="button"
            onClick={handleSaveToCookbook}
            disabled={savingCookbook}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              cookbookSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {cookbookSaved ? <CheckCircle2 size={15} /> : <Bookmark size={15} className="text-emerald-600" />}
            <span>{cookbookSaved ? 'Đã lưu vào Sổ tay!' : savingCookbook ? 'Đang lưu...' : 'Lưu vào Sổ tay (Cookbook)'}</span>
          </button>

          {/* Nút 2: Lên thực đơn vào Lịch ăn 30 ngày */}
          <Link
            to="/settings?tab=calendar"
            state={{
              importedRecipeTitle: recipe.title,
              importedRecipeCalories: recipe.calories || 250,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <Calendar size={15} className="text-sky-600" />
            <span>Thêm vào Lịch ăn 30 ngày</span>
          </Link>

          {/* Nút 3: Đi chợ nguyên liệu Smart Market */}
          <Link
            to="/smart-market"
            state={{
              planTitle: recipe.title,
              recipeSummary: {
                title: recipe.title,
                cookTimeMinutes: totalCookTime,
                calories: recipe.calories || 250,
                servings: recipe.servings || 2,
              },
              importedItems: parsedIngredients.map((ing, idx) => ({
                id: `recipe-item-${Date.now()}-${idx}`,
                name: ing.name,
                amount: ing.amount,
                category: ing.category,
                categoryLabel: ing.categoryLabel,
                price: 15000,
                unit: 'phần',
                inStock: true,
              }))
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <ShoppingBag size={15} className="text-amber-600" />
            <span>Đi chợ mua nguyên liệu</span>
          </Link>
        </div>

        {/* Nút 4: Hỏi AI Bếp trưởng */}
        <Link
          to="/ai-chef"
          state={{
            source: 'unified-recipe',
            title: `Nấu: ${recipe.title}`,
            recipeContext: {
              title: recipe.title,
              cookTimeMinutes: totalCookTime,
              estimatedCalories: recipe.calories || 250,
              dietaryType: recipe.dietaryType || 'Thuần chay',
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
            },
            initialPrompt: `Tôi đang chuẩn bị nấu món "${recipe.title}" (${recipe.calories ?? '--'} kcal). Nguyên liệu gồm: ${recipe.ingredients.join(', ')}. Bếp trưởng VEGEAI hãy hướng dẫn bí quyết làm nước sốt hoặc mẹo nấu món này thơm ngon chuẩn vị nhất nhé!`
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition shadow-2xs"
        >
          <ChefHat size={15} />
          <span>Hỏi AI Bếp Trưởng</span>
        </Link>
      </div>

      {cookbookError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2 border-t border-red-200 dark:border-red-900">
          <AlertCircle size={14} />
          <span>{cookbookError}</span>
        </div>
      )}
    </div>
  );
};
