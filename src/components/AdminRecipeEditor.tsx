import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';
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
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm mt-1.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950';

export function AdminRecipeEditor({ tagsVersion = 0, initialId, onCancel, onSaved }: { tagsVersion?: number; initialId?: string; onCancel?: () => void; onSaved?: () => void }) {
  const [form, setForm] = useState<RecipeInput>(empty);
  const [id, setId] = useState('');
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [linkedVideos, setLinkedVideos] = useState<CommunityVideo[]>([]);
  useEffect(() => { recipeService.tags().then(values => setTags(Object.values(values).flat())).catch(reason => setError(errorMessage(reason))); }, [tagsVersion]);
  const useRecipe = (recipe: RecipeDetail) => {
    setId(recipe.recipeId); setDeleting(false);
    setLinkedVideos(recipe.videos || []);
    setForm({ ...recipe, description: recipe.description || '', imageUrl: recipe.imageUrl || '',
      status: recipe.status as RecipeInput['status'], tagCodes: recipe.tags.map(tag => tag.code), videoIds: (recipe.videos || []).map(video => video.id) });
  };
  useEffect(() => {
    if (!initialId) return;
    let active = true;
    setBusy(true); setError(''); setMessage('');
    recipeService.adminDetail(initialId)
      .then(recipe => { if (active) useRecipe(recipe); })
      .catch(reason => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [initialId]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const recipe = await recipeService.save({ ...form, title: form.title.trim(),
        ingredients: form.ingredients.map(item => ({ ...item, name: item.name.trim() })),
        instructions: form.instructions.map(step => step.trim()),
      }, id || undefined);
      useRecipe(recipe); setMessage('Đã lưu công thức: ' + recipe.title); onSaved?.();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError(''); setMessage('');
    try { await recipeService.remove(id); setId(''); setForm(empty); setDeleting(false); setMessage('Đã xóa công thức.'); onSaved?.(); onCancel?.(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">{onCancel && <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><ArrowLeft size={16} /> Quay lại danh sách</button>}<div><h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{id ? 'Chỉnh sửa công thức' : 'Tạo công thức mới'}</h2><p className="mt-1 text-sm text-slate-500">Cập nhật nội dung, dinh dưỡng, nguyên liệu và hướng dẫn chế biến.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <form onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Tên món<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} /></label><label className="text-sm">Ảnh URL<input inputMode="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className={inputClass} /></label></div>
      <label className="block text-sm">Mô tả<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} /></label>
      <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Thời gian & dinh dưỡng <span className="ml-2 text-xs font-normal text-slate-500">Mở khi cần nhập chi tiết</span></summary><div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">{numericFields.map(([key, label]) => <label key={key} className="text-sm">{label}<input type="number" min={key === 'servings' ? 1 : 0} step={key.endsWith('Grams') ? '0.1' : '1'} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : undefined })} className={inputClass} /></label>)}</div></details>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Độ khó<select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as RecipeInput['difficulty'] })} className={inputClass}><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select></label><label className="text-sm">Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RecipeInput['status'] })} className={inputClass}><option value="PUBLISHED">Công khai</option><option value="DRAFT">Bản nháp</option>{id && <option value="ARCHIVED">Lưu trữ</option>}</select></label></div>
      <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Thẻ phân loại <span className="ml-2 text-xs font-normal text-slate-500">{form.tagCodes.length} thẻ đã chọn</span></summary><div className="mt-4 flex flex-wrap gap-3">{tags.map(tag => <label key={tag.code} className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.tagCodes.includes(tag.code)} onChange={() => setForm({ ...form, tagCodes: form.tagCodes.includes(tag.code) ? form.tagCodes.filter(code => code !== tag.code) : [...form.tagCodes, tag.code] })} />{tag.name}</label>)}</div></details>
      <div><h3 className="font-semibold text-sm mb-2">Nguyên liệu</h3><div className="space-y-2">{form.ingredients.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] sm:grid-cols-[minmax(0,1fr)_80px_80px_36px] gap-2 items-center"><input aria-label={'Nguyên liệu ' + (index + 1)} required value={item.name} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, name: e.target.value } : value) })} className={inputClass + ' col-span-3 sm:col-span-1'} /><input aria-label={'Lượng nguyên liệu ' + (index + 1)} type="number" min="0" step="0.1" value={item.amount ?? ''} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, amount: e.target.value ? Number(e.target.value) : undefined } : value) })} className={inputClass} /><input aria-label={'Đơn vị ' + (index + 1)} value={item.unit || ''} onChange={e => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, unit: e.target.value } : value) })} className={inputClass} /><button title="Bỏ nguyên liệu" aria-label="Bỏ nguyên liệu" type="button" disabled={form.ingredients.length === 1} onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })}><X size={18} /></button></div>)}</div><button type="button" onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: '', unit: '' }] })} className="flex gap-2 items-center mt-3 text-sm text-emerald-700"><Plus size={16} /> Thêm nguyên liệu</button></div>
      <div><h3 className="font-semibold text-sm mb-2">Các bước nấu</h3><div className="space-y-2">{form.instructions.map((step, index) => <div key={index} className="flex gap-2 items-center"><textarea aria-label={'Bước nấu ' + (index + 1)} required rows={2} value={step} onChange={e => setForm({ ...form, instructions: form.instructions.map((value, i) => i === index ? e.target.value : value) })} className={inputClass} /><button title="Bỏ bước" aria-label="Bỏ bước" type="button" disabled={form.instructions.length === 1} onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== index) })}><X size={18} /></button></div>)}</div><button type="button" onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })} className="flex gap-2 items-center mt-3 text-sm text-emerald-700"><Plus size={16} /> Thêm bước</button></div>
      <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Video hướng dẫn <span className="ml-2 text-xs font-normal text-slate-500">{form.videoIds?.length || 0} video đã liên kết</span></summary><div className="mt-4"><RecipeVideoPicker ids={form.videoIds || []} initial={linkedVideos} change={videoIds => setForm({ ...form, videoIds })} /></div></details>
      <div className="flex flex-wrap gap-4"><button type="submit" className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg"><Save size={18} />{busy ? 'Đang xử lý...' : 'Lưu công thức'}</button>{id && <button type="button" onClick={() => setDeleting(true)} className="flex gap-2 items-center text-red-700"><Trash2 size={18} /> Xóa</button>}</div>
      {deleting && <div role="alert" className="border border-red-200 rounded-lg p-4"><p className="text-sm mb-3">Xóa công thức “{form.title}”?</p><div className="flex gap-4"><button type="button" onClick={remove} className="text-red-700 font-semibold">Xác nhận xóa</button><button type="button" onClick={() => setDeleting(false)}>Hủy</button></div></div>}
    </fieldset></form>
  </section>;
}
