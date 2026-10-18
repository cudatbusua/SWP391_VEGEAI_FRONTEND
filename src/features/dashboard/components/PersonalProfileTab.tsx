import { useEffect, useState } from 'react';
import { CalendarDays, Mail, MapPin, Pencil, Phone, RefreshCw, Save, UserRound, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { errorMessage } from '../../../services/apiClient';
import { toUser } from '../../../services/authService';
import { userService } from '../../../services/userService';
import type { UserProfile } from '../../../types/api';

type PersonalForm = { fullName: string; phoneNumber: string; dateOfBirth: string; address: string };
const dateValue = (value?: string) => value ? value.slice(0, 10) : '';
const genderLabel = (value?: string) => value === 'MALE' ? 'Nam' : value === 'FEMALE' ? 'Nữ' : value === 'OTHER' ? 'Khác' : 'Chưa cập nhật';

export function PersonalProfileTab() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<PersonalForm>({ fullName: '', phoneNumber: '', dateOfBirth: '', address: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    userService.getProfile(controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setProfile(value);
      setForm({ fullName: value.fullName || '', phoneNumber: value.phoneNumber || '', dateOfBirth: dateValue(value.dateOfBirth), address: value.address || '' });
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, attempt]);

  const cancel = () => {
    if (profile) setForm({ fullName: profile.fullName || '', phoneNumber: profile.phoneNumber || '', dateOfBirth: dateValue(profile.dateOfBirth), address: profile.address || '' });
    setEditing(false); setError(''); setMessage('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving || !form.fullName.trim()) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const updated = await userService.updateProfile({ fullName: form.fullName.trim(), phoneNumber: form.phoneNumber.trim(), dateOfBirth: form.dateOfBirth || undefined, address: form.address.trim() });
      setProfile(updated); setForm({ fullName: updated.fullName || '', phoneNumber: updated.phoneNumber || '', dateOfBirth: dateValue(updated.dateOfBirth), address: updated.address || '' });
      updateUser(toUser(updated)); setEditing(false); setMessage('Đã cập nhật hồ sơ cá nhân.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  return <section className="space-y-6">
    <header className="flex flex-wrap justify-between items-start gap-4">
      <div><span className="text-xs font-bold text-emerald-700">TÀI KHOẢN CỦA BẠN</span><h1 className="text-3xl font-bold mt-2">Hồ sơ cá nhân</h1><p className="text-sm text-gray-500 mt-2">Thông tin tài khoản và liên hệ được quản lý riêng với mục tiêu dinh dưỡng.</p></div>
      {!editing && profile && <button type="button" onClick={() => { setEditing(true); setMessage(''); }} className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-800"><Pencil size={16} />Chỉnh sửa thông tin</button>}
    </header>
    {loading && <p role="status" className="text-sm text-gray-500">Đang tải hồ sơ cá nhân...</p>}
    {error && <div role="alert" className="text-sm text-red-700">{error}<button onClick={() => setAttempt(value => value + 1)} className="inline-flex gap-2 ml-3"><RefreshCw size={15} />Tải lại</button></div>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {profile && (editing ? <form onSubmit={save} className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Họ và tên<input required maxLength={100} value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-normal" /></label>
        <label className="text-sm font-semibold">Số điện thoại<input type="tel" maxLength={15} value={form.phoneNumber} onChange={event => setForm({ ...form, phoneNumber: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-normal" placeholder="0912345678" /></label>
        <label className="text-sm font-semibold">Ngày sinh<input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={event => setForm({ ...form, dateOfBirth: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-normal" /></label>
        <label className="text-sm font-semibold">Địa chỉ<input maxLength={255} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-normal" placeholder="Tỉnh / thành phố" /></label>
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button><button type="button" onClick={cancel} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"><X size={16} />Hủy</button></div>
    </form> : <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-5"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-800"><UserRound size={25} /></div><div><h2 className="text-lg font-bold">{profile.fullName || profile.username}</h2><p className="text-sm text-gray-500">Tên đăng nhập: {profile.username}</p></div></div>
      <dl className="mt-6 grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2">
        {[
          [<Mail size={16} />, 'Email tài khoản', profile.email],
          [<Phone size={16} />, 'Số điện thoại', profile.phoneNumber || 'Chưa cập nhật'],
          [<CalendarDays size={16} />, 'Ngày sinh', profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa cập nhật'],
          [<UserRound size={16} />, 'Giới tính', genderLabel(profile.gender)],
          [<MapPin size={16} />, 'Địa chỉ', profile.address || 'Chưa cập nhật'],
        ].map(([icon, label, value]) => <div key={String(label)} className="min-w-0"><dt className="flex items-center gap-2 text-gray-500">{icon}{label}</dt><dd className="mt-2 break-words font-semibold">{value}</dd></div>)}
      </dl>
    </div>)}
  </section>;
}
