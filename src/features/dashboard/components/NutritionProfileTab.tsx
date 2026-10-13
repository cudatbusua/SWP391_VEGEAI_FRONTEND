import { useEffect, useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { userService } from '../../../services/userService';
import { toUser } from '../../../services/authService';
import { errorMessage } from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import type { UserProfile } from '../../../types/api';

const diets: Record<string, string> = {
  VEGAN: 'Thuần chay', VEGETARIAN: 'Ăn chay', LACTO_OVO: 'Chay có trứng và sữa', LACTO: 'Chay có sữa',
  OVO: 'Chay có trứng', PESCATARIAN: 'Chay kèm hải sản', FLEXITARIAN: 'Bán chay', RAW_VEGAN: 'Thuần chay thô',
};
const allergens: Record<string, string> = {
  PEANUTS: 'Đậu phộng', TREE_NUTS: 'Hạt dinh dưỡng', SOY: 'Đậu nành', GLUTEN: 'Gluten',
  DAIRY: 'Sữa', EGGS: 'Trứng', SESAME: 'Mè', MUSHROOMS: 'Nấm', CORN: 'Bắp',
};
type ProfileForm = {
  fullName: string; phoneNumber: string; dateOfBirth: string; gender: string; address: string;
  heightCm: string; weightKg: string; dailyCalorieTarget: string; dietaryPreferences: string; allergies: string;
};
function toForm(profile: UserProfile): ProfileForm {
  return {
    fullName: profile.fullName || '', phoneNumber: profile.phoneNumber || '', dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '', address: profile.address || '', heightCm: profile.heightCm?.toString() || '',
    weightKg: profile.weightKg?.toString() || '', dailyCalorieTarget: profile.dailyCalorieTarget?.toString() || '',
    dietaryPreferences: profile.dietaryPreferences || '',
    allergies: profile.allergies === 'NONE' ? '' : (profile.allergies || '').split(',').map(value => allergens[value.trim()] || value.trim()).join(', '),
  };
}
export function NutritionProfileTab() {
  const { updateUser } = useAuth();
  const [saved, setSaved] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    userService.getProfile(controller.signal).then(profile => {
      if (!controller.signal.aborted) { setSaved(profile); setForm(toForm(profile)); }
    }).catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const change = (key: keyof ProfileForm, value: string) => {
    setForm(previous => previous ? { ...previous, [key]: value } : previous);
    setMessage('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const profile = await userService.updateProfile({
        fullName: form.fullName.trim(), phoneNumber: form.phoneNumber.trim(), address: form.address.trim(),
        dateOfBirth: form.dateOfBirth || undefined, gender: form.gender || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        dailyCalorieTarget: form.dailyCalorieTarget ? Number(form.dailyCalorieTarget) : undefined,
        dietaryPreferences: form.dietaryPreferences,
        allergies: form.allergies.split(',').map(value => {
          const label = value.trim();
          return Object.keys(allergens).find(key => allergens[key].toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi')) || label;
        }).filter(Boolean).join(',') || 'NONE',
      });
      setSaved(profile); setForm(toForm(profile)); updateUser(toUser(profile));
      setMessage('Hồ sơ đã được lưu thành công.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };
  if (loading) return <p role="status" className="p-8 text-center text-gray-500">Đang tải hồ sơ...</p>;
  if (!saved || !form) return <div className="p-8 text-center space-y-4"><p role="alert" className="text-red-600">{error}</p><Button onClick={() => setAttempt(value => value + 1)}>Tải lại hồ sơ</Button></div>;
  const input = (key: keyof ProfileForm, label: string, type = 'text', extra = {}) => <Input label={label} type={type}
    value={form[key]} onChange={event => change(key, event.target.value)} {...extra} />;
  const selectClass = 'w-full py-3 px-4 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500';
  return <div className="space-y-6">
    <div><span className="text-xs font-bold text-emerald-700 uppercase">Hồ sơ dinh dưỡng & sức khỏe</span>
      <h1 className="text-3xl font-extrabold mt-2">Thông tin cá nhân</h1>
      <p className="text-sm text-gray-500 mt-2">Cập nhật thông tin và chế độ ăn của bạn.</p></div>
    {error && <p role="alert" className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm">{error}</p>}
    {message && <p role="status" className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm">{message}</p>}
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={save} className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="font-bold flex items-center gap-2"><UserRound className="w-5 h-5 text-emerald-600" />Thông tin cơ bản</h2>
        <fieldset disabled={saving} className="grid sm:grid-cols-2 gap-4">
          {input('fullName', 'Họ và tên', 'text', { required: true, minLength: 2, maxLength: 100 })}
          <Input label="Email" type="email" value={saved.email} readOnly helperText="Email được dùng để xác minh tài khoản." />
          {input('phoneNumber', 'Số điện thoại', 'tel', { pattern: '[0-9+]{9,15}' })}
          {input('dateOfBirth', 'Ngày sinh', 'date', { max: new Date().toISOString().slice(0, 10), required: !!saved.dateOfBirth })}
          <div><label htmlFor="profile-gender" className="block text-xs font-semibold mb-1.5">Giới tính</label>
            <select id="profile-gender" className={selectClass} value={form.gender} onChange={event => change('gender', event.target.value)}>
              <option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option>
              {form.gender && !['MALE','FEMALE','OTHER'].includes(form.gender) && <option value={form.gender}>{form.gender}</option>}
            </select></div>
          {input('address', 'Địa chỉ', 'text', { maxLength: 255 })}
          {input('heightCm', 'Chiều cao (cm)', 'number', { min: 50, max: 280, step: '0.1', required: saved.heightCm != null })}
          {input('weightKg', 'Cân nặng (kg)', 'number', { min: 20, max: 350, step: '0.1', required: saved.weightKg != null })}
          {input('dailyCalorieTarget', 'Mục tiêu calo mỗi ngày (kcal)', 'number', { min: 500, max: 10000, step: 1, required: saved.dailyCalorieTarget != null })}
          <div><label htmlFor="profile-diet" className="block text-xs font-semibold mb-1.5">Chế độ ăn</label>
            <select id="profile-diet" className={selectClass} value={form.dietaryPreferences} onChange={event => change('dietaryPreferences', event.target.value)}>
              <option value="">Chưa chọn</option>{Object.entries(diets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              {form.dietaryPreferences && !diets[form.dietaryPreferences] && <option value={form.dietaryPreferences}>{form.dietaryPreferences}</option>}
            </select></div>
          <div className="sm:col-span-2">{input('allergies', 'Dị ứng / thực phẩm cần tránh', 'text', {
            maxLength: 255, placeholder: 'Đậu phộng, Đậu nành, Gluten',
            helperText: 'Phân tách bằng dấu phẩy. Để trống nếu không có dị ứng.',
          })}</div>
        </fieldset>
        <Button type="submit" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>Lưu thay đổi</Button>
      </form>
      <aside className="bg-[#005f3e] text-white rounded-3xl p-6 space-y-5">
        <h2 className="font-bold">Hồ sơ đã lưu</h2>
        <div><p className="text-sm text-emerald-100">Chỉ số BMI</p><p className="text-3xl font-bold">{saved.bmi?.toFixed(1) ?? '—'}</p></div>
        <div><p className="text-sm text-emerald-100">Mục tiêu calo mỗi ngày</p><p className="text-2xl font-bold">{saved.dailyCalorieTarget ?? '—'} <span className="text-sm font-normal">kcal</span></p></div>
        <p className="text-sm text-emerald-100">{diets[saved.dietaryPreferences || ''] || saved.dietaryPreferences || 'Chưa chọn chế độ ăn'}</p>
      </aside>
    </div>
  </div>;
}
