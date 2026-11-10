import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Flame,
  Users,
  RefreshCw,
  BookOpen,
  ArrowUpRight,
  ChefHat,
  ShoppingBag,
  MapPin,
  Bookmark,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { RecipeImage } from '../components/RecipeImage';
import { VideoPlayer } from '../components/CommunityUi';
import { recipeService } from '../services/recipeService';
import { cookbookService } from '../services/cookbookService';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/apiClient';
import { RecipeStepBox } from '../components/RecipeStepBox';
import { ContentInteractions } from '../components/ContentInteractions';
import type { RecipeDetail } from '../types/recipe';

function inferIngredientCategory(name: string): { category: 'produce' | 'protein' | 'grains' | 'spices'; categoryLabel: string } {
  const lower = name.toLowerCase();
  if (lower.includes('đậu') || lower.includes('tofu') || lower.includes('tàu hũ') || lower.includes('chả') || lower.includes('sườn') || lower.includes('tempeh') || lower.includes('hạt điều') || lower.includes('hạt sen')) {
    return { category: 'protein', categoryLabel: 'Đậu hũ & Đạm thực vật' };
  }
  if (lower.includes('nước tương') || lower.includes('xì dầu') || lower.includes('muối') || lower.includes('tiêu') || lower.includes('đường') || lower.includes('dầu') || lower.includes('sốt') || lower.includes('hạt nêm') || lower.includes('hạt nấm') || lower.includes('tương') || lower.includes('bột') || lower.includes('mè')) {
    return { category: 'spices', categoryLabel: 'Gia vị bếp chay' };
  }
  if (lower.includes('gạo') || lower.includes('bún') || lower.includes('phở') || lower.includes('mì') || lower.includes('miến') || lower.includes('yến mạch') || lower.includes('bánh')) {
    return { category: 'grains', categoryLabel: 'Tinh bột & Ngũ cốc' };
  }
  return { category: 'produce', categoryLabel: 'Rau củ & Nấm tươi' };
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Cookbook action state
  const [savingCookbook, setSavingCookbook] = useState(false);
  const [cookbookSaved, setCookbookSaved] = useState(false);
  const [cookbookError, setCookbookError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setRecipe(null); setError('');
    if (!id) { setError('Không tìm thấy công thức.'); setLoading(false); return; }
    recipeService.detail(id, controller.signal).then(value => { if (!controller.signal.aborted) setRecipe(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);

  const ingredientStrings = recipe?.ingredients?.map(ing => `${ing.name}: ${ing.amount} ${ing.unit}`.trim()) || [];

  const handleSaveToCookbook = async () => {
    if (!isAuthenticated) {
      setCookbookError('Vui lòng đăng nhập để lưu công thức vào Sổ tay món ăn.');
      return;
    }
    if (!recipe) return;
    setSavingCookbook(true);
    setCookbookError('');
    try {
      await cookbookService.save({
        title: recipe.title,
        description: recipe.description || `Công thức món ${recipe.title}`,
        cookTimeMinutes: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 20,
        difficulty: 'MEDIUM',
        estimatedCalories: recipe.calories || 250,
        dietaryType: recipe.tags?.map(t => t.name).join(', ') || 'Thuần chay',
        ingredients: ingredientStrings,
        instructions: recipe.instructions || [],
        sourceImage: recipe.imageUrl,
        aiGenerated: false,
      });
      setCookbookSaved(true);
      setTimeout(() => setCookbookSaved(false), 5000);
    } catch (err) {
      setCookbookError(errorMessage(err));
    } finally {
      setSavingCookbook(false);
    }
  };

  return <MainLayout><div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <Link to="/explore" className="inline-flex gap-2 items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-6 hover:underline"><ArrowLeft size={16} /> Quay lại khám phá công thức</Link>
    {loading && <p role="status" className="p-8 text-center text-sm text-slate-500">Đang tải công thức...</p>}
    {error && <div role="alert" className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300"><p>{error}</p><button onClick={() => setReload(value => value + 1)} className="flex items-center gap-2 mt-4 font-bold text-xs underline"><RefreshCw size={16} /> Thử lại</button></div>}
    {recipe && <><div className="grid md:grid-cols-2 gap-8 items-start bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <RecipeImage src={recipe.imageUrl} title={recipe.title} detail />
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4">{recipe.title}</h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-line break-words leading-relaxed">{recipe.description}</p>
        <div className="flex flex-wrap gap-5 my-6 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex gap-2 items-center"><Clock size={16} className="text-emerald-600" />{recipe.prepTimeMinutes ?? '--'} phút chuẩn bị</span>
          <span className="flex gap-2 items-center"><Clock size={16} className="text-emerald-600" />{recipe.cookTimeMinutes ?? '--'} phút nấu</span>
          <span className="flex gap-2 items-center"><Users size={16} className="text-emerald-600" />{recipe.servings ?? '--'} khẩu phần</span>
        </div>
        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{recipe.tags?.map(tag => tag.name).join(' · ')}</p>
        <section className="border-t border-slate-100 dark:border-slate-800 mt-6 pt-5" aria-label="Dinh dưỡng mỗi khẩu phần">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Dinh dưỡng mỗi khẩu phần</h2>
          <p className="flex gap-2 items-center text-emerald-700 dark:text-emerald-400 font-extrabold text-base mb-4"><Flame size={18} />{recipe.calories ?? '--'} kcal</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {([['Đạm thực vật', recipe.proteinGrams], ['Tinh bột', recipe.carbsGrams], ['Chất béo', recipe.fatGrams], ['Chất xơ', recipe.fiberGrams]] as const).map(([label, value]) =>
              <div key={label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700"><dt className="text-slate-400">{label}</dt><dd className="font-extrabold text-slate-800 dark:text-white mt-0.5">{value == null ? 'Chưa có' : value + ' g'}</dd></div>)}
          </dl>
        </section>

        {/* Action Buttons: Unified Ecosystem Actions */}
        <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSaveToCookbook}
            disabled={savingCookbook}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              cookbookSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {cookbookSaved ? <CheckCircle2 size={15} /> : <Bookmark size={15} className="text-emerald-600" />}
            <span>{cookbookSaved ? 'Đã lưu vào Sổ tay!' : savingCookbook ? 'Đang lưu...' : 'Lưu vào Sổ tay'}</span>
          </button>

          <Link
            to="/settings?tab=calendar"
            state={{
              importedRecipeTitle: recipe.title,
              importedRecipeCalories: recipe.calories || 250,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition shadow-xs"
          >
            <Calendar size={15} className="text-sky-600" />
            <span>Thêm vào Lịch ăn 30 ngày</span>
          </Link>

          <Link
            to="/smart-market"
            state={{
              planTitle: recipe.title,
              recipeSummary: {
                title: recipe.title,
                cookTimeMinutes: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 20,
                calories: recipe.calories || 0,
                servings: recipe.servings || 2,
              },
              importedItems: recipe.ingredients?.map((ing, idx) => {
                const { category, categoryLabel } = inferIngredientCategory(ing.name);
                return {
                  id: `rec-ing-${Date.now()}-${idx}`,
                  name: ing.name.trim(),
                  amount: `${ing.amount} ${ing.unit}`.trim(),
                  category,
                  categoryLabel,
                  mealNote: `Món: ${recipe.title}`,
                  checked: false,
                };
              }) || []
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
          >
            <ShoppingBag size={15} /> Đi chợ mua nguyên liệu
          </Link>

          <Link
            to="/ai-chef"
            state={{
              source: 'recipe-detail',
              title: `Nấu: ${recipe.title}`,
              recipeContext: {
                title: recipe.title,
                cookTimeMinutes: (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) || 20,
                estimatedCalories: recipe.calories || 0,
                dietaryType: recipe.tags?.map(t => t.name).join(', ') || 'Thuần chay',
                ingredients: ingredientStrings,
                instructions: recipe.instructions || [],
              },
              initialPrompt: `Tôi đang xem công thức món "${recipe.title}" (${recipe.calories ?? '--'} kcal/khẩu phần, Đạm: ${recipe.proteinGrams ?? '--'}g, Tinh bột: ${recipe.carbsGrams ?? '--'}g, Chất béo: ${recipe.fatGrams ?? '--'}g, Chất xơ: ${recipe.fiberGrams ?? '--'}g). Nguyên liệu gồm: ${ingredientStrings.join(', ')}. Bếp trưởng hãy tư vấn bí quyết nấu món này ngon nhất, cách biến tấu hoặc bảo quản và trả lời câu hỏi tiếp theo của tôi nhé!`
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
          >
            <ChefHat size={15} /> Hỏi AI Bếp Trưởng
          </Link>

          <Link
            to="/restaurants"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-400 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
          >
            <MapPin size={15} className="text-emerald-600" /> Quán chay gần đây
          </Link>
        </div>

        {cookbookError && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900 rounded-xl">
            <AlertCircle size={14} />
            <span>{cookbookError}</span>
          </div>
        )}
      </div>
    </div>
      <div className="grid md:grid-cols-[1fr_2fr] gap-8 mt-8">
        <section className="min-w-0 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"><h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Nguyên liệu</h2>
          <p className="text-xs text-slate-400 mb-4">Cho cả mẻ{recipe.servings ? ` (${recipe.servings} khẩu phần)` : ''}</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">{recipe.ingredients?.map((ingredient, index) =>
            <li key={ingredient.ingredientId || index} className="py-2.5 flex justify-between gap-4">
              <span className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-200">{ingredient.name}{ingredient.allergenType && <span className="block text-[11px] text-rose-600 font-semibold">Dị nguyên: {ingredient.allergenType}</span>}</span>
              <span className="text-slate-500 font-semibold shrink-0">{ingredient.amount} {ingredient.unit}</span>
            </li>)}</ul>
        </section>
        <section className="min-w-0 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Các bước thực hiện</h2>
          <div className="space-y-3.5">
            {recipe.instructions?.map((step, index) => (
              <RecipeStepBox
                key={index}
                stepNumber={index + 1}
                content={step}
              />
            ))}
          </div>
        </section>
      </div>
      {!!recipe.videos?.length && <section className="mt-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"><h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Video hướng dẫn nấu</h2><div className="grid md:grid-cols-2 gap-6">{recipe.videos.map(video => <article key={video.id} className="min-w-0"><h3 className="font-semibold text-sm mb-3 text-slate-800 dark:text-white"><Link to={'/videos/' + video.id}>{video.title}</Link></h3><VideoPlayer video={video} /></article>)}</div></section>}
      
      {/* Related Blogs Section */}
      <section className="mt-8 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-600" />
              Cẩm nang &amp; Bài viết liên quan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kinh nghiệm chế biến, lựa chọn nguyên liệu và câu chuyện dinh dưỡng từ cộng đồng VEGEAI</p>
          </div>
          <Link to="/blog" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto">
            Xem thêm Blog <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/blog" className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 transition group shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">Kỹ thuật nấu chay</span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 mt-2 truncate">Bí quyết nêm nếm món chay thanh ngọt tự nhiên không cần hạt nêm công nghiệp</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">Sử dụng mía lau, củ sen, nấm hương và bắp ngọt để tạo vị ngọt hậu tự nhiên cho mọi món canh và kho.</p>
          </Link>
          <Link to="/blog" className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 transition group shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-950 px-2.5 py-0.5 rounded-full">Dinh dưỡng thực vật</span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 mt-2 truncate">Bổ sung đủ đạm và khoáng chất cho người mới bắt đầu ăn chay</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">Phối hợp giữa đậu hạt, đậu hũ non, hạt lanh và rau xanh thẫm để không lo thiếu chất hay mệt mỏi.</p>
          </Link>
        </div>
      </section>

      {/* Community Review, Ratings & Cooking Photo Upload */}
      <section className="mt-8">
        <ContentInteractions type="RECIPE" id={recipe.recipeId} />
      </section>
    </>}
  </div></MainLayout>;
}
