import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, BookOpen, Leaf, Loader2, MapPin, RefreshCw, Flame, Info } from 'lucide-react';
import { mealPlanService } from '../services/mealPlanService';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { Region, Season, SeasonalRegionalResponse } from '../types/mealPlan';
import type { RecipeSummary } from '../types/recipe';

const SEASONS: { id: Season; label: string; icon: string }[] = [
  { id: 'XUAN', label: 'Mùa Xuân', icon: '🌸' },
  { id: 'HA', label: 'Mùa Hạ (Hè)', icon: '☀️' },
  { id: 'THU', label: 'Mùa Thu', icon: '🍂' },
  { id: 'DONG', label: 'Mùa Đông', icon: '❄️' },
];

const REGIONS: { id: Region; label: string; tag: string }[] = [
  { id: 'MIEN_BAC', label: 'Miền Bắc', tag: 'Thanh tao · Giữ ấm' },
  { id: 'MIEN_TRUNG', label: 'Miền Trung', tag: 'Đậm đà · Nồng ấm' },
  { id: 'MIEN_NAM', label: 'Miền Nam', tag: 'Thanh mát · Tươi ngọt' },
];

// 3–6 dishes: pick columns so no card is left alone on the last row (4 → 2×2 or one row of 4).
const dishGridCols = (count: number) =>
  count === 3 ? 'sm:grid-cols-3' : count === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

// Same month-to-season mapping as SeasonalMealService on the backend.
const currentSeason = (): Season => SEASONS[Math.floor(new Date().getMonth() / 3)].id;

// Dishes without a recipeId (curated text, or AI dishes not in the library): split "A, B & C" into dish names and look each one up in the real recipe catalogue.
const dishParts = (dishName: string) => dishName.split(/\s*(?:&|,)\s*/).map(part => part.trim()).filter(part => part.length >= 3).slice(0, 3);

async function findRecipes(dishName: string, signal: AbortSignal): Promise<RecipeSummary[]> {
  const pages = await Promise.all(dishParts(dishName).map(keyword => recipeService.filter({ keyword, page: 0, size: 1 }, signal).catch(() => null)));
  const found = new Map<string, RecipeSummary>();
  pages.forEach(page => page?.items.forEach(recipe => found.set(recipe.recipeId, recipe)));
  return [...found.values()];
}

export function SeasonalRegionalMealsView() {
  const [season, setSeason] = useState<Season>(currentSeason);
  const [region, setRegion] = useState<Region>('MIEN_NAM');
  // reload > 0 means the user pressed "Làm mới": ask the AI again instead of reusing the cached suggestions.
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<SeasonalRegionalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    mealPlanService.seasonalRegional(season, region, controller.signal, reload > 0)
      .then(setData)
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [season, region, reload]);

  const isAi = data?.source === 'AI';

  const [related, setRelated] = useState<Record<string, RecipeSummary[]>>({});
  useEffect(() => {
    setRelated({});
    if (!data) return;
    const controller = new AbortController();
    Promise.all(data.suggestions.filter(dish => !dish.recipeId).map(async dish => [dish.dishName, await findRecipes(dish.dishName, controller.signal)] as const))
      .then(entries => { if (!controller.signal.aborted) setRelated(Object.fromEntries(entries)); })
      .catch(() => {});
    return () => controller.abort();
  }, [data]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase text-emerald-600 tracking-wider mb-1">
            <Leaf className="w-4 h-4" />
            Món chay theo mùa & vùng miền
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Thực Đơn Thuần Thực Vật Theo Thời Khí</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAi
              ? 'AI CrocVeggie gợi ý theo mùa, vùng miền, chế độ ăn và dị ứng trong hồ sơ của bạn. Lượng calo là ước tính; hãy kiểm tra nguyên liệu nếu bạn có dị ứng. Không thay thế tư vấn của chuyên gia dinh dưỡng.'
              : 'Danh sách món và lượng calo là ước tính do VEGEAI biên soạn sẵn theo mùa và vùng miền, không thay thế tư vấn của chuyên gia dinh dưỡng.'}
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setReload(value => value + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto shrink-0 whitespace-nowrap disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'AI đang soạn…' : 'Làm mới gợi ý'}</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-emerald-600" /><span>Mùa trong năm</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="group" aria-label="Mùa trong năm">
            {SEASONS.map(s => (
              <button
                key={s.id}
                type="button"
                aria-pressed={season === s.id}
                onClick={() => setSeason(s.id)}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  season === s.id ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <span>{s.icon}</span><span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" /><span>Vùng miền ẩm thực</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" role="group" aria-label="Vùng miền ẩm thực">
            {REGIONS.map(r => (
              <button
                key={r.id}
                type="button"
                aria-pressed={region === r.id}
                onClick={() => setRegion(r.id)}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                  region === r.id ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                <span>{r.label}</span>
                <span className={`text-[9px] font-normal opacity-80 ${region === r.id ? 'text-emerald-100' : 'text-slate-400'}`}>{r.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <p role="status" className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 text-center text-xs text-violet-800 dark:text-violet-300 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          AI đang phân tích thời khí, nông sản rộ vụ và hồ sơ của bạn… (thường mất 10–20 giây)
        </p>
      )}
      {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</div>}
      {data?.notice && !loading && (
        <div role="status" className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{data.notice}</span>
          <button type="button" onClick={() => setReload(value => value + 1)} className="font-bold hover:underline shrink-0 cursor-pointer">Thử lại AI</button>
        </div>
      )}

      {data && (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">{data.seasonNameVi} · {data.regionNameVi}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"><strong>Đặc điểm khí hậu:</strong> {data.climateSummary}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Nông sản rộ vụ:</span>
              {data.highlightedProduce.map(p => (
                <span key={p} className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">✓ {p}</span>
              ))}
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{data.nutritionAdvice}</span>
            </div>
          </div>

          <div className={`grid gap-4 ${dishGridCols(data.suggestions.length)}`}>
            {data.suggestions.map(dish => (
              <div key={dish.mealType + dish.dishName} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-emerald-400 transition">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">{dish.mealType}</span>
                    <span className="font-extrabold text-amber-500 flex items-center gap-0.5 text-xs" title="Ước tính"><Flame className="w-3.5 h-3.5" />~{dish.estimatedCalories} kcal</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2">{dish.dishName}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1"><strong className="text-slate-700 dark:text-slate-300">Nguyên liệu:</strong> {dish.seasonalIngredients}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[11px]">
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold line-clamp-2">💡 {dish.healthBenefits}</p>
                  <p className="text-slate-400 text-[10px] line-clamp-2 italic">Bếp mách: {dish.cookingTip}</p>
                </div>
                {dish.recipeId && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Link to={'/recipe/' + dish.recipeId} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                      <BookOpen className="w-3 h-3" />Xem công thức trong VEGEAI<ArrowUpRight className="w-3 h-3 shrink-0" />
                    </Link>
                  </div>
                )}
                {!dish.recipeId && !!related[dish.dishName]?.length && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><BookOpen className="w-3 h-3" />Công thức trong VEGEAI</p>
                    {related[dish.dishName].map(recipe => (
                      <Link key={recipe.recipeId} to={'/recipe/' + recipe.recipeId} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                        <span className="line-clamp-1">{recipe.title}</span><ArrowUpRight className="w-3 h-3 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
