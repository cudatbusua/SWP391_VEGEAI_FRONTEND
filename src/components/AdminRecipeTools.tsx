import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminRecipeEditor } from './AdminRecipeEditor';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { RecipeTag } from '../types/recipe';

const groups = { DIETARY_TYPE: 'Trường phái', COOKING_METHOD: 'Cách chế biến', DISH_CATEGORY: 'Loại món', NUTRITION_GOAL: 'Dinh dưỡng', OCCASION: 'Nhu cầu & Dịp nấu', DIETARY_RESTRICTION: 'Kiêng / dị ứng' };
export function AdminRecipeTools() {
  const [version, setVersion] = useState(0);
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [form, setForm] = useState({ code: '', name: '', group: 'DIETARY_TYPE', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<RecipeTag | null>(null);
  useEffect(() => { recipeService.adminTags().then(setTags).catch(reason => setError(errorMessage(reason))); }, [version]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await recipeService.createTag({ ...form, code: form.code.trim(), name: form.name.trim() }); setForm({ ...form, code: '', name: '', description: '' }); setVersion(value => value + 1); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true); setError('');
    try { await recipeService.removeTag(deleting.tagId); setDeleting(null); setVersion(value => value + 1); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  return <><AdminRecipeEditor tagsVersion={version} /><section className="border-t pt-6"><h2 className="text-xl font-bold mb-4">Thẻ phân loại</h2>
    {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
    <form onSubmit={create}><fieldset disabled={busy} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><label className="text-sm">Mã thẻ<input required pattern="[A-Z0-9_]{2,50}" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full border rounded-lg p-2 mt-1" /></label><label className="text-sm">Tên thẻ<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label><label className="text-sm">Nhóm<select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className="w-full border rounded-lg p-2 mt-1">{Object.entries(groups).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label className="text-sm">Mô tả<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label><button type="submit" className="flex gap-2 items-center text-emerald-700 font-semibold"><Plus size={18} /> Thêm thẻ</button></fieldset></form>
    {deleting && <div role="alert" className="border border-red-200 rounded-lg p-4 mt-4"><p className="text-sm mb-2">Xóa thẻ “{deleting.name}”?</p><button disabled={busy} onClick={remove} className="text-red-700 mr-4">Xác nhận xóa</button><button disabled={busy} onClick={() => setDeleting(null)}>Hủy</button></div>}
    <div className="max-h-72 overflow-auto mt-4">{tags.map(tag => <div key={tag.tagId} className="flex gap-3 items-center justify-between border-b py-3 text-sm"><div><span className="font-semibold">{tag.name}</span><span className="text-gray-500 block text-xs">{tag.code} · {groups[tag.group as keyof typeof groups] || tag.group}</span></div><button disabled={busy} title={'Xóa thẻ ' + tag.name} aria-label={'Xóa thẻ ' + tag.name} onClick={() => setDeleting(tag)} className="p-2 text-red-700"><Trash2 size={16} /></button></div>)}</div>
  </section></>;
}
