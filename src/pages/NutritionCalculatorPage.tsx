import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calculator, Save, Leaf, Target, Flame, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { ApiError, errorMessage } from '../services/apiClient';
import { nutritionService } from '../services/nutritionService';
import { userService } from '../services/userService';
import { toUser } from '../services/authService';
import { dietLabels, displayAllergies } from '../utils/nutritionProfile';
import type { ActivityLevel, NutritionGender, NutritionGoal, NutritionTargets } from '../types/api';

const activityLabels: Record<ActivityLevel, string> = {
  SEDENTARY: 'Ít vận động',
  LIGHT: 'Vận động nhẹ',
  MODERATE: 'Vận động vừa',
  ACTIVE: 'Vận động nhiều',
  VERY_ACTIVE: 'Rất năng động',
};
const goalLabels: Record<NutritionGoal, string> = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Giữ cân',
  GAIN_MUSCLE: 'Tăng cơ',
};
function ageFromBirth(value: string) {
  const birth = new Date(value + 'T12:00:00'); const today = new Date();
  if (!value || !Number.isFinite(birth.getTime())) return '';
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return String(age);
}

export function NutritionCalculatorPage() {
  const { isAuthenticated, user, updateUser } = useAuth();
  const [form, setForm] = useState({
    gender: 'FEMALE' as NutritionGender,
    age: '28',
    dateOfBirth: '',
    heightCm: '160',
    weightKg: '55',
    activityLevel: 'MODERATE' as ActivityLevel,
    goal: 'MAINTAIN' as NutritionGoal,
    customDailyCalories: '',
    phoneNumber: '', dietaryPreferences: '', allergies: '',
  });
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [resultGoal, setResultGoal] = useState<NutritionGoal>('MAINTAIN');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isAuthenticated);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setTargets(null); setError(''); setMessage(''); setLoadError(''); setLoading(isAuthenticated);
    if (!isAuthenticated) { setForm({ gender:'FEMALE',age:'28',dateOfBirth:'',heightCm:'160',weightKg:'55',activityLevel:'MODERATE',goal:'MAINTAIN',customDailyCalories:'',phoneNumber:'',dietaryPreferences:'',allergies:'' }); return; }
    Promise.all([userService.getProfile(controller.signal), nutritionService.getProfile(controller.signal).catch(reason => {
      if (reason instanceof ApiError && reason.status === 404) return null;
      throw reason;
    })]).then(([account, saved]) => {
      if (controller.signal.aborted) return;
      setForm(previous => ({ ...previous, gender: saved?.gender || (account.gender === 'MALE' ? 'MALE' : 'FEMALE'),
        age: saved ? String(saved.age) : ageFromBirth(account.dateOfBirth || '') || '', dateOfBirth: saved?.dateOfBirth || account.dateOfBirth || '',
        heightCm: String(saved?.heightCm ?? account.heightCm ?? ''), weightKg: String(saved?.weightKg ?? account.weightKg ?? ''),
        activityLevel: saved?.activityLevel || 'MODERATE', goal: saved?.goal || 'MAINTAIN',
        customDailyCalories: saved?.customDailyCalories == null ? '' : String(saved.customDailyCalories),
        phoneNumber: account.phoneNumber || '', dietaryPreferences: account.dietaryPreferences || '', allergies: displayAllergies(account.allergies),
      }));
      if (saved) { setTargets(saved.targets); setResultGoal(saved.goal); }
    }).catch(reason => { if (!controller.signal.aborted) setLoadError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isAuthenticated, user?.id, reload]);

  const payload = () => ({
    gender: form.gender,
    age: Number(isAuthenticated && form.dateOfBirth ? ageFromBirth(form.dateOfBirth) : form.age),
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    activityLevel: form.activityLevel,
    goal: form.goal,
    customDailyCalories: form.customDailyCalories ? Number(form.customDailyCalories) : undefined,
  });

  const calculate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || saving || loading || loadError) return;
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'save') { await saveProfile(); return; }
    setBusy(true); setError(''); setMessage('');
    try { setTargets(await nutritionService.calculate(payload())); setResultGoal(form.goal); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    if (!form.dateOfBirth) { setError('Vui lòng nhập ngày sinh để lưu hồ sơ.'); return; }
    if (!form.dietaryPreferences) { setError('Vui lòng chọn chế độ ăn.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const profile = await nutritionService.saveProfile({
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        activityLevel: form.activityLevel,
        goal: form.goal,
        customDailyCalories: form.customDailyCalories ? Number(form.customDailyCalories) : null,
        phoneNumber: form.phoneNumber.trim(), dietaryPreferences: form.dietaryPreferences, allergies: form.allergies.trim() || 'NONE',
      });
      setTargets(profile.targets);
      setResultGoal(form.goal);
      setMessage('Đã lưu hồ sơ dinh dưỡng vào tài khoản.');
      userService.getProfile().then(account => updateUser(toUser(account))).catch(() => {});
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  return <MainLayout><div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
    <div><p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-2 mb-2"><Leaf size={16} /> CHĂM SÓC BẢN THÂN</p><h1 className="text-3xl sm:text-4xl font-bold">Dinh dưỡng của bạn</h1><p className="text-sm text-gray-500 mt-3">Từ thông tin cơ thể đến mục tiêu cho mỗi ngày.</p></div>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {loading && <p role="status" className="text-sm text-gray-500">Đang tải hồ sơ đã lưu...</p>}
    {loadError && <div role="alert" className="text-sm text-red-700">{loadError}<button type="button" onClick={() => setReload(value => value + 1)} className="underline ml-3">Tải lại hồ sơ</button></div>}
    <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
      <form onSubmit={calculate} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <fieldset disabled={busy || saving || loading || !!loadError} className="space-y-5 min-w-0">
        <h2 className="flex gap-2 items-center font-bold text-lg pb-4 border-b border-gray-100"><Activity size={20} className="text-emerald-700" /> Thông tin cơ thể</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold mb-1.5">Giới tính</label><select className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as NutritionGender })}><option value="FEMALE">Nữ</option><option value="MALE">Nam</option></select></div>
          <Input label="Tuổi" type="number" min="13" max="100" required readOnly={isAuthenticated && !!form.dateOfBirth} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
        </div>
        {isAuthenticated && <Input label="Ngày sinh" type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={e => { const birth = new Date(e.target.value); const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--; setForm({ ...form, dateOfBirth: e.target.value, age: Number.isFinite(age) ? String(age) : form.age }); }} />}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Chiều cao (cm)" type="number" min="50" max="280" step="0.1" required value={form.heightCm} onChange={e => setForm({ ...form, heightCm: e.target.value })} />
          <Input label="Cân nặng (kg)" type="number" min="20" max="350" step="0.1" required value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} />
        </div>
        <div><label className="block text-xs font-semibold mb-1.5">Mức vận động</label><select className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" value={form.activityLevel} onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}>{Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <fieldset><legend className="text-xs font-semibold mb-2">Mục tiêu của bạn</legend><div className="grid grid-cols-3 gap-2">{Object.entries(goalLabels).map(([value, label], index) => { const Icon = [ArrowDown, Minus, TrendingUp][index]; return <button key={value} type="button" aria-pressed={form.goal === value} onClick={() => setForm({ ...form, goal: value as NutritionGoal })} className={`flex flex-col items-center gap-2 py-3 rounded-lg border text-xs font-semibold ${form.goal === value ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><Icon size={18} />{label}</button>; })}</div></fieldset>
        <Input label="Calo tùy chỉnh" type="number" min="800" max="10000" value={form.customDailyCalories} onChange={e => setForm({ ...form, customDailyCalories: e.target.value })} helperText="Để trống nếu muốn hệ thống tự tính." />
        {isAuthenticated && <div className="border-t pt-5 space-y-4"><h2 className="font-bold text-base">Chế độ ăn & liên hệ</h2><Input label="Số điện thoại" type="tel" maxLength={15} pattern="([+]84|84|0)(3|5|7|8|9)[0-9]{8}" value={form.phoneNumber} onChange={event => setForm({ ...form, phoneNumber: event.target.value })} placeholder="0912345678" /><label className="block text-xs font-semibold">Chế độ ăn<select aria-label="Chế độ ăn" className="w-full border border-gray-200 rounded-lg bg-gray-50 p-3 text-sm mt-2" value={form.dietaryPreferences} onChange={event => setForm({ ...form, dietaryPreferences: event.target.value })}><option value="">Chọn chế độ ăn</option>{Object.entries(dietLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Input label="Dị ứng / thực phẩm cần tránh" maxLength={255} value={form.allergies} onChange={event => setForm({ ...form, allergies: event.target.value })} placeholder="Đậu phộng, mè..." /></div>}
        <div className="flex flex-wrap gap-2"><Button type="submit" name="intent" value="calculate" isLoading={busy} leftIcon={<Calculator size={16} />}>Tính mục tiêu</Button>{isAuthenticated && <Button type="submit" name="intent" value="save" variant="outline" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>Lưu hồ sơ</Button>}</div>
        </fieldset>
      </form>
      <section className="min-w-0">
        {isAuthenticated && targets && <Link to="/meal-plans" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-5"><Target size={17} />Lập kế hoạch ăn uống</Link>}
        {!targets ? <><img src="https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1000&q=85" alt="Bữa ăn từ rau củ" className="w-full aspect-[16/9] object-cover rounded-lg" /><div className="py-7"><Target size={26} className="text-emerald-700 mb-4" /><h2 className="text-2xl font-bold">Mỗi cơ thể, một mục tiêu riêng.</h2><p className="text-sm text-gray-500 mt-3 leading-6">Khám phá mức năng lượng và các chỉ số dinh dưỡng phù hợp với thông tin của bạn.</p><div className="flex flex-wrap gap-6 mt-6 text-xs text-gray-500"><span className="flex items-center gap-2"><Activity size={16} /> Chỉ số cơ thể</span><span className="flex items-center gap-2"><Flame size={16} /> Năng lượng</span><span className="flex items-center gap-2"><Leaf size={16} /> Dưỡng chất</span></div></div></> :
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6"><p className="flex items-center gap-2 text-sm text-emerald-700 font-semibold"><Flame size={18} /> Năng lượng mục tiêu mỗi ngày</p><p className="text-5xl font-bold mt-3">{Math.round(targets.dailyCaloriesTarget).toLocaleString('vi-VN')} <span className="text-lg text-gray-400 font-normal">kcal</span></p><p className="text-sm text-gray-500 mt-3">Mục tiêu: {goalLabels[resultGoal]}</p></div>
            <div className="grid grid-cols-3 gap-3">{[['BMI', targets.bmi?.toFixed(1)], ['BMR', Math.round(targets.bmr)], ['TDEE', Math.round(targets.tdee)]].map(([label, value]) => <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 min-w-0"><p className="text-xs text-gray-500">{label}</p><p className="text-xl sm:text-2xl font-bold mt-2">{value}</p></div>)}</div>
            <p className="border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">{targets.bmiCategoryLabel}</p>
            <div><h2 className="text-lg font-bold mb-4">Phân bổ dưỡng chất</h2><div className="space-y-4">{[
              { label: 'Chất đạm', value: targets.proteinTargetG, color: 'bg-emerald-600', factor: 4 },
              { label: 'Tinh bột', value: targets.carbsTargetG, color: 'bg-sky-500', factor: 4 },
              { label: 'Chất béo', value: targets.fatTargetG, color: 'bg-amber-400', factor: 9 },
            ].map(item => <div key={item.label}><div className="flex justify-between text-sm mb-2"><span className="text-gray-600">{item.label}</span><span className="font-bold">{item.value} g</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${Math.min(100, Math.max(0, item.value * item.factor / Math.max(1, targets.dailyCaloriesTarget) * 100))}%` }} /></div></div>)}</div><div className="flex justify-between border-t border-gray-200 mt-5 pt-4 text-sm"><span className="text-gray-600">Chất xơ</span><span className="font-bold">{targets.fiberTargetG} g / ngày</span></div></div>
            {!!targets.warnings?.length && <ul className="list-disc pl-6 text-sm text-amber-800">{targets.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
          </div>}
      </section>
    </div>
  </div></MainLayout>;
}
