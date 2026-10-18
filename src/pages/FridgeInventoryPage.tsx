import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Check, CircleHelp, Clock3, Leaf, PackagePlus, Pencil, Plus, RefreshCw, Refrigerator, Search, Snowflake, Trash2, X } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { FridgeRecipeMatches } from '../components/FridgeRecipeMatches';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/apiClient';
import { fridgeService } from '../services/fridgeService';
import type { FreshnessStatus, FridgeItem, FridgeItemStatus, FridgeSummary } from '../types/api';

const freshnessLabels: Record<FreshnessStatus, string> = { FRESH: 'Tươi tốt', USABLE: 'Nên dùng sớm', SPOILED: 'Đã hỏng' };
const statusLabels: Record<FridgeItemStatus, string> = { ACTIVE: 'Đang trong tủ', CONSUMED: 'Đã dùng', DISCARDED: 'Đã bỏ' };
const emptyForm = { name: '', category: 'VEGAN', quantity: '', unit: 'phần', freshnessStatus: 'FRESH' as FreshnessStatus, expiryDate: '', storageTip: '', notes: '' };
const emptySummary: FridgeSummary = { totalActiveItems: 0, expiringSoonCount: 0, expiredCount: 0, freshCount: 0, usableCount: 0, veganCount: 0, urgentWarnings: [] };

