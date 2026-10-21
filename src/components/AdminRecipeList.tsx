import { useEffect, useState } from 'react';
import { FilePenLine, Search, Trash2 } from 'lucide-react';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { AdminRecipeSummary } from '../types/recipe';
import type { PageResponse } from '../types/api';

const statusLabels: Record<AdminRecipeSummary['status'], string> = {
  PUBLISHED: 'Đang công khai',
  DRAFT: 'Bản nháp',
  ARCHIVED: 'Đã lưu trữ',
};

export function AdminRecipeList({ refreshVersion, onEdit }: { refreshVersion: number; onEdit: (id: string) => void }) {
  const [data, setData] = useState<PageResponse<AdminRecipeSummary> | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    recipeService.adminList({ keyword, status, page, size: 10 }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [keyword, status, page, refreshVersion]);

  const deleteRecipe = async (recipe: AdminRecipeSummary) => {
    if (deletingId) return;
    if (!window.confirm(`Xóa vĩnh viễn công thức “${recipe.title}”? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(recipe.recipeId);
    setError('');
    setNotice('');
    try {
      await recipeService.remove(recipe.recipeId);
      setNotice(`Đã xóa công thức “${recipe.title}”.`);
      if (data?.items.length === 1 && page > 0) setPage(value => value - 1);
      else setData(value => value ? { ...value, items: value.items.filter(item => item.recipeId !== recipe.recipeId), totalElements: value.totalElements - 1 } : value);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setDeletingId('');
    }
  };

  return <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Kho công thức</h2>
          <p className="mt-1 text-sm text-gray-500">Tìm và quản lý công thức công khai, bản nháp và công thức đã lưu trữ.</p>
        </div>
        <p className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
          {data?.totalElements ?? 0} công thức
        </p>
      </div>
      <form onSubmit={event => { event.preventDefault(); setPage(0); setKeyword(search.trim()); }} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc mô tả"
            aria-label="Tìm công thức" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </label>
        <select aria-label="Lọc trạng thái" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="PUBLISHED">Đang công khai</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ARCHIVED">Đã lưu trữ</option>
        </select>
        <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Tìm kiếm</button>
      </form>
    </div>

    {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {busy && <p role="status" className="p-8 text-center text-sm text-gray-500">Đang tải kho công thức...</p>}
    {!busy && !error && !data?.items.length && <p className="p-10 text-center text-sm text-gray-500">Không tìm thấy công thức phù hợp.</p>}

    {!busy && !error && !!data?.items.length && <div className="divide-y divide-gray-100">
      {data.items.map(recipe => <article key={recipe.recipeId} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
        <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-emerald-50 sm:w-28">
          {recipe.imageUrl ? <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" /> :
            <div className="flex h-full items-center justify-center text-sm font-semibold text-emerald-800">VEGEAI</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${recipe.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : recipe.status === 'DRAFT' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[recipe.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>{recipe.calories ?? '—'} kcal</span>
            <span>{recipe.proteinGrams ?? '—'} g đạm</span>
            <span>{recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} phút` : 'Chưa có thời gian nấu'}</span>
            <span>{recipe.difficulty === 'EASY' ? 'Dễ' : recipe.difficulty === 'MEDIUM' ? 'Vừa' : recipe.difficulty === 'HARD' ? 'Khó' : 'Chưa phân loại'}</span>
          </div>
          {!!recipe.tags.length && <div className="mt-2 flex flex-wrap gap-1.5">
            {recipe.tags.slice(0, 4).map(tag => <span key={tag.code} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag.name}</span>)}
            {recipe.tags.length > 4 && <span className="px-1 py-0.5 text-xs text-gray-500">+{recipe.tags.length - 4}</span>}
          </div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => onEdit(recipe.recipeId)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            <FilePenLine size={16} /> Chỉnh sửa
          </button>
          <button type="button" disabled={deletingId === recipe.recipeId} onClick={() => deleteRecipe(recipe)}
            aria-label={'Xóa công thức ' + recipe.title} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 size={16} /> Xóa
          </button>
        </div>
      </article>)}
    </div>}

    {!busy && !error && data && data.totalPages > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm sm:px-5">
      <span className="text-gray-500">Trang {data.page + 1} / {data.totalPages}</span>
      <div className="flex gap-2">
        <button type="button" disabled={data.first} onClick={() => setPage(value => Math.max(0, value - 1))}
          className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">Trước</button>
        <button type="button" disabled={data.last} onClick={() => setPage(value => value + 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">Tiếp</button>
      </div>
    </div>}
  </section>;
}
