import { useEffect, useState } from 'react';
import { Plus, Save, Search, Trash2, X } from 'lucide-react';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { RecipeDetail, RecipeInput, RecipeTag } from '../types/recipe';
import { RecipeVideoPicker } from './RecipeVideoPicker';
import type { CommunityVideo } from '../types/community';

const empty: RecipeInput = { title: '', description: '', imageUrl: '', difficulty: 'EASY', status: 'PUBLISHED',
  ingredients: [{ name: '', amount: undefined, unit: '' }], instructions: [''], tagCodes: [], videoIds: [] };
const numericFields = [
  ['prepTimeMinutes', 'Chuẩn bị (phút)'], ['cookTimeMinutes', 'Nấu (phút)'], ['servings', 'Khẩu phần'],
  ['calories', 'Calo'], ['proteinGrams', 'Đạm (g)'], ['carbsGrams', 'Carbs (g)'], ['fatGrams', 'Chất béo (g)'], ['fiberGrams', 'Chất xơ (g)'],
] as const;
const inputClass = 'w-full min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1';

export function AdminRecipeEditor({ tagsVersion = 0 }: { tagsVersion?: number }) {
  const [form, setForm] = useState<RecipeInput>(empty);
  const [id, setId] = useState('');
  const [lookup, setLookup] = useState('');
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [linkedVideos, setLinkedVideos] = useState<CommunityVideo[]>([]);
  useEffect(() => { recipeService.tags().then(values => setTags(Object.values(values).flat())).catch(reason => setError(errorMessage(reason))); }, [tagsVersion]);
  const useRecipe = (recipe: RecipeDetail) => {
    setId(recipe.recipeId); setLookup(recipe.recipeId); setDeleting(false);
    setLinkedVideos(recipe.videos || []);
    setForm({ ...recipe, description: recipe.description || '', imageUrl: recipe.imageUrl || '',
      status: recipe.status as RecipeInput['status'], tagCodes: recipe.tags.map(tag => tag.code), videoIds: (recipe.videos || []).map(video => video.id) });
  };
  const load = async () => {
    if (!lookup.trim() || busy) return;
    setBusy(true); setError(''); setMessage('');
    try { useRecipe(await recipeService.adminDetail(lookup.trim())); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const recipe = await recipeService.save({ ...form, title: form.title.trim(),
        ingredients: form.ingredients.map(item => ({ ...item, name: item.name.trim() })),
        instructions: form.instructions.map(step => step.trim()),
      }, id || undefined);
      useRecipe(recipe); setMessage('Đã lưu công thức: ' + recipe.title);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError(''); setMessage('');
    try { await recipeService.remove(id); setId(''); setLookup(''); setForm(empty); setDeleting(false); setMessage('Đã xóa công thức.'); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-gray-200 pt-6 space-y-4"><h2 className="text-xl font-bold">Quản lý công thức</h2>
    <div className="flex flex-wrap items-center gap-3"><input aria-label="ID công thức" value={lookup} onChange={e => setLookup(e.target.value)} placeholder="ID công thức cần chỉnh sửa" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" /><button title="Tải công thức" aria-label="Tải công thức" disabled={busy || !lookup.trim()} onClick={load} className="p-2 border rounded-lg disabled:opacity-40"><Search size={18} /></button><button disabled={busy} onClick={() => { setId(''); setLookup(''); setForm(empty); setDeleting(false); setError(''); setMessage(''); }} className="flex gap-2 items-center text-emerald-700"><Plus size={18} /> Tạo mới</button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Tên món<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} /></label><label className="text-sm">Ảnh URL<input inputMode="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className={inputClass} /></label></div>
      <label className="block text-sm">Mô tả<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} /></label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{numericFields.map(([key, label]) => <label key={key} className="text-sm">{label}<input type="number" min={key === 'servings' ? 1 : 0} step={key.endsWith('Grams') ? '0.1' : '1'} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} /></label>)}</div>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Độ khó<select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as RecipeInput['difficulty'] })} className={inputClass}><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select></label><label className="text-sm">Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RecipeInput['status'] })} className={inputClass}><option value="PUBLISHED">Công khai</option><option value="DRAFT">Bản nháp</option>{id && <option value="ARCHIVED">Lưu trữ</option>}</select></label></div>
      <fieldset><legend className="font-semibold text-sm mb-2">Thẻ phân loại</legend><div className="flex flex-wrap gap-3">{tags.map(tag => <label key={tag.code} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.tagCodes.includes(tag.code)} onChange={() => setForm({ ...form, tagCodes: form.tagCodes.includes(tag.code) ? form.tagCodes.filter(code => code !== tag.code) : [...form.tagCodes, tag.code] })} />{tag.name}</label>)}</div></fieldset>
      <div><h3 className="font-semibold text-sm mb-2">Nguyên liệu</h3><div className="space-y-2">{form.ingredients.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] sm:grid-cols-[minmax(0,1fr)_80px_80px_36px] gap-2 items-center"><input aria-label={'Nguyên liệu ' + (index + 1)} required value={item.name} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, name: e.target.value } : value) })} className={inputClass + ' col-span-3 sm:col-span-1'} /><input aria-label={'Lượng nguyên liệu ' + (index + 1)} type="number" min="0" step="0.1" value={item.amount ?? ''} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, amount: e.target.value ? Number(e.target.value) : undefined } : value) })} className={inputClass} /><input aria-label={'Đơn vị ' + (index + 1)} value={item.unit || ''} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, unit: e.target.value } : value) })} className={inputClass} /><button title="Bỏ nguyên liệu" aria-label="Bỏ nguyên liệu" type="button" disabled={form.ingredients.length === 1} onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })}><X size={18} /></button></div>)}</div><button type="button" onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: '', unit: '' }] })} className="flex gap-2 items-center mt-3 text-sm text-emerald-700"><Plus size={16} /> Thêm nguyên liệu</button></div>
      <div><h3 className="font-semibold text-sm mb-2">Các bước nấu</h3><div className="space-y-2">{form.instructions.map((step, index) => <div key={index} className="flex gap-2 items-center"><textarea aria-label={'Bước nấu ' + (index + 1)} required rows={2} value={step} onChange={e => setForm({ ...form, instructions: form.instructions.map((value, i) => i === index ? e.target.value : value) })} className={inputClass} /><button title="Bỏ bước" aria-label="Bỏ bước" type="button" disabled={form.instructions.length === 1} onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== index) })}><X size={18} /></button></div>)}</div><button type="button" onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })} className="flex gap-2 items-center mt-3 text-sm text-emerald-700"><Plus size={16} /> Thêm bước</button></div>
      <RecipeVideoPicker ids={form.videoIds || []} initial={linkedVideos} change={videoIds => setForm({ ...form, videoIds })} />
      <div className="flex flex-wrap gap-4"><button type="submit" className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg"><Save size={18} />{busy ? 'Đang xử lý...' : 'Lưu công thức'}</button>{id && <button type="button" onClick={() => setDeleting(true)} className="flex gap-2 items-center text-red-700"><Trash2 size={18} /> Xóa</button>}</div>
      {deleting && <div role="alert" className="border border-red-200 rounded-lg p-4"><p className="text-sm mb-3">Xóa công thức “{form.title}”?</p><div className="flex gap-4"><button type="button" onClick={remove} className="text-red-700 font-semibold">Xác nhận xóa</button><button type="button" onClick={() => setDeleting(false)}>Hủy</button></div></div>}
    </fieldset></form>
  </section>;
}
