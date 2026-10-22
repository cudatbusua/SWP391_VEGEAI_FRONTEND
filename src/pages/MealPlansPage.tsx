import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
  Flame,
  Leaf,
  Minus,
  RefreshCw,
  Save,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { CommunityConfirm, CommunityGuard, VideoPlayer } from '../components/CommunityUi';
import { RecipeImage } from '../components/RecipeImage';
import { SavedMealPlans, planDate } from '../components/SavedMealPlans';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { useAuth } from '../hooks/useAuth';
import { mealPlanService } from '../services/mealPlanService';
import { fridgeService } from '../services/fridgeService';
import { nutritionService } from '../services/nutritionService';
import { userService } from '../services/userService';
import { toUser } from '../services/authService';
import { ApiError, errorMessage } from '../services/apiClient';
import { dietLabels, displayAllergies } from '../utils/nutritionProfile';
import type { MealPlan, PlannedMeal } from '../types/mealPlan';
import type { ActivityLevel, NutritionGender, NutritionGoal, NutritionTargets } from '../types/api';
import '../styles/meal-plan.css';

const activityLabels: Record<ActivityLevel, string> = {
  SEDENTARY: 'Ít vận động (Văn phòng)',
  LIGHT: 'Vận động nhẹ (1-2 buổi/tuần)',
  MODERATE: 'Vận động vừa (3-5 buổi/tuần)',
  ACTIVE: 'Vận động nhiều (6-7 buổi/tuần)',
  VERY_ACTIVE: 'Rất năng động (Vận động viên)',
};

const goalLabels: Record<NutritionGoal, string> = {
  LOSE_WEIGHT: 'Giảm cân lành mạnh',
  MAINTAIN: 'Giữ cân & Duy trì',
  GAIN_MUSCLE: 'Tăng cơ thực vật',
};

function ageFromBirth(value: string) {
  const birth = new Date(value + 'T12:00:00');
  const today = new Date();
  if (!value || !Number.isFinite(birth.getTime())) return '';
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return String(age);
}

