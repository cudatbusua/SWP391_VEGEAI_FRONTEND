import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, ShoppingBag } from 'lucide-react';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { FridgeRecipeMatches as Matches } from '../types/recipe';

export function FridgeRecipeMatches() {
  const [data, setData] = useState<Matches | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError(''); setData(null);
    try { setData(await recipeService.matchFridge()); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-gray-200 dark:border-slate-800 pt-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold text-slate-900 dark:text-white">Nấu gì từ tủ lạnh?</h2><button disabled={busy} onClick={load} className="flex gap-2 items-center text-emerald-700 dark:text-emerald-400 font-semibold disabled:opacity-50"><ChefHat size={20} />{busy ? 'Đang tìm món...' : 'Gợi ý món ăn'}</button></div>
    {error && <p role="alert" className="text-red-700 dark:text-red-400 mt-4">{error}</p>}
    {data && <><p className="text-sm text-gray-600 dark:text-slate-400 my-4">{data.canCookNowCount} món đủ nguyên liệu · {data.missingFewCount} món cần mua thêm</p>
      {!data.matchedRecipes.length && <p role="status" className="text-slate-600 dark:text-slate-400">Chưa có món phù hợp. Thêm nguyên liệu rồi thử lại.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{data.matchedRecipes.map(match => <article key={match.recipe.recipeId} className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-4"><Link to={'/recipe/' + match.recipe.recipeId} className="font-bold text-emerald-700 dark:text-emerald-400">{match.recipe.title}</Link><p className="text-sm mt-2 text-slate-800 dark:text-slate-200">Đủ {match.matchPercentage}% nguyên liệu</p><p className="text-sm text-gray-600 dark:text-slate-400 mt-2">{match.recommendation}</p>{match.missingIngredients.length > 0 ? (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-xs text-amber-800 dark:text-amber-400 font-semibold truncate">
            Cần mua: {match.missingIngredients.join(', ')}
          </div>
          <Link
            to="/smart-market"
            state={{
              importedItems: match.missingIngredients.map(name => ({
                id: `missing-${Date.now()}-${name}`,
                name,
                category: 'produce',
                checked: false,
                mealNote: `Thiếu cho món ${match.recipe.title}`
              })),
              planTitle: `món ${match.recipe.title}`
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 text-[11px] font-bold shrink-0 transition"
          >
            <ShoppingBag size={12} />
            <span>Đi chợ mua</span>
          </Link>
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
          <span>✅ Đầy đủ nguyên liệu · Có thể nấu ngay!</span>
        </div>
      )}</article>)}</div>
    </>}
  </section>;
}
