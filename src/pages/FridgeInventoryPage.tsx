import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, RefreshCw, Snowflake, Trash2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { FridgeRecipeMatches } from '../components/FridgeRecipeMatches';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/apiClient';
import { fridgeService } from '../services/fridgeService';
import type { FreshnessStatus, FridgeItem, FridgeItemStatus, FridgeSummary } from '../types/api';

const freshnessLabels: Record<FreshnessStatus, string> = { FRESH: 'Tươi', USABLE: 'Nên dùng sớm', SPOILED: 'Đã hỏng' };
const statusLabels: Record<FridgeItemStatus, string> = { ACTIVE: 'Trong tủ', CONSUMED: 'Đã dùng', DISCARDED: 'Đã vứt' };
const emptyForm = { name: '', category: 'VEGAN', quantity: '', unit: 'phần', freshnessStatus: 'FRESH' as FreshnessStatus, expiryDate: '', storageTip: '', notes: '' };

export function FridgeInventoryPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [status, setStatus] = useState<FridgeItemStatus>('ACTIVE');
  const [summary, setSummary] = useState<FridgeSummary>({ totalActiveItems: 0, expiringSoonCount: 0, expiredCount: 0, freshCount: 0, usableCount: 0, veganCount: 0, urgentWarnings: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextItems, nextSummary] = await Promise.all([fridgeService.list(status), fridgeService.summary()]);
      setItems(nextItems); setSummary(nextSummary);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated, status]);

  const stats = useMemo(() => [
    ['Đang có', summary.totalActiveItems],
    ['Tươi', summary.freshCount],
    ['Cần dùng sớm', summary.expiringSoonCount],
    ['Quá hạn', summary.expiredCount],
  ], [summary]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const body = {
        name: form.name.trim(),
        category: form.category.trim() || 'VEGAN',
        isVegetarian: true,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit.trim() || undefined,
        freshnessStatus: form.freshnessStatus,
        expiryDate: form.expiryDate || undefined,
        storageTip: form.storageTip.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) await fridgeService.update(editingId, body);
      else await fridgeService.add(body);
      setForm(emptyForm); setEditingId(''); setMessage(editingId ? 'Đã cập nhật nguyên liệu.' : 'Đã thêm nguyên liệu vào tủ lạnh.');
      await load();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const edit = (item: FridgeItem) => {
    setEditingId(item.itemId);
    setForm({
      name: item.name,
      category: item.category || 'VEGAN',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || '',
      freshnessStatus: item.freshnessStatus,
      expiryDate: item.expiryDate || '',
      storageTip: item.storageTip || '',
      notes: item.notes || '',
    });
  };

  if (isLoading) return <MainLayout><p className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <MainLayout><div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><p className="text-xs font-bold text-emerald-700 uppercase">Smart Fridge Memory</p><h1 className="text-3xl font-extrabold">Kho tủ lạnh</h1></div>
      <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="w-4 h-4" />}>Tải lại</Button>
    </div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {!!summary.urgentWarnings?.length && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{summary.urgentWarnings.join(' ')}</div>}
    <div className="grid sm:grid-cols-4 gap-3">{stats.map(([label, value]) => <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
    <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
        <h2 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" />{editingId ? 'Sửa nguyên liệu' : 'Thêm thủ công'}</h2>
        <Input label="Tên nguyên liệu" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Số lượng" type="number" min="0" step="0.1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          <Input label="Đơn vị" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
        </div>
        <label className="block text-xs font-semibold">Độ tươi</label>
        <select className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" value={form.freshnessStatus} onChange={e => setForm({ ...form, freshnessStatus: e.target.value as FreshnessStatus })}>
          {Object.entries(freshnessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Input label="Ngày hết hạn" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
        <Input label="Mẹo bảo quản" value={form.storageTip} onChange={e => setForm({ ...form, storageTip: e.target.value })} />
        <Input label="Ghi chú" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <div className="flex gap-2"><Button type="submit" isLoading={busy}>{editingId ? 'Lưu sửa' : 'Thêm vào tủ'}</Button>{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(''); setForm(emptyForm); }}>Hủy</Button>}</div>
      </form>
      <section className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold flex items-center gap-2"><Snowflake className="w-4 h-4 text-emerald-600" />Danh sách nguyên liệu</h2>
          <select className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm" value={status} onChange={e => setStatus(e.target.value as FridgeItemStatus)}>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {loading ? <p className="text-sm text-gray-500">Đang tải...</p> : items.length === 0 ? <p className="text-sm text-gray-500">Chưa có nguyên liệu ở trạng thái này.</p> :
          <div className="grid md:grid-cols-2 gap-4">{items.map(item => <article key={item.itemId} className="rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3><p className="text-xs text-gray-500">{item.quantity ?? '—'} {item.unit || ''} · {freshnessLabels[item.freshnessStatus]}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${item.isExpired ? 'bg-red-50 text-red-700' : item.isExpiringSoon ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{item.daysRemaining} ngày</span></div>
            {item.warningMessage && <p className="text-sm text-amber-800">{item.warningMessage}</p>}
            {item.storageTip && <p className="text-sm text-gray-600">{item.storageTip}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => edit(item)}>Sửa</Button>
              {item.status !== 'CONSUMED' && <Button type="button" variant="secondary" onClick={() => fridgeService.updateStatus(item.itemId, 'CONSUMED').then(load).catch(reason => setError(errorMessage(reason)))}>Đã dùng</Button>}
              {item.status !== 'DISCARDED' && <Button type="button" variant="secondary" onClick={() => fridgeService.updateStatus(item.itemId, 'DISCARDED').then(load).catch(reason => setError(errorMessage(reason)))}>Đã vứt</Button>}
              <Button type="button" variant="ghost" onClick={() => fridgeService.remove(item.itemId).then(load).catch(reason => setError(errorMessage(reason)))} leftIcon={<Trash2 className="w-4 h-4" />}>Xóa</Button>
            </div>
          </article>)}</div>}
      </section>
    </div>
    <FridgeRecipeMatches key={items.map(item => item.itemId + item.updatedAt + item.status).join(',')} />
  </div></MainLayout>;
}