function MealDetails({ meal }: { meal: PlannedMeal }) {
  const [open, setOpen] = useState(false);
  const factor = meal.portions / Math.max(1, meal.recipe.servings || 1);
  return (
    <div className="planned-details">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Nguyên liệu & cách nấu
        <ChevronDown size={16} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div>
          <ul>
            {meal.recipe.ingredients.map((item, index) => (
              <li key={index}>
                <span>{item.name}</span>
                <strong>
                  {item.amount == null ? '--' : Math.round(item.amount * factor * 10) / 10} {item.unit}
                </strong>
              </li>
            ))}
          </ul>
          <ol>
            {meal.recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          {meal.recipe.videos?.map(video => (
            <div key={video.id} className="planned-video">
              <h4>{video.title}</h4>
              <VideoPlayer video={video} />
            </div>
          ))}
          <Link to={'/recipe/' + meal.recipeId}>
            Công thức gốc
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

export function NutritionProfileManager({ onSaved }: { onSaved?: () => void }) {
  const { isAuthenticated, user, updateUser } = useAuth();
  const [form, setForm] = useState({
    gender: 'FEMALE' as NutritionGender,
    age: '26',
    dateOfBirth: '',
    heightCm: '165',
    weightKg: '56',
    activityLevel: 'MODERATE' as ActivityLevel,
    goal: 'MAINTAIN' as NutritionGoal,
    customDailyCalories: '',
    phoneNumber: '',
    dietaryPreferences: 'VEGETARIAN',
    allergies: '',
  });
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isAuthenticated);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      userService.getProfile(controller.signal),
      nutritionService.getProfile(controller.signal).catch(reason => {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      }),
    ])
      .then(([account, saved]) => {
        if (controller.signal.aborted) return;
        setForm({
          gender: saved?.gender || (account.gender === 'MALE' ? 'MALE' : 'FEMALE'),
          age: saved ? String(saved.age) : ageFromBirth(account.dateOfBirth || '') || '26',
          dateOfBirth: saved?.dateOfBirth || account.dateOfBirth || '1998-05-15',
          heightCm: String(saved?.heightCm ?? account.heightCm ?? '165'),
          weightKg: String(saved?.weightKg ?? account.weightKg ?? '56'),
          activityLevel: saved?.activityLevel || 'MODERATE',
          goal: saved?.goal || 'MAINTAIN',
          customDailyCalories: saved?.customDailyCalories == null ? '' : String(saved.customDailyCalories),
          phoneNumber: account.phoneNumber || '',
          dietaryPreferences: account.dietaryPreferences || saved?.dietaryPreferences || 'VEGETARIAN',
          allergies: displayAllergies(account.allergies || saved?.allergies),
        });
        if (saved) setTargets(saved.targets);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isAuthenticated, user?.id]);

  const calculateOnly = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await nutritionService.calculate({
        gender: form.gender,
        age: Number(form.dateOfBirth ? ageFromBirth(form.dateOfBirth) : form.age) || 26,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        activityLevel: form.activityLevel,
        goal: form.goal,
        customDailyCalories: form.customDailyCalories ? Number(form.customDailyCalories) : undefined,
      });
      setTargets(result);
      setMessage('Đã tính toán lại chỉ số BMI, BMR và TDEE.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateOfBirth) {
      setError('Vui lòng nhập ngày sinh để lưu hồ sơ dinh dưỡng.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await nutritionService.saveProfile({
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        activityLevel: form.activityLevel,
        goal: form.goal,
        customDailyCalories: form.customDailyCalories ? Number(form.customDailyCalories) : null,
        phoneNumber: form.phoneNumber.trim() || '0912345678',
        dietaryPreferences: form.dietaryPreferences || 'VEGETARIAN',
        allergies: form.allergies.trim() || 'NONE',
      });
      setTargets(saved.targets);
      setMessage('Đã cập nhật Hồ sơ Dinh dưỡng & Chỉ số cơ thể thành công!');
      userService.getProfile().then(acc => updateUser(toUser(acc))).catch(() => {});
      onSaved?.();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          {message}
        </div>
      )}

      {/* Calculated KPI Strip */}
      {targets && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Chỉ số BMI', `${targets.bmi.toFixed(1)}`, targets.bmiCategoryLabel, <Scale size={18} className="text-emerald-600" />],
            ['Mục tiêu Calo', `${Math.round(targets.dailyCaloriesTarget).toLocaleString('vi-VN')}`, 'kcal / ngày', <Flame size={18} className="text-orange-500" />],
            ['Đạm thực vật', `${Math.round(targets.proteinTargetG)} g`, 'Protein / ngày', <Activity size={18} className="text-emerald-600" />],
            ['Tinh bột phức', `${Math.round(targets.carbsTargetG)} g`, 'Carbs / ngày', <Leaf size={18} className="text-teal-600" />],
            ['Chất béo tốt', `${Math.round(targets.fatTargetG)} g`, `Xơ: ${Math.round(targets.fiberTargetG)}g`, <Target size={18} className="text-amber-500" />],
          ].map(([label, val, sub, icon]) => (
            <div key={String(label)} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{label}</span>
                {icon}
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{val}</p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Body & Activity */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Chỉ số Cơ thể & Vận động
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dữ liệu cơ sở để tính toán chính xác BMI, BMR và TDEE mỗi ngày
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Giới tính sinh học</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value as NutritionGender })}
              >
                <option value="FEMALE">Nữ</option>
                <option value="MALE">Nam</option>
              </select>
            </div>
            <Input
              label="Ngày sinh"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.dateOfBirth}
              onChange={e =>
                setForm({
                  ...form,
                  dateOfBirth: e.target.value,
                  age: ageFromBirth(e.target.value) || form.age,
                })
              }
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Chiều cao (cm)"
              type="number"
              min="50"
              max="260"
              step="0.5"
              required
              value={form.heightCm}
              onChange={e => setForm({ ...form, heightCm: e.target.value })}
            />
            <Input
              label="Cân nặng (kg)"
              type="number"
              min="20"
              max="300"
              step="0.1"
              required
              value={form.weightKg}
              onChange={e => setForm({ ...form, weightKg: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cường độ vận động hàng tuần</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white"
              value={form.activityLevel}
              onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
            >
              {Object.entries(activityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Mục tiêu thể trạng</span>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(goalLabels).map(([value, label], index) => {
                const Icon = [ArrowDown, Minus, TrendingUp][index];
                const active = form.goal === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, goal: value as NutritionGoal })}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Diet, Allergies & Save */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-600" />
              Chế độ Ăn chay & Dị ứng
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              AI Bếp Trưởng sẽ tự động loại trừ cứng các thành phần dị ứng khi lập thực đơn
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Trường phái ăn chay áp dụng</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white"
              value={form.dietaryPreferences}
              onChange={e => setForm({ ...form, dietaryPreferences: e.target.value })}
            >
              {Object.entries(dietLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Dị ứng / Nguyên liệu cần tránh (cách nhau bằng dấu phẩy)"
            maxLength={255}
            value={form.allergies}
            onChange={e => setForm({ ...form, allergies: e.target.value })}
            placeholder="Ví dụ: Đậu phộng, Hạt điều, Mè, Gluten..."
          />

          <Input
            label="Mục tiêu Calo tùy chỉnh (kcal/ngày - Tùy chọn)"
            type="number"
            min="800"
            max="8000"
            value={form.customDailyCalories}
            onChange={e => setForm({ ...form, customDailyCalories: e.target.value })}
            helperText="Để trống nếu muốn hệ thống tính tự động theo TDEE chuẩn."
          />

          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              isLoading={busy}
              onClick={() => void calculateOnly()}
              leftIcon={<Calculator size={16} />}
            >
              Tính thử BMI / TDEE
            </Button>
            <Button
              type="submit"
              isLoading={saving || loading}
              leftIcon={<Save size={16} />}
            >
              Lưu Hồ sơ Dinh dưỡng
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PlannerHub() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [period, setPeriod] = useState<'WEEK' | 'MONTH'>('WEEK');
  const today = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(today);
  const [meals, setMeals] = useState(3);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [day, setDay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [replacement, setReplacement] = useState('');

  const profile = useCommunityQuery(
    'planner-profile:' + user?.id + ':' + revision,
    signal =>
      nutritionService.getProfile(signal).catch(reason => {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      })
  );
  const query = useCommunityQuery('meal-plan:' + user?.id + ':' + id, signal => mealPlanService.get(id || '', signal), !!id);
  const options = useCommunityQuery(
    'plan-options:' + user?.id + ':' + id,
    signal => mealPlanService.options(id || '', signal),
    !!id && plan?.id === id && plan.status === 'DRAFT'
  );

  useEffect(() => {
    setPlan(null);
    setDay(0);
    setError('');
    setMessage('');
    setSwapping(null);
  }, [id]);

  useEffect(() => {
    if (query.data) setPlan(query.data);
  }, [query.data]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !profile.data) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await mealPlanService.generate({ period, startDate, mealsPerDay: meals });
      navigate('/meal-plans/' + result.id);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!plan || busy) return;
    setBusy(true);
    setError('');
    try {
      setPlan(await mealPlanService.save(plan.id));
      setMessage('Đã lưu kế hoạch thực đơn thành công!');
      setRevision(value => value + 1);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const swap = async () => {
    if (!plan || swapping === null || busy || !replacement) return;
    setBusy(true);
    setError('');
    try {
      setPlan(await mealPlanService.swap(plan.id, day, swapping, replacement));
      setSwapping(null);
      setReplacement('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const exportToMarket = async () => {
    if (!plan) return;
    const ingredientMap = new Map<string, { name: string; amount?: number; unit?: string }>();
    for (const d of plan.plan.days) {
      for (const m of d.meals) {
        for (const ing of m.recipe.ingredients) {
          const key = ing.name.trim().toLowerCase();
          if (!ingredientMap.has(key)) {
            ingredientMap.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit });
          }
        }
      }
    }

    let stockedNames = new Set<string>();
    try {
      const fridgeItems = await fridgeService.list('ACTIVE');
      stockedNames = new Set(fridgeItems.map(f => f.name.trim().toLowerCase()));
    } catch {
      // ignore network errors for fridge check
    }

    const missingItems: any[] = [];
    ingredientMap.forEach(({ name, amount, unit }, key) => {
      const isStocked = Array.from(stockedNames).some(st => key.includes(st) || st.includes(key));
      if (!isStocked) {
        missingItems.push({
          id: 'plan-' + Math.random().toString(36).substring(2, 9),
          name,
          amount: amount ? `${amount} ${unit || ''}`.trim() : 'Theo định lượng',
          category: 'produce',
          categoryLabel: 'Rau củ & Quả tươi',
          mealNote: `Từ thực đơn ${planDate(plan.plan.startDate)}`,
          checked: false,
        });
      }
    });

    navigate('/smart-market', {
      state: {
        importedItems: missingItems,
        planTitle: `Thực đơn ${planDate(plan.plan.startDate)} - ${planDate(plan.plan.endDate)}`
      }
    });
  };

  const selected = plan?.plan.days[day];
  const targets = plan?.plan.targets;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Unified Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <ChefHat size={15} /> Kế hoạch Thực đơn & Lịch ăn chay thông minh
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Kế hoạch Ăn uống & Thực đơn AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thiết kế thực đơn tuần hoặc tháng, tự động tính toán năng lượng theo chỉ số TDEE và loại trừ dị ứng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/settings?tab=profile"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs"
            title="Quản lý thể trạng, chiều cao, cân nặng, dị ứng & chỉ số BMI tại Hồ sơ cá nhân"
          >
            <Activity size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Hồ sơ Thể trạng & BMI</span>
          </Link>
          <Link
            to="/settings?tab=calendar"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition border border-emerald-200 dark:border-emerald-800 shadow-xs"
            title="Xem lịch biểu 42 ô cố định chuẩn tháng"
          >
            <CalendarDays size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Lịch biểu tháng cố định</span>
          </Link>
        </div>
      </div>

      <div className="meal-plan-page !p-0 !max-w-none">
          <div className="meal-plan-layout">
            <aside className="meal-plan-sidebar bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <form onSubmit={generate} className="plan-settings">
                <h2>
                  <CalendarDays size={18} /> Lập thực đơn mới
                </h2>
                <fieldset disabled={busy || profile.busy || !!profile.error || !profile.data}>
                  <div className="plan-period" role="group" aria-label="Thời gian kế hoạch">
                    {(['WEEK', 'MONTH'] as const).map(value => (
                      <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>
                        {value === 'WEEK' ? 'Theo Tuần' : 'Theo Tháng'}
                      </button>
                    ))}
                  </div>
                  <label>
                    Ngày bắt đầu
                    <input type="date" required min={today} value={startDate} onChange={event => setStartDate(event.target.value)} />
                  </label>
                  <label>
                    Số bữa mỗi ngày
                    <select value={meals} onChange={event => setMeals(Number(event.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map(value => (
                        <option key={value} value={value}>
                          {value} bữa / ngày
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="plan-primary" type="submit">
                    <Sparkles size={16} />
                    {busy ? 'Đang tạo thực đơn...' : 'Tạo thực đơn AI'}
                  </button>
                </fieldset>
              </form>

              <section className="plan-profile">
                <h2>Hồ sơ dinh dưỡng áp dụng</h2>
                {profile.busy && <p role="status">Đang tải hồ sơ...</p>}
                {profile.error && (
                  <div role="alert">
                    <p>{profile.error}</p>
                    <button onClick={profile.refresh}>Tải lại</button>
                  </div>
                )}
                {!profile.busy && !profile.error && !profile.data && (
                  <div>
                    <p>Bạn chưa thiết lập chỉ số cơ thể. Hãy cập nhật ngay bên cạnh để AI lập thực đơn.</p>
                    <Link
                      to="/settings?tab=profile"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      Thiết lập Hồ sơ Thể trạng & BMI <ArrowUpRight size={14} />
                    </Link>
                  </div>
                )}
                {profile.data && (
                  <>
                    <strong>{profile.data.targets.dailyCaloriesTarget.toLocaleString('vi-VN')} kcal/ngày</strong>
                    <p>
                      BMI: {profile.data.targets.bmi.toFixed(1)} ({profile.data.targets.bmiCategoryLabel}) ·{' '}
                      {dietLabels[profile.data.dietaryPreferences || ''] || 'Ăn chay'}
                    </p>
                    {displayAllergies(profile.data.allergies) && (
                      <p className="plan-avoid">Loại trừ dị ứng: {displayAllergies(profile.data.allergies)}</p>
                    )}
                  </>
                )}
                <Link
                  to="/settings?tab=profile"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                >
                  Chỉnh sửa chỉ số & dị ứng <ArrowUpRight size={14} />
                </Link>
              </section>

              <SavedMealPlans revision={revision} />
            </aside>

            <section className="meal-plan-content">
              {error && swapping === null && (
                <p role="alert" className="plan-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="plan-success">
                  {message}
                  <Link to="/dashboard">
                    Về trang Tổng quan
                    <ArrowUpRight size={15} />
                  </Link>
                </p>
              )}
              {query.busy && <p role="status">Đang tải kế hoạch...</p>}
              {query.error && (
                <div role="alert" className="plan-error">
                  {query.error}
                  <button onClick={query.refresh}>Tải lại</button>
                </div>
              )}
              {!id && (
                <div className="plan-empty bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <img src="/images/vietnamese-vegan-table.png" alt="Bữa cơm chay với đậu phụ, rau củ và gỏi cuốn" />
                  <h2>Một tuần ăn chay cân bằng, khởi đầu từ chỉ số cơ thể của bạn.</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Chọn chu kỳ bên trái và nhấn <strong>Tạo thực đơn AI</strong> để hệ thống tự động tính toán khẩu phần khớp với TDEE và loại bỏ mọi nguyên liệu dị ứng.
                  </p>
                  <Link to="/ai-chef">
                    Trò chuyện thêm với AI Bếp Trưởng
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}
              {plan && (
                <>
                  <header className="plan-result-heading">
                    <div>
                      <span className={'plan-state ' + plan.status.toLowerCase()}>
                        {plan.status === 'SAVED' ? <Check size={13} /> : <CalendarDays size={13} />}
                        {plan.status === 'SAVED' ? 'Đã lưu' : 'Bản xem trước'}
                      </span>
                      <h2>Thực đơn {plan.plan.period === 'WEEK' ? 'tuần' : 'tháng'}</h2>
                      <p>
                        {planDate(plan.plan.startDate)} - {planDate(plan.plan.endDate)} · {plan.plan.days.length} ngày ·{' '}
                        {plan.plan.mealsPerDay} bữa/ngày
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={exportToMarket}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-2xs cursor-pointer"
                        title="Tự động lọc nguyên liệu còn thiếu chuyển sang Danh sách đi chợ"
                      >
                        <ShoppingBag size={14} />
                        <span>Đi chợ thông minh</span>
                      </button>
                      {plan.status === 'DRAFT' && (
                        <button className="plan-primary" disabled={busy || !!options.error} onClick={save}>
                          <Save size={16} />
                          Lưu kế hoạch
                        </button>
                      )}
                    </div>
                  </header>
                  {plan.plan.warnings.length > 0 && (
                    <details className="plan-warnings" open>
                      <summary>Lưu ý kế hoạch ({plan.plan.warnings.length})</summary>
                      <ul>
                        {plan.plan.warnings.map(warning => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {options.error && (
                    <div role="alert" className="plan-error">
                      {options.error}
                      <button onClick={options.refresh}>Tải lại</button>
                    </div>
                  )}
                  <nav className="plan-days" aria-label="Ngày trong kế hoạch">
                    {plan.plan.days.map((item, index) => (
                      <button
                        key={item.date}
                        aria-current={day === index ? 'date' : undefined}
                        onClick={() => {
                          setDay(index);
                          setSwapping(null);
                        }}
                      >
                        <span>Ngày {index + 1}</span>
                        <strong>{planDate(item.date)}</strong>
                      </button>
                    ))}
                  </nav>
                  {selected && targets && (
                    <>
                      <h3 className="plan-day-heading">
                        {new Date(selected.date + 'T12:00:00').toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                        <span>Dự kiến / Mục tiêu</span>
                      </h3>
                      <dl className="plan-nutrients">
                        {[
                          ['Năng lượng', selected.totals.calories, targets.dailyCaloriesTarget, 'kcal'],
                          ['Đạm', selected.totals.protein, targets.proteinTargetG, 'g'],
                          ['Carb', selected.totals.carbs, targets.carbsTargetG, 'g'],
                          ['Chất béo', selected.totals.fat, targets.fatTargetG, 'g'],
                        ].map(([label, value, target, unit]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                              {value}
                              <small>
                                {' '}
                                / {target} {unit}
                              </small>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="planned-meals">
                        {selected.meals.map(meal => (
                          <article
                            className="planned-meal"
                            key={plan.id + ':' + day + ':' + meal.slot + ':' + meal.recipeId}
                          >
                            <div className="planned-meal-top">
                              <div className="planned-meal-image">
                                <RecipeImage src={meal.imageUrl} title={meal.title} />
                              </div>
                              <div>
                                <span className="planned-meal-slot">Bữa {meal.slot + 1}</span>
                                <h3>{meal.title}</h3>
                                <p>
                                  {meal.portions} khẩu phần · {meal.nutrition.calories} kcal
                                </p>
                                <small>
                                  Đạm {meal.nutrition.protein} g · Carb {meal.nutrition.carbs} g · Béo {meal.nutrition.fat} g
                                </small>
                              </div>
                              {plan.status === 'DRAFT' && (
                                <button
                                  className="planned-swap"
                                  type="button"
                                  title="Đổi món"
                                  aria-label={'Đổi món bữa ' + (meal.slot + 1)}
                                  disabled={busy || options.busy || !!options.error}
                                  onClick={() => {
                                    setSwapping(meal.slot);
                                    setReplacement('');
                                    setError('');
                                  }}
                                >
                                  <RefreshCw size={17} />
                                </button>
                              )}
                            </div>
                            <MealDetails meal={meal} />
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          </div>

          <CommunityConfirm
            open={swapping !== null}
            title="Đổi món trong kế hoạch"
            busy={busy}
            disabled={!replacement}
            onCancel={() => {
              setSwapping(null);
              setError('');
            }}
            onConfirm={swap}
          >
            <label className="cm-field">
              Chọn công thức
              <select aria-label="Món thay thế" value={replacement} onChange={event => setReplacement(event.target.value)}>
                <option value="">Chọn món phù hợp</option>
                {options.data
                  ?.filter(recipe => recipe.recipeId !== selected?.meals[swapping ?? 0]?.recipeId)
                  .map(recipe => (
                    <option key={recipe.recipeId} value={recipe.recipeId}>
                      {recipe.title} · {recipe.calories} kcal/khẩu phần
                    </option>
                  ))}
              </select>
            </label>
            {options.data && options.data.length < 2 && <p>Chưa có món thay thế phù hợp.</p>}
            {error && (
              <p role="alert" className="plan-error">
                {error}
              </p>
            )}
          </CommunityConfirm>
        </div>
    </div>
  );
}

export function MealPlansPage() {
  return (
    <MainLayout>
      <CommunityGuard>
        <PlannerHub />
      </CommunityGuard>
    </MainLayout>
  );
}
