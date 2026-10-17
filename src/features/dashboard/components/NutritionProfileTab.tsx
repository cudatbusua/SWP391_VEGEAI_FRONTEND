import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, UserRound } from 'lucide-react';
import { userService } from '../../../services/userService';
import { nutritionService } from '../../../services/nutritionService';
import { ApiError, errorMessage } from '../../../services/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import { dietLabels, displayAllergies } from '../../../utils/nutritionProfile';
import type { NutritionProfile, UserProfile } from '../../../types/api';

export function NutritionProfileTab() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<UserProfile | null>(null);
  const [nutrition, setNutrition] = useState<NutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setSaved(null); setNutrition(null);
    Promise.all([userService.getProfile(controller.signal), nutritionService.getProfile(controller.signal).catch(reason => {
      if (reason instanceof ApiError && reason.status === 404) return null;
      throw reason;
    })]).then(([account, profile]) => { if (!controller.signal.aborted) { setSaved(account); setNutrition(profile); } })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, attempt]);
  return <section className="space-y-6">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><span className="text-xs font-bold text-emerald-700">HỒ SƠ CỦA BẠN</span><h1 className="text-3xl font-bold mt-2">Hồ sơ dinh dưỡng</h1></div><Link to="/nutrition" className="inline-flex gap-2 items-center bg-emerald-700 text-white rounded-lg px-4 py-3 text-sm font-semibold">Cập nhật hồ sơ<ArrowUpRight size={17} /></Link></header>
    {loading && <p role="status" className="text-sm text-gray-500">Đang tải hồ sơ...</p>}
    {error && <div role="alert" className="text-sm text-red-700">{error}<button onClick={() => setAttempt(value => value + 1)} className="inline-flex gap-2 ml-3"><RefreshCw size={15} />Tải lại</button></div>}
    {saved && <><div className="border-y border-gray-200 py-6"><h2 className="flex items-center gap-2 font-semibold mb-5"><UserRound size={20} />{saved.fullName || saved.username}</h2><dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm">{[
      ['Email', saved.email], ['Số điện thoại', saved.phoneNumber], ['Ngày sinh', nutrition?.dateOfBirth || saved.dateOfBirth],
      ['Chiều cao', (nutrition?.heightCm ?? saved.heightCm) ? (nutrition?.heightCm ?? saved.heightCm) + ' cm' : ''],
      ['Cân nặng', (nutrition?.weightKg ?? saved.weightKg) ? (nutrition?.weightKg ?? saved.weightKg) + ' kg' : ''],
      ['Chế độ ăn', dietLabels[saved.dietaryPreferences || ''] || saved.dietaryPreferences],
      ['Dị ứng / thực phẩm cần tránh', displayAllergies(saved.allergies) || 'Chưa khai báo hoặc không có'],
      ['Mức vận động', nutrition ? ({SEDENTARY:'Ít vận động',LIGHT:'Vận động nhẹ',MODERATE:'Vận động vừa',ACTIVE:'Vận động nhiều',VERY_ACTIVE:'Rất năng động'})[nutrition.activityLevel] : ''],
      ['Mục tiêu', nutrition ? ({LOSE_WEIGHT:'Giảm cân',MAINTAIN:'Giữ cân',GAIN_MUSCLE:'Tăng cơ'})[nutrition.goal] : ''],
    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-gray-500 mb-2">{label}</dt><dd className="font-semibold break-words">{value || 'Chưa cập nhật'}</dd></div>)}</dl></div>
    {nutrition ? (
      <section>
        <h2 className="font-semibold mb-5">Mục tiêu dinh dưỡng cá nhân mỗi ngày</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            ['Năng lượng', nutrition.targets.dailyCaloriesTarget + ' kcal'],
            ['Đạm', nutrition.targets.proteinTargetG + ' g'],
            ['Carb', nutrition.targets.carbsTargetG + ' g'],
            ['Chất béo', nutrition.targets.fatTargetG + ' g'],
          ].map(([label, value]) => (
            <div key={label} className="border-l-2 border-emerald-600 pl-4">
              <dt className="text-xs text-gray-500 mb-2">{label}</dt>
              <dd className="font-bold text-lg">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/ai-chef"
            state={{
              nutritionTargets: nutrition.targets,
              goal: nutrition.goal,
              mode: 'chat',
            }}
            className="inline-flex gap-2 items-center rounded-xl bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-800 transition"
          >
            Đưa mục tiêu cho AI Bếp Trưởng phân tích
            <ArrowUpRight size={15} />
          </Link>
          <Link
            to="/ai-chef?tab=meal-plan"
            state={{
              nutritionTargets: nutrition.targets,
              goal: nutrition.goal,
              mode: 'meal-plan',
              period: 'WEEK',
            }}
            className="inline-flex gap-2 items-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 px-4 py-2.5 text-xs font-bold hover:bg-emerald-100 transition"
          >
            AI Set Thực Đơn Tuần / Tháng
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    ) : (
      <p className="text-sm text-gray-500">Bạn chưa lưu mục tiêu dinh dưỡng.</p>
    )}</>}
  </section>;
}
