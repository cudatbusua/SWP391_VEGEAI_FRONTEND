import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
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
  return <section className="border-t border-gray-200 pt-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Nấu gì từ tủ lạnh?</h2><button disabled={busy} onClick={load} className="flex gap-2 items-center text-emerald-700 font-semibold disabled:opacity-50"><ChefHat size={20} />{busy ? 'Đang tìm món...' : 'Gợi ý món ăn'}</button></div>
    {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
    {data && <><p className="text-sm text-gray-600 my-4">{data.canCookNowCount} món đủ nguyên liệu · {data.missingFewCount} món cần mua thêm</p>
      {!data.matchedRecipes.length && <p role="status">Chưa có món phù hợp. Thêm nguyên liệu rồi thử lại.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{data.matchedRecipes.map(match => <article key={match.recipe.recipeId} className="border border-gray-200 rounded-lg p-4"><Link to={'/recipe/' + match.recipe.recipeId} className="font-bold text-emerald-700">{match.recipe.title}</Link><p className="text-sm mt-2">Đủ {match.matchPercentage}% nguyên liệu</p><p className="text-sm text-gray-600 mt-2">{match.recommendation}</p>{match.missingIngredients.length > 0 && <p className="text-sm text-amber-800 mt-2">Cần mua: {match.missingIngredients.join(', ')}</p>}</article>)}</div>
    </>}
  </section>;
}
