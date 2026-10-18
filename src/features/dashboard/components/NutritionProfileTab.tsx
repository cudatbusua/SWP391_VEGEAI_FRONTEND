import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Flame, Leaf, RefreshCw, Scale, Target } from 'lucide-react';
import { nutritionService } from '../../../services/nutritionService';
import { ApiError, errorMessage } from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import { dietLabels, displayAllergies } from '../../../utils/nutritionProfile';
import type { NutritionProfile } from '../../../types/api';

const goalLabels: Record<string, string> = { LOSE_WEIGHT: 'Giảm cân lành mạnh', MAINTAIN: 'Duy trì cân nặng', GAIN_MUSCLE: 'Tăng cơ' };
const activityLabels: Record<string, string> = {
  SEDENTARY: 'Ít vận động', LIGHT: 'Vận động nhẹ', MODERATE: 'Vận động vừa', ACTIVE: 'Vận động nhiều', VERY_ACTIVE: 'Rất năng động',
};

export function NutritionProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setProfile(null);
    nutritionService.getProfile(controller.signal)
      .then(value => { if (!controller.signal.aborted) setProfile(value); })
      .catch(reason => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 404) setProfile(null);
        else setError(errorMessage(reason));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, attempt]);

  return <section className="space-y-6">
    <header className="flex flex-wrap justify-between items-start gap-4">
      <div><span className="text-xs font-bold text-emerald-700">CÁ NHÂN HÓA BỮA ĂN</span><h1 className="text-3xl font-bold mt-2">Hồ sơ dinh dưỡng</h1><p className="text-sm text-gray-500 mt-2">Thông tin cơ thể, mục tiêu và chế độ ăn đang dùng để cá nhân hóa gợi ý.</p></div>
      <Link to="/nutrition" className="inline-flex gap-2 items-center bg-emerald-700 text-white rounded-lg px-4 py-3 text-sm font-semibold">Chỉnh hồ sơ dinh dưỡng<ArrowUpRight size={17} /></Link>
    </header>
    {loading && <p role="status" className="text-sm text-gray-500">Đang tải hồ sơ dinh dưỡng...</p>}
    {error && <div role="alert" className="text-sm text-red-700">{error}<button onClick={() => setAttempt(value => value + 1)} className="inline-flex gap-2 ml-3"><RefreshCw size={15} />Tải lại</button></div>}
    {!loading && !error && !profile && <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center"><Leaf size={30} className="mx-auto text-emerald-700" /><h2 className="mt-3 text-lg font-bold">Bạn chưa lưu hồ sơ dinh dưỡng</h2><p className="mt-2 text-sm text-gray-500">Thêm mục tiêu, chế độ ăn và nguyên liệu cần tránh để nhận gợi ý phù hợp hơn.</p><Link to="/nutrition" className="inline-flex gap-2 items-center mt-5 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">Tạo hồ sơ dinh dưỡng<ArrowUpRight size={16} /></Link></div>}
    {profile && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Năng lượng', profile.targets.dailyCaloriesTarget, 'kcal / ngày', <Flame size={18} />],
          ['Chất đạm', profile.targets.proteinTargetG, 'g / ngày', <Activity size={18} />],
          ['Tinh bột', profile.targets.carbsTargetG, 'g / ngày', <Leaf size={18} />],
          ['Chất béo', profile.targets.fatTargetG, 'g / ngày', <Scale size={18} />],
        ].map(([label, value, unit, icon]) => <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</div><p className="mt-3 text-2xl font-bold">{Math.round(Number(value)).toLocaleString('vi-VN')}<span className="ml-1 text-sm font-medium text-gray-500">{unit}</span></p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6"><h2 className="flex items-center gap-2 font-bold"><Activity size={18} className="text-emerald-700" />Thông tin cơ thể</h2><dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
          {[
            ['Tuổi', `${profile.age} tuổi`], ['Giới tính', profile.gender === 'MALE' ? 'Nam' : profile.gender === 'FEMALE' ? 'Nữ' : 'Khác'],
            ['Chiều cao', `${profile.heightCm} cm`], ['Cân nặng', `${profile.weightKg} kg`],
            ['Mức vận động', activityLabels[profile.activityLevel] || profile.activityLevel], ['Mục tiêu', goalLabels[profile.goal] || profile.goal],
          ].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
        </dl></section>
        <section className="rounded-xl border border-gray-200 bg-white p-6"><h2 className="flex items-center gap-2 font-bold"><Target size={18} className="text-emerald-700" />Sở thích ăn uống</h2><dl className="mt-5 space-y-5 text-sm">
          <div><dt className="text-gray-500">Chế độ ăn</dt><dd className="mt-1 font-semibold">{dietLabels[profile.dietaryPreferences || ''] || 'Chưa chọn'}</dd></div>
          <div><dt className="text-gray-500">Dị ứng / nguyên liệu cần tránh</dt><dd className="mt-1 font-semibold">{displayAllergies(profile.allergies) || 'Chưa khai báo hoặc không có'}</dd></div>
          <div><dt className="text-gray-500">Chất xơ mỗi ngày</dt><dd className="mt-1 font-semibold">{profile.targets.fiberTargetG} g</dd></div>
        </dl></section>
      </div>
      <Link to="/meal-plans" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Lập kế hoạch ăn uống theo hồ sơ này<ArrowUpRight size={16} /></Link>
    </>}
  </section>;
}
