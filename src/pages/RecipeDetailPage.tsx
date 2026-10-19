import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Flame, Users, RefreshCw } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { RecipeImage } from '../components/RecipeImage';
import { VideoPlayer } from '../components/CommunityUi';
import { ContentInteractions } from '../components/ContentInteractions';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { RecipeDetail } from '../types/recipe';

export function RecipeDetailPage() {
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setRecipe(null); setError('');
    if (!id) { setError('Không tìm thấy công thức.'); setLoading(false); return; }
    recipeService.detail(id, controller.signal).then(value => { if (!controller.signal.aborted) setRecipe(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);
  return <MainLayout><div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <Link to="/" className="inline-flex gap-2 items-center text-sm text-emerald-700 mb-6"><ArrowLeft size={16} /> Công thức món chay</Link>
    {loading && <p role="status">Đang tải công thức...</p>}
    {error && <div role="alert"><p className="text-red-700">{error}</p><button onClick={() => setReload(value => value + 1)} className="flex items-center gap-2 mt-4"><RefreshCw size={16} /> Thử lại</button></div>}
    {recipe && <><div className="grid md:grid-cols-2 gap-8 items-start">
      <RecipeImage src={recipe.imageUrl} title={recipe.title} detail />
      <div className="min-w-0">
        <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>
        <p className="text-gray-600 whitespace-pre-line break-words">{recipe.description}</p>
        <div className="flex flex-wrap gap-5 my-6 text-sm">
          <span className="flex gap-2 items-center"><Clock size={18} />{recipe.prepTimeMinutes ?? '--'} phút chuẩn bị</span>
          <span className="flex gap-2 items-center"><Clock size={18} />{recipe.cookTimeMinutes ?? '--'} phút nấu</span>
          <span className="flex gap-2 items-center"><Users size={18} />{recipe.servings ?? '--'} khẩu phần</span>
        </div>
        <p className="text-sm text-emerald-700">{recipe.tags?.map(tag => tag.name).join(' · ')}</p>
        <section className="border-t mt-6 pt-5" aria-label="Dinh dưỡng mỗi khẩu phần">
          <h2 className="text-base font-bold mb-4">Dinh dưỡng mỗi khẩu phần</h2>
          <p className="flex gap-2 items-center text-emerald-700 font-semibold mb-4"><Flame size={18} />{recipe.calories ?? '--'} kcal</p>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {([['Đạm', recipe.proteinGrams], ['Carbs', recipe.carbsGrams], ['Chất béo', recipe.fatGrams], ['Chất xơ', recipe.fiberGrams]] as const).map(([label, value]) =>
              <div key={label}><dt className="text-gray-500">{label}</dt><dd className="font-semibold mt-1">{value == null ? 'Chưa có dữ liệu' : value + ' g'}</dd></div>)}
          </dl>
        </section>
      </div>
    </div>
      <div className="grid md:grid-cols-[1fr_2fr] gap-8 mt-10">
        <section className="min-w-0"><h2 className="text-xl font-bold mb-1">Nguyên liệu</h2>
          <p className="text-sm text-gray-500 mb-4">Cho cả mẻ{recipe.servings ? ` (${recipe.servings} khẩu phần)` : ''}</p>
          <ul className="divide-y divide-gray-200">{recipe.ingredients?.map((ingredient, index) =>
            <li key={ingredient.ingredientId || index} className="py-3 flex justify-between gap-4">
              <span className="min-w-0 break-words">{ingredient.name}{ingredient.allergenType && <span className="block text-xs text-red-700">Dị nguyên: {ingredient.allergenType}</span>}</span>
              <span className="text-gray-600 shrink-0">{ingredient.amount} {ingredient.unit}</span>
            </li>)}</ul>
        </section>
        <section className="min-w-0"><h2 className="text-xl font-bold mb-4">Cách nấu</h2><ol className="space-y-6">
          {recipe.instructions?.map((step, index) => <li key={index}><h3 className="text-sm font-bold text-emerald-700 mb-2">Bước {index + 1}</h3><p className="text-gray-700 whitespace-pre-line">{step}</p></li>)}
        </ol></section>
      </div>
      {isAuthenticated && !!recipe.videos?.length && <section className="mt-10 border-t pt-8"><h2 className="text-xl font-bold mb-5">Video cách nấu</h2><div className="grid md:grid-cols-2 gap-6">{recipe.videos.map(video => <article key={video.id} className="min-w-0"><h3 className="font-semibold mb-3"><Link to={'/videos/' + video.id}>{video.title}</Link></h3><VideoPlayer video={video} /></article>)}</div></section>}
      <ContentInteractions type="RECIPE" id={recipe.recipeId} />
    </>}
  </div></MainLayout>;
}