export function FridgeInventoryPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [status, setStatus] = useState<FridgeItemStatus>('ACTIVE');
  const [summary, setSummary] = useState<FridgeSummary>(emptySummary);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  // Keep the inventory compact until the user explicitly starts adding or editing an item.
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  // The backend filters by lifecycle status; this search narrows only the currently loaded status list.
  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return items.filter(item => !keyword || `${item.name} ${item.category || ''} ${item.notes || ''}`.toLocaleLowerCase('vi').includes(keyword));
  }, [items, search]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const body = {
        name: form.name.trim(), category: form.category.trim() || 'VEGAN', isVegetarian: true,
        quantity: form.quantity ? Number(form.quantity) : undefined, unit: form.unit.trim() || undefined,
        freshnessStatus: form.freshnessStatus, expiryDate: form.expiryDate || undefined,
        storageTip: form.storageTip.trim() || undefined, notes: form.notes.trim() || undefined,
      };
      if (editingId) await fridgeService.update(editingId, body);
      else await fridgeService.add(body);
      setForm(emptyForm); setEditingId(''); setFormOpen(false);
      setMessage(editingId ? 'Đã cập nhật nguyên liệu trong kho.' : 'Đã thêm nguyên liệu vào kho.');
      await load();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const edit = (item: FridgeItem) => {
    setFormOpen(true);
    setEditingId(item.itemId);
    setForm({ name: item.name, category: item.category || 'VEGAN', quantity: item.quantity?.toString() || '', unit: item.unit || '', freshnessStatus: item.freshnessStatus, expiryDate: item.expiryDate || '', storageTip: item.storageTip || '', notes: item.notes || '' });
    setMessage(''); setError('');
  };

  const updateStatus = async (item: FridgeItem, nextStatus: FridgeItemStatus) => {
    setError('');
    try { await fridgeService.updateStatus(item.itemId, nextStatus); setMessage(`${item.name}: ${statusLabels[nextStatus].toLocaleLowerCase('vi')}.`); await load(); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  const remove = async (item: FridgeItem) => {
    if (!window.confirm(`Xóa ${item.name} khỏi kho lạnh?`)) return;
    setError('');
    try { await fridgeService.remove(item.itemId); setMessage(`Đã xóa ${item.name} khỏi kho.`); await load(); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  if (isLoading) return <MainLayout><p className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <MainLayout><div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm sm:p-9">
      <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border-[32px] border-emerald-900/[0.04]" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold tracking-wide text-emerald-900"><Snowflake size={14} /> KHO THỰC PHẨM CỦA BẠN</span><h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Mở tủ, biết ngay có gì.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-700">Theo dõi độ tươi và hạn dùng, tận dụng nguyên liệu đang có để lên món nhanh hơn.</p></div>
        <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Làm mới</Button><Button onClick={() => setFormOpen(value => !value)} aria-expanded={formOpen} aria-controls="add-fridge-item" leftIcon={formOpen ? <X size={17} /> : <Plus size={17} />}>{formOpen ? 'Đóng biểu mẫu' : 'Thêm nguyên liệu'}</Button></div>
      </div>
    </header>

    {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

    <section aria-label="Tổng quan kho lạnh" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Đang có trong tủ', value: summary.totalActiveItems, hint: 'nguyên liệu', icon: Refrigerator, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Còn tươi', value: summary.freshCount, hint: 'sẵn sàng sử dụng', icon: Leaf, tone: 'bg-lime-50 text-lime-700' },
        { label: 'Nên dùng sớm', value: summary.expiringSoonCount, hint: 'ưu tiên nấu trước', icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
        { label: 'Đã quá hạn', value: summary.expiredCount, hint: 'cần kiểm tra lại', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
      ].map(({ label, value, hint, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div><span className={`rounded-xl p-3 ${tone}`}><Icon size={20} /></span></div></article>)}
    </section>

    {!!summary.urgentWarnings?.length && <aside className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={19} /><div><p className="font-bold">Có nguyên liệu cần bạn để ý</p><p className="mt-1 leading-6">{summary.urgentWarnings.join(' ')}</p></div></aside>}

    <div className={`grid items-start gap-6 ${formOpen ? 'xl:grid-cols-[350px_minmax(0,1fr)]' : ''}`}>
      {formOpen && <form id="add-fridge-item" onSubmit={submit} className="scroll-mt-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><PackagePlus size={20} /></span><div><h2 className="font-bold text-slate-900">{editingId ? 'Cập nhật nguyên liệu' : 'Thêm vào kho'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Ghi nhanh những gì bạn đang có trong tủ.</p></div></div>
        <div className="space-y-4">
          <Input label="Tên nguyên liệu" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: đậu hũ non" />
          <div className="grid grid-cols-2 gap-3"><Input label="Số lượng" type="number" min="0" step="0.1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="1" /><Input label="Đơn vị" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="hộp, bó, kg..." /></div>
          <label className="block text-xs font-semibold text-slate-700">Độ tươi<select className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.freshnessStatus} onChange={e => setForm({ ...form, freshnessStatus: e.target.value as FreshnessStatus })}>{Object.entries(freshnessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Input label="Hạn sử dụng" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
          <Input label="Mẹo bảo quản" value={form.storageTip} onChange={e => setForm({ ...form, storageTip: e.target.value })} placeholder="Ví dụ: bọc kín, để ngăn mát" />
          <Input label="Ghi chú" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm (không bắt buộc)" />
          <div className="flex gap-2 pt-1"><Button type="submit" isLoading={busy} leftIcon={editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>{editingId ? 'Lưu thay đổi' : 'Thêm nguyên liệu'}</Button><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditingId(''); setForm(emptyForm); }} leftIcon={<X className="h-4 w-4" />}>Đóng</Button></div>
        </div>
      </form>}

      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Danh sách của bạn</p><h2 className="mt-1 text-xl font-bold text-slate-900">Nguyên liệu trong kho</h2><p className="mt-1 text-sm text-slate-500">Lọc theo trạng thái hoặc tìm một nguyên liệu.</p></div><label className="relative block w-full sm:max-w-xs"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Tìm nguyên liệu" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nguyên liệu..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label></div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex flex-wrap gap-2">{(Object.entries(statusLabels) as [FridgeItemStatus, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${status === value ? 'bg-emerald-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>{label}</button>)}</div><span className="text-xs text-slate-400">{visibleItems.length} nguyên liệu</span></div>
        {loading ? <div role="status" className="grid gap-3 md:grid-cols-2"><div className="h-36 animate-pulse rounded-2xl bg-slate-100" /><div className="h-36 animate-pulse rounded-2xl bg-slate-100" /></div> : visibleItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm"><Snowflake size={23} /></span><h3 className="mt-4 font-bold text-slate-800">{search ? 'Chưa tìm thấy nguyên liệu' : 'Kho này đang trống'}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{search ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.' : status === 'ACTIVE' ? 'Thêm nguyên liệu thủ công hoặc quét tủ lạnh để bắt đầu lưu kho.' : `Chưa có nguyên liệu nào ở mục “${statusLabels[status]}”.`}</p>{!search && status === 'ACTIVE' && <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"><Plus size={16} /> Thêm nguyên liệu</button><Link to="/fridge-scan" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><Snowflake size={16} /> Quét tủ lạnh</Link></div>}</div> : <div className="grid gap-3 md:grid-cols-2">{visibleItems.map(item => {
          const urgent = item.isExpired || item.freshnessStatus === 'SPOILED';
          const soon = item.isExpiringSoon || item.freshnessStatus === 'USABLE';
          const tone = urgent ? 'border-rose-200 bg-rose-50/30' : soon ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white';
          const badgeTone = urgent ? 'bg-rose-100 text-rose-800' : soon ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
          return <article key={item.itemId} className={`rounded-2xl border p-4 transition hover:shadow-sm ${tone}`}>
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 rounded-xl p-2 ${urgent ? 'bg-rose-100 text-rose-700' : soon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}><Leaf size={17} /></span><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.quantity ?? '—'} {item.unit || ''}{item.category ? ` · ${item.category}` : ''}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeTone}`}>{freshnessLabels[item.freshnessStatus]}</span></div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200/70 pt-3 text-xs text-slate-500">{item.expiryDate && <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} />Hạn {new Date(`${item.expiryDate}T00:00:00`).toLocaleDateString('vi-VN')}</span>}<span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{item.isExpired ? `Quá hạn ${Math.abs(item.daysRemaining)} ngày` : `Còn ${item.daysRemaining} ngày`}</span></div>
            {item.warningMessage && <p className={`mt-3 flex gap-2 text-xs leading-5 ${urgent ? 'text-rose-800' : 'text-amber-800'}`}><AlertTriangle size={14} className="mt-0.5 shrink-0" />{item.warningMessage}</p>}
            {item.storageTip && <p className="mt-2 flex gap-2 text-xs leading-5 text-slate-600"><CircleHelp size={14} className="mt-0.5 shrink-0 text-emerald-700" />{item.storageTip}</p>}
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => edit(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800"><Pencil size={14} />Sửa</button>{item.status === 'ACTIVE' && <button type="button" onClick={() => void updateStatus(item, 'CONSUMED')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800"><Check size={14} />Đã dùng</button>}{item.status !== 'DISCARDED' && <button type="button" onClick={() => void updateStatus(item, 'DISCARDED')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-800"><Trash2 size={14} />Bỏ</button>}<button type="button" onClick={() => void remove(item)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X size={14} />Xóa hẳn</button></div>
          </article>;
        })}</div>}
      </section>
    </div>
    <FridgeRecipeMatches key={items.map(item => item.itemId + item.updatedAt + item.status).join(',')} />
  </div></MainLayout>;
}
