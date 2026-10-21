import { useEffect, useState } from 'react';
import { BookOpen, Plus, Tags, Trash2 } from 'lucide-react';
import { AdminRecipeEditor } from './AdminRecipeEditor';
import { AdminRecipeList } from './AdminRecipeList';
import { recipeService } from '../services/recipeService';
import { errorMessage } from '../services/apiClient';
import type { RecipeTag } from '../types/recipe';

const groups = { DIETARY_TYPE: 'Trường phái', COOKING_METHOD: 'Cách chế biến', DISH_CATEGORY: 'Loại món', NUTRITION_GOAL: 'Dinh dưỡng', OCCASION: 'Hoàn cảnh', DIETARY_RESTRICTION: 'Kiêng / dị ứng' };
export function AdminRecipeTools() {
  const [section, setSection] = useState<'recipes' | 'tags'>('recipes');
  const [recipeSection, setRecipeSection] = useState<'list' | 'editor'>('list');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [version, setVersion] = useState(0);
  const [recipeVersion, setRecipeVersion] = useState(0);
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
  return <div className="space-y-5">
    <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-3" aria-label="Nhóm quản lý công thức">
      <button type="button" role="tab" aria-selected={section === 'recipes'} onClick={() => setSection('recipes')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${section === 'recipes' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
        <BookOpen size={16} /> Công thức & dinh dưỡng
      </button>
      <button type="button" role="tab" aria-selected={section === 'tags'} onClick={() => setSection('tags')}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${section === 'tags' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
        <Tags size={16} /> Thẻ phân loại
      </button>
    </nav>
    <div role="tabpanel" hidden={section !== 'recipes'} aria-label="Công thức và dinh dưỡng">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div>
          <h2 className="font-semibold">Quản lý công thức</h2>
          <p className="mt-0.5 text-sm text-gray-500">Danh sách và biểu mẫu được tách riêng để dễ tìm và chỉnh sửa.</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Danh sách và biểu mẫu công thức">
          <button type="button" role="tab" aria-selected={recipeSection === 'list'} onClick={() => setRecipeSection('list')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${recipeSection === 'list' ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Danh sách công thức
          </button>
          <button type="button" role="tab" aria-selected={recipeSection === 'editor'} onClick={() => { setSelectedRecipeId(''); setRecipeSection('editor'); }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${recipeSection === 'editor' ? 'bg-emerald-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Plus size={16} /> Thêm công thức
          </button>
        </div>
      </div>
      <div role="tabpanel" hidden={recipeSection !== 'list'}>
        <AdminRecipeList refreshVersion={recipeVersion} onEdit={id => { setSelectedRecipeId(id); setRecipeSection('editor'); }} />
      </div>
      <div role="tabpanel" hidden={recipeSection !== 'editor'}>
        <AdminRecipeEditor key={selectedRecipeId || 'new'} initialRecipeId={selectedRecipeId || undefined} tagsVersion={version}
          onSaved={() => setRecipeVersion(value => value + 1)}
          onDeleted={() => { setRecipeVersion(value => value + 1); setSelectedRecipeId(''); setRecipeSection('list'); }} />
      </div>
    </div>
    <section role="tabpanel" hidden={section !== 'tags'} aria-label="Thẻ phân loại" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4"><h2 className="text-lg font-bold">Thẻ phân loại</h2><p className="mt-1 text-sm text-gray-500">Quản lý nhóm nhãn dùng để tìm và lọc công thức.</p></div>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="rounded-lg bg-gray-50 p-4">
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Mã thẻ<input required pattern="[A-Z0-9_]{2,50}" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2" /></label>
          <label className="text-sm">Tên thẻ<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2" /></label>
          <label className="text-sm">Nhóm<select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2">{Object.entries(groups).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
          <label className="text-sm">Mô tả<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2" /></label>
          <button type="submit" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><Plus size={18} /> Thêm thẻ</button>
        </fieldset>
      </form>
      {deleting && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"><p className="mb-2 text-sm">Xóa thẻ “{deleting.name}”?</p><button disabled={busy} onClick={remove} className="mr-4 text-sm font-semibold text-red-700">Xác nhận xóa</button><button disabled={busy} onClick={() => setDeleting(null)} className="text-sm">Hủy</button></div>}
      <div className="mt-4 max-h-80 overflow-auto divide-y divide-gray-100">
        {tags.map(tag => <div key={tag.tagId} className="flex items-center justify-between gap-3 py-3 text-sm"><div><span className="font-semibold">{tag.name}</span><span className="block text-xs text-gray-500">{tag.code} · {groups[tag.group as keyof typeof groups] || tag.group}</span></div><button type="button" disabled={busy} title={'Xóa thẻ ' + tag.name} aria-label={'Xóa thẻ ' + tag.name} onClick={() => setDeleting(tag)} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button></div>)}
      </div>
    </section>
  </div>;
}
