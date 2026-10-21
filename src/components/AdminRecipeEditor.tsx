import { useEffect, useState } from 'react';
import { FilePenLine, Plus, Save, Trash2, X } from 'lucide-react';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { RecipeDetail, RecipeInput, RecipeTag } from '../types/recipe';
import { RecipeVideoPicker } from './RecipeVideoPicker';
import type { CommunityVideo } from '../types/community';

const empty: RecipeInput = {
  title: '', description: '', imageUrl: '', difficulty: 'EASY', status: 'PUBLISHED',
  ingredients: [{ name: '', amount: undefined, unit: '' }], instructions: [''], tagCodes: [], videoIds: [],
};
const numericFields = [
  ['prepTimeMinutes', 'Chuẩn bị (phút)'], ['cookTimeMinutes', 'Nấu (phút)'], ['servings', 'Khẩu phần'],
  ['calories', 'Calo'], ['proteinGrams', 'Đạm (g)'], ['carbsGrams', 'Carbs (g)'],
  ['fatGrams', 'Chất béo (g)'], ['fiberGrams', 'Chất xơ (g)'],
] as const;
const inputClass = 'mt-1 w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm';
const sectionClass = 'rounded-lg border border-gray-200 px-4 py-3';

export function AdminRecipeEditor({ tagsVersion = 0, initialRecipeId, onSaved, onDeleted }: {
  tagsVersion?: number;
  initialRecipeId?: string;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<RecipeInput>(empty);
  const [id, setId] = useState('');
  const [lookup, setLookup] = useState('');
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [linkedVideos, setLinkedVideos] = useState<CommunityVideo[]>([]);

  useEffect(() => {
    recipeService.tags()
      .then(values => setTags(Object.values(values).flat()))
      .catch(reason => setError(errorMessage(reason)));
  }, [tagsVersion]);

  useEffect(() => {
    if (!initialRecipeId) return;
    let active = true;
    setLookup(initialRecipeId);
    setBusy(true);
    setError('');
    recipeService.adminDetail(initialRecipeId)
      .then(recipe => { if (active) useRecipe(recipe); })
      .catch(reason => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [initialRecipeId]);

  const useRecipe = (recipe: RecipeDetail) => {
    setId(recipe.recipeId);
    setLookup(recipe.recipeId);
    setDeleting(false);
    // Keep the linked video records available to the picker when an existing recipe is loaded.
    setLinkedVideos(recipe.videos || []);
    setForm({
      ...recipe,
      description: recipe.description || '',
      imageUrl: recipe.imageUrl || '',
      status: recipe.status as RecipeInput['status'],
      tagCodes: recipe.tags.map(tag => tag.code),
      videoIds: (recipe.videos || []).map(video => video.id),
    });
  };

  const load = async () => {
    if (!lookup.trim() || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      useRecipe(await recipeService.adminDetail(lookup.trim()));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    setId('');
    setLookup('');
    setForm(empty);
    setLinkedVideos([]);
    setDeleting(false);
    setError('');
    setMessage('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const recipe = await recipeService.save({
        ...form,
        title: form.title.trim(),
        ingredients: form.ingredients.map(item => ({ ...item, name: item.name.trim() })),
        instructions: form.instructions.map(step => step.trim()),
      }, id || undefined);
      useRecipe(recipe);
      setMessage('Đã lưu công thức: ' + recipe.title);
      onSaved?.();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await recipeService.remove(id);
      startNew();
      onDeleted?.();
      setMessage('Đã xóa công thức.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div>
      <h2 className="text-lg font-bold">Quản lý công thức</h2>
      <p className="mt-1 text-sm text-gray-500">Nhập ID để mở công thức cần sửa hoặc tạo món mới.</p>
    </div>

    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
      <input aria-label="ID công thức" value={lookup} onChange={event => setLookup(event.target.value)}
        placeholder="ID công thức" className="min-w-48 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      <button type="button" disabled={busy || !lookup.trim()} onClick={load}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40">
        <FilePenLine size={16} /> Chỉnh sửa công thức
      </button>
      <button type="button" disabled={busy} onClick={startNew}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
        <Plus size={17} /> Tạo mới
      </button>
    </div>

    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}

    <form onSubmit={save}>
      <fieldset disabled={busy} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px]">
          <label className="text-sm">Tên món
            <input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">Ảnh URL
            <input inputMode="url" value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} className={inputClass} />
          </label>
          <label className="text-sm">Độ khó
            <select value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value as RecipeInput['difficulty'] })} className={inputClass}>
              <option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option>
            </select>
          </label>
          <label className="text-sm">Trạng thái
            <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as RecipeInput['status'] })} className={inputClass}>
              <option value="PUBLISHED">Công khai</option><option value="DRAFT">Bản nháp</option>
              {id && <option value="ARCHIVED">Lưu trữ</option>}
            </select>
          </label>
        </div>
        <label className="block text-sm">Mô tả
          <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} rows={2} className={inputClass} />
        </label>

        <details className={sectionClass} open>
          <summary className="cursor-pointer text-sm font-semibold">Dinh dưỡng & khẩu phần</summary>
          <p className="mt-1 text-xs text-gray-500">Giá trị dinh dưỡng cho mỗi khẩu phần; nhập số 0 trở lên.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {numericFields.map(([key, label]) => <label key={key} className="block rounded-lg bg-gray-50 p-3 text-xs font-semibold text-gray-600">{label}
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min={key === 'servings' ? 1 : 0} step={key.endsWith('Grams') ? '0.1' : '1'}
                  value={form[key] ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value ? Number(event.target.value) : undefined })}
                  className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm font-normal text-gray-900" />
                <span className="shrink-0 font-normal text-gray-500">{key.includes('Minutes') ? 'phút' : key === 'servings' ? 'người' : key === 'calories' ? 'kcal' : key.endsWith('Grams') ? 'g' : ''}</span>
              </div>
            </label>)}
          </div>
        </details>

        <details className={sectionClass}>
          <summary className="cursor-pointer text-sm font-semibold">Thẻ phân loại <span className="font-normal text-gray-500">({form.tagCodes.length} đã chọn)</span></summary>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {tags.map(tag => <label key={tag.code} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.tagCodes.includes(tag.code)}
                onChange={() => setForm({ ...form, tagCodes: form.tagCodes.includes(tag.code) ? form.tagCodes.filter(code => code !== tag.code) : [...form.tagCodes, tag.code] })} />
              {tag.name}
            </label>)}
          </div>
        </details>

        <details className={sectionClass} open>
          <summary className="cursor-pointer text-sm font-semibold">Nguyên liệu <span className="font-normal text-gray-500">({form.ingredients.length})</span></summary>
          <div className="mt-3 space-y-2">
            {form.ingredients.map((item, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_100px_100px_36px]">
              <input aria-label={'Nguyên liệu ' + (index + 1)} required value={item.name}
                onChange={event => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, name: event.target.value } : value) })}
                placeholder="Tên nguyên liệu" className={inputClass + ' col-span-3 sm:col-span-1'} />
              <input aria-label={'Lượng nguyên liệu ' + (index + 1)} type="number" min="0" step="0.1" value={item.amount ?? ''}
                onChange={event => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, amount: event.target.value ? Number(event.target.value) : undefined } : value) })}
                placeholder="Lượng" className={inputClass} />
              <input aria-label={'Đơn vị ' + (index + 1)} value={item.unit || ''}
                onChange={event => setForm({ ...form, ingredients: form.ingredients.map((value, i) => i === index ? { ...value, unit: event.target.value } : value) })}
                placeholder="Đơn vị" className={inputClass} />
              <button type="button" title="Bỏ nguyên liệu" aria-label="Bỏ nguyên liệu" disabled={form.ingredients.length === 1}
                onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })}><X size={18} /></button>
            </div>)}
          </div>
          <button type="button" onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: '', unit: '' }] })}
            className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700"><Plus size={16} /> Thêm nguyên liệu</button>
        </details>

        <details className={sectionClass}>
          <summary className="cursor-pointer text-sm font-semibold">Các bước nấu <span className="font-normal text-gray-500">({form.instructions.length})</span></summary>
          <div className="mt-3 space-y-2">
            {form.instructions.map((step, index) => <div key={index} className="flex items-center gap-2">
              <textarea aria-label={'Bước nấu ' + (index + 1)} required rows={2} value={step}
                onChange={event => setForm({ ...form, instructions: form.instructions.map((value, i) => i === index ? event.target.value : value) })}
                className={inputClass} />
              <button type="button" title="Bỏ bước" aria-label="Bỏ bước" disabled={form.instructions.length === 1}
                onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== index) })}><X size={18} /></button>
            </div>)}
          </div>
          <button type="button" onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })}
            className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700"><Plus size={16} /> Thêm bước</button>
        </details>

        <details className={sectionClass}>
          <summary className="cursor-pointer text-sm font-semibold">Video hướng dẫn</summary>
          <div className="mt-3"><RecipeVideoPicker ids={form.videoIds || []} initial={linkedVideos} change={videoIds => setForm({ ...form, videoIds })} /></div>
        </details>

        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3">
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            <Save size={17} />{busy ? 'Đang xử lý...' : 'Lưu công thức'}
          </button>
          {id && <button type="button" onClick={() => setDeleting(true)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
            <Trash2 size={17} /> Xóa
          </button>}
        </div>
        {deleting && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm">Xóa công thức “{form.title}”?</p>
          <div className="flex gap-4"><button type="button" onClick={remove} className="font-semibold text-red-700">Xác nhận xóa</button><button type="button" onClick={() => setDeleting(false)}>Hủy</button></div>
        </div>}
      </fieldset>
    </form>
  </section>;
}
