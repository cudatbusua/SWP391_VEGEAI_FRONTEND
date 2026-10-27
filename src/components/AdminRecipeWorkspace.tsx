import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Edit3, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { AdminRecipeEditor } from './AdminRecipeEditor';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { AdminRecipeSummary, RecipeTag } from '../types/recipe';

const groups = { DIETARY_TYPE: 'Trường phái', COOKING_METHOD: 'Cách chế biến', DISH_CATEGORY: 'Loại món', NUTRITION_GOAL: 'Dinh dưỡng', OCCASION: 'Hoàn cảnh', DIETARY_RESTRICTION: 'Kiêng / dị ứng' };
const statusLabel = { PUBLISHED: 'Đang công khai', DRAFT: 'Bản nháp', ARCHIVED: 'Đã lưu trữ' } as const;
const difficultyLabel = { EASY: 'Dễ', MEDIUM: 'Vừa', HARD: 'Khó' } as const;

export function AdminRecipeWorkspace() {
  const [section, setSection] = useState<'recipes' | 'tags'>('recipes');
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [selectedId, setSelectedId] = useState<string>();
  const [version, setVersion] = useState(0);
  const [recipes, setRecipes] = useState<AdminRecipeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRecipes = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await recipeService.adminList({ keyword: query || undefined, status: status || undefined, page, size: 20 });
      setRecipes(data.items || []); setTotal(data.totalElements || 0); setPages(Math.max(1, data.totalPages || 1));
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }, [page, query, status]);

  useEffect(() => { if (section === 'recipes' && mode === 'list') void loadRecipes(); }, [section, mode, version, loadRecipes]);
  const openEditor = (id?: string) => { setSelectedId(id); setMode('editor'); };
  const archiveRecipe = async (recipe: AdminRecipeSummary) => {
    if (!window.confirm(`Ẩn công thức “${recipe.title}”?`)) return;
    setLoading(true); setError('');
    try {
      const detail = await recipeService.adminDetail(recipe.recipeId);
      await recipeService.save({ ...detail, description: detail.description || '', imageUrl: detail.imageUrl || '', status: 'ARCHIVED', tagCodes: detail.tags.map(tag => tag.code), videoIds: (detail.videos || []).map(video => video.id) }, recipe.recipeId);
      setVersion(value => value + 1);
    } catch (reason) { setError(errorMessage(reason)); setLoading(false); }
  };
  const deleteRecipe = async (recipe: AdminRecipeSummary) => {
    if (!window.confirm(`Xóa vĩnh viễn công thức “${recipe.title}”? Thao tác này không thể hoàn tác.`)) return;
    setLoading(true); setError('');
    try { await recipeService.remove(recipe.recipeId); setVersion(value => value + 1); }
    catch (reason) { setError(errorMessage(reason)); setLoading(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
      <button type="button" onClick={() => { setSection('recipes'); setMode('list'); }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${section === 'recipes' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'}`}><BookOpen size={17} /> Công thức & dinh dưỡng</button>
      <button type="button" onClick={() => setSection('tags')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${section === 'tags' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'}`}><Tags size={17} /> Thẻ phân loại</button>
    </div>

    {section === 'recipes' && <>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div><h2 className="font-bold text-slate-900 dark:text-white">Quản lý công thức</h2><p className="mt-0.5 text-sm text-slate-500">Danh sách và biểu mẫu được tách riêng để dễ tìm và chỉnh sửa.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setMode('list')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === 'list' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'}`}>Danh sách công thức</button><button type="button" onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"><Plus size={17} /> Thêm công thức</button></div>
      </div>

      {mode === 'list' ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Kho công thức</h2><p className="mt-1 text-sm text-slate-500">Tìm và quản lý công thức công khai, bản nháp và công thức đã lưu trữ.</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{total} công thức</span></div>
          <form onSubmit={event => { event.preventDefault(); setPage(0); setQuery(keyword.trim()); }} className="mt-5 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]"><label className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm theo tên hoặc mô tả" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950" /></label><select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"><option value="">Tất cả trạng thái</option><option value="PUBLISHED">Đang công khai</option><option value="DRAFT">Bản nháp</option><option value="ARCHIVED">Đã lưu trữ</option></select><button className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">Tìm kiếm</button></form>
        </div>
        {error && <p role="alert" className="mx-5 mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="border-t border-slate-100 dark:border-slate-800">
          {loading ? <div className="p-10 text-center text-sm text-slate-500">Đang tải công thức...</div> : recipes.length === 0 ? <div className="p-10 text-center"><BookOpen className="mx-auto mb-2 text-slate-300" size={30} /><p className="font-semibold text-slate-700 dark:text-slate-200">Chưa có công thức phù hợp</p><p className="mt-1 text-sm text-slate-500">Thử đổi từ khóa, trạng thái hoặc tạo công thức mới.</p></div> : recipes.map(recipe => <article key={recipe.recipeId} className="flex flex-col gap-4 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center dark:border-slate-800">
            <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-32 dark:bg-slate-800">{recipe.imageUrl ? <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-slate-300"><BookOpen size={28} /></div>}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900 dark:text-white">{recipe.title}</h3>{recipe.status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${recipe.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : recipe.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel[recipe.status]}</span>}</div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500"><span>{recipe.calories ?? '—'} kcal</span><span>{recipe.proteinGrams ?? '—'} g đạm</span><span>{recipe.cookTimeMinutes ?? '—'} phút</span><span>{difficultyLabel[recipe.difficulty]}</span></div><div className="mt-2 flex flex-wrap gap-1.5">{recipe.tags.slice(0, 4).map(tag => <span key={tag.tagId} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag.name}</span>)}{recipe.tags.length > 4 && <span className="px-1 py-1 text-[11px] text-slate-500">+{recipe.tags.length - 4}</span>}</div></div>
            <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => openEditor(recipe.recipeId)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"><Edit3 size={16} /> Chỉnh sửa</button>{recipe.status !== 'ARCHIVED' && <button type="button" onClick={() => void archiveRecipe(recipe)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Ẩn</button>}<button type="button" onClick={() => void deleteRecipe(recipe)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Xóa</button></div>
          </article>)}
        </div>
        {pages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm dark:border-slate-800"><span className="text-slate-500">Trang {page + 1}/{pages}</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(value => value - 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={17} /></button><button disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={17} /></button></div></div>}
      </section> : <AdminRecipeEditor key={selectedId || 'new'} initialId={selectedId} tagsVersion={version} onCancel={() => setMode('list')} onSaved={() => setVersion(value => value + 1)} />}
    </>}

    {section === 'tags' && <TagManager version={version} onChange={() => setVersion(value => value + 1)} />}
  </div>;
}

function TagManager({ version, onChange }: { version: number; onChange: () => void }) {
  const [tags, setTags] = useState<RecipeTag[]>([]); const [form, setForm] = useState({ code: '', name: '', group: 'DIETARY_TYPE', description: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [deleting, setDeleting] = useState<RecipeTag | null>(null);
  useEffect(() => { recipeService.adminTags().then(setTags).catch(reason => setError(errorMessage(reason))); }, [version]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await recipeService.createTag({ ...form, code: form.code.trim(), name: form.name.trim() }); setForm({ ...form, code: '', name: '', description: '' }); onChange(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  const remove = async () => { if (!deleting) return; setBusy(true); setError(''); try { await recipeService.removeTag(deleting.tagId); setDeleting(null); onChange(); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); } };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-extrabold">Thẻ phân loại</h2><p className="mt-1 text-sm text-slate-500">Quản lý bộ thẻ dùng để tìm kiếm và phân nhóm công thức.</p>{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<form onSubmit={create} className="mt-5"><fieldset disabled={busy} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium">Mã thẻ<input required pattern="[A-Z0-9_]{2,50}" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-sm font-medium">Tên thẻ<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><label className="text-sm font-medium">Nhóm<select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3">{Object.entries(groups).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="text-sm font-medium">Mô tả<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white lg:col-start-4"><Plus size={17} /> Thêm thẻ</button></fieldset></form>{deleting && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm"><span>Xóa thẻ “{deleting.name}”?</span><div><button disabled={busy} onClick={remove} className="mr-4 font-bold text-rose-700">Xác nhận xóa</button><button disabled={busy} onClick={() => setDeleting(null)}>Hủy</button></div></div>}<div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">{tags.map(tag => <div key={tag.tagId} className="flex items-center justify-between gap-3 py-3"><div><span className="font-semibold">{tag.name}</span><span className="block text-xs text-slate-500">{tag.code} · {groups[tag.group as keyof typeof groups] || tag.group}</span></div><button disabled={busy} aria-label={'Xóa thẻ ' + tag.name} onClick={() => setDeleting(tag)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div>)}</div></section>;
}
