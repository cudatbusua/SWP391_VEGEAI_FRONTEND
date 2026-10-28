import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
  Flame,
  Leaf,
  RefreshCw,
  Save,
  Scale,
  Sparkles,
  Target,
  ShoppingBag,
  Watch,
  Utensils,
  Plus
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { CommunityConfirm, CommunityGuard, VideoPlayer } from '../components/CommunityUi';
import { RecipeImage } from '../components/RecipeImage';
import { SavedMealPlans, planDate } from '../components/SavedMealPlans';
import { GoogleCalendar31DaysView } from '../components/GoogleCalendar31DaysView';
import { SeasonalRegionalMealsView } from '../components/SeasonalRegionalMealsView';
import { WearableGoogleFitTracker } from '../components/WearableGoogleFitTracker';
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
import { sfx } from '../utils/soundEffects';
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

export const DEFAULT_WEEKLY_SCHEDULE = [
  {
    dayName: 'Thứ Hai',
    dayIndex: 1,
    targetCal: 1450,
    breakfast: { name: 'Bánh mì ngũ cốc bơ dầm & hạt chia', calories: 340, protein: 9, category: 'Năng lượng sáng' },
    lunch: { name: 'Cơm gạo lứt đậu hũ áp chảo sốt cà chua', calories: 540, protein: 22, category: 'Bữa chính' },
    dinner: { name: 'Canh nấm rong biển hạt sen thanh nhiệt', calories: 380, protein: 14, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Thứ Ba',
    dayIndex: 2,
    targetCal: 1420,
    breakfast: { name: 'Yến mạch nấu sữa đậu nành & chuối', calories: 320, protein: 11, category: 'Năng lượng sáng' },
    lunch: { name: 'Bún riêu chay nấm rơm & chả đậu hũ', calories: 510, protein: 20, category: 'Bữa chính' },
    dinner: { name: 'Rau củ ngũ sắc luộc kho quẹt chay', calories: 360, protein: 12, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Thứ Tư',
    dayIndex: 3,
    targetCal: 1480,
    breakfast: { name: 'Phở nấm thực dưỡng thanh ngọt', calories: 360, protein: 13, category: 'Năng lượng sáng' },
    lunch: { name: 'Cơm gạo lứt sườn non lúa mì kho tiêu', calories: 560, protein: 24, category: 'Bữa chính' },
    dinner: { name: 'Salad bơ đậu gà sốt mè rang', calories: 390, protein: 16, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Thứ Năm',
    dayIndex: 4,
    targetCal: 1400,
    breakfast: { name: 'Súp ngô non đậu hạt sen bùi ngậy', calories: 310, protein: 8, category: 'Năng lượng sáng' },
    lunch: { name: 'Bún lứt xào nấm đùi gà rau cải thìa', calories: 490, protein: 19, category: 'Bữa chính' },
    dinner: { name: 'Canh chua dọc mùng đậu hũ non', calories: 370, protein: 13, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Thứ Sáu',
    dayIndex: 5,
    targetCal: 1460,
    breakfast: { name: 'Bánh bao chay nhân nấm tươi', calories: 330, protein: 10, category: 'Năng lượng sáng' },
    lunch: { name: 'Cơm tấm sườn nấm bào ngư chiên giòn', calories: 550, protein: 21, category: 'Bữa chính' },
    dinner: { name: 'Cháo yến mạch củ sen hầm thảo mộc', calories: 360, protein: 12, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Thứ Bảy',
    dayIndex: 6,
    targetCal: 1520,
    breakfast: { name: 'Smoothie bowl xoài cải kale hạt lanh', calories: 340, protein: 10, category: 'Năng lượng sáng' },
    lunch: { name: 'Cà ri đậu gà khoai lang cốt dừa & bánh mì', calories: 580, protein: 23, category: 'Bữa chính' },
    dinner: { name: 'Gỏi cuốn ngũ sắc tương bơ đậu phộng', calories: 390, protein: 15, category: 'Thanh nhẹ tối' }
  },
  {
    dayName: 'Chủ Nhật',
    dayIndex: 0,
    targetCal: 1550,
    breakfast: { name: 'Miến xào rau củ nấm đông cô', calories: 350, protein: 11, category: 'Năng lượng sáng' },
    lunch: { name: 'Lẩu nấm dưỡng sinh sum họp gia đình', calories: 610, protein: 26, category: 'Bữa tiệc xanh' },
    dinner: { name: 'Canh bí đỏ đậu phụ hầm hạt sen ngọt lành', calories: 370, protein: 14, category: 'Thanh nhẹ tối' }
  }
];

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
                <span>{String(label)}</span>
                {icon}
              </div>
              <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{String(val)}</div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{String(sub)}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-xs">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <Activity size={18} className="text-emerald-600" />
          <span>Hồ Sơ Thể Trạng & Chỉ Số Cá Nhân</span>
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Giới tính</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm"
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value as NutritionGender })}
            >
              <option value="FEMALE">Nữ</option>
              <option value="MALE">Nam</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <Input
            label="Ngày sinh"
            type="date"
            required
            value={form.dateOfBirth}
            onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
          />

          <Input
            label="Chiều cao (cm)"
            type="number"
            min="100"
            max="250"
            required
            value={form.heightCm}
            onChange={e => setForm({ ...form, heightCm: e.target.value })}
          />

          <Input
            label="Cân nặng (kg)"
            type="number"
            min="30"
            max="250"
            required
            value={form.weightKg}
            onChange={e => setForm({ ...form, weightKg: e.target.value })}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mức độ vận động</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm"
              value={form.activityLevel}
              onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
            >
              {Object.entries(activityLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mục tiêu dinh dưỡng</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm"
              value={form.goal}
              onChange={e => setForm({ ...form, goal: e.target.value as NutritionGoal })}
            >
              {Object.entries(goalLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Trường phái ăn chay</label>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm"
              value={form.dietaryPreferences}
              onChange={e => setForm({ ...form, dietaryPreferences: e.target.value })}
            >
              {Object.entries(dietLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Dị ứng / Kiêng cử"
            value={form.allergies}
            onChange={e => setForm({ ...form, allergies: e.target.value })}
            placeholder="Ví dụ: Đậu phộng, Mè, Gluten..."
          />
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            isLoading={busy}
            onClick={() => void calculateOnly()}
            leftIcon={<Calculator size={16} />}
          >
            Tính Thử BMI / TDEE
          </Button>
          <Button
            type="submit"
            isLoading={saving || loading}
            leftIcon={<Save size={16} />}
          >
            Lưu Hồ Sơ Dinh Dưỡng
          </Button>
        </div>
      </form>
    </div>
  );
}

function PlannerHub() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'calendar' | 'planner' | 'seasonal' | 'fit') || 'calendar';

  const handleTabChange = (tab: 'calendar' | 'planner' | 'seasonal' | 'fit') => {
    sfx.playTap();
    setSearchParams({ tab });
  };

  const { user } = useAuth();
  const [period, setPeriod] = useState<'WEEK' | 'MONTH'>('WEEK');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(todayStr);
  const [meals, setMeals] = useState(3);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [day, setDay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [replacement, setReplacement] = useState('');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());

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
    if (query.data) {
      setPlan(query.data);
    }
  }, [query.data]);

  // Generate AI Plan
  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !profile.data) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await mealPlanService.generate({ period, startDate, mealsPerDay: meals });
      navigate('/meal-plans/' + result.id + '?tab=planner');
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
      // ignore
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

  // Calendar dates with meals
  const hasMealDays = useMemo(() => {
    const set = new Set<string>();
    if (plan?.plan.days) {
      plan.plan.days.forEach(d => set.add(d.date));
    } else {
      // populate current month days with default weekly schedule
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        set.add(key);
      }
    }
    return set;
  }, [plan, calendarMonth]);

  const selectedDateStr = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;

  // Find plan day matching selected calendar date
  const planDayForCalendar = useMemo(() => {
    if (!plan) return null;
    return plan.plan.days.find(d => d.date === selectedDateStr) || null;
  }, [plan, selectedDateStr]);

  // Default day of week schedule
  const defaultDaySchedule = useMemo(() => {
    const dayOfWeek = selectedCalendarDate.getDay();
    return DEFAULT_WEEKLY_SCHEDULE.find(s => s.dayIndex === dayOfWeek) || DEFAULT_WEEKLY_SCHEDULE[0];
  }, [selectedCalendarDate]);

  const selected = plan?.plan.days[day];
  const targets = plan?.plan.targets;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Unified Main Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <ChefHat size={16} /> Kế hoạch Thực đơn & Lịch Ăn Chay Thông Minh
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Kế Hoạch Bữa Ăn & Lịch Biểu Dinh Dưỡng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hợp nhất lịch biểu 31 ngày, AI tạo thực đơn tuần/tháng, gợi ý món theo mùa vùng miền và đồng bộ Mi Band 8.
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
            to="/ai-chef"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
            title="Nhờ AI Bếp Trưởng tư vấn và tùy biến món"
          >
            <Sparkles size={15} />
            <span>Chat với AI Bếp Trưởng</span>
          </Link>
        </div>
      </div>

      {/* 4 Feature Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto shadow-2xs">
        {[
          { id: 'calendar', label: 'Lịch Thực Đơn 30-31 Ngày', icon: CalendarDays, desc: '42 ô cố định + Bữa ăn từng ngày' },
          { id: 'planner', label: 'Tạo & Quản Lý Thực Đơn AI', icon: ChefHat, desc: 'Lập kế hoạch tuần/tháng theo TDEE' },
          { id: 'seasonal', label: 'Món Chay Theo Mùa & Vùng Miền', icon: Leaf, desc: 'Thời khí 4 mùa & Nông sản 4 miền' },
          { id: 'fit', label: 'Thiết Bị Đeo (Minh Họa)', icon: Watch, desc: 'Minh họa giao diện · Chưa kết nối OAuth' },
        ].map(tabItem => {
          const Icon = tabItem.icon;
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => handleTabChange(tabItem.id as any)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer flex-1 justify-center ${
                isActive
                  ? 'bg-emerald-800 dark:bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top KPI Bar */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-base">
                <Flame className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200">
                  Mục tiêu năng lượng ngày: {profile.data?.targets.dailyCaloriesTarget ? Math.round(profile.data.targets.dailyCaloriesTarget).toLocaleString('vi-VN') : '1.650'} kcal/ngày
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Lịch ăn 31 ngày tự động liên kết các bữa sáng (chấm cam 🟠), trưa (chấm xanh lá 🟢), tối (chấm xanh dương 🔵).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('planner')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-2xs shrink-0 cursor-pointer text-xs"
            >
              <Plus size={14} />
              <span>Tạo Thực Đơn Mới Bằng AI</span>
            </button>
          </div>

          {/* Grid 2 Columns: Calendar + Day Details */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left: Google Calendar 42 cells */}
            <div className="lg:col-span-5">
              <GoogleCalendar31DaysView
                calendarMonth={calendarMonth}
                setCalendarMonth={setCalendarMonth}
                selectedDate={selectedCalendarDate}
                onSelectDate={d => {
                  setSelectedCalendarDate(d);
                  if (plan) {
                    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const idx = plan.plan.days.findIndex(dayItem => dayItem.date === dStr);
                    if (idx >= 0) setDay(idx);
                  }
                }}
                dailyCalorieTarget={profile.data?.targets.dailyCaloriesTarget ? Math.round(profile.data.targets.dailyCaloriesTarget).toLocaleString('vi-VN') : '1.650'}
                hasMealDays={hasMealDays}
              />
            </div>

            {/* Right: Selected Day's Meals */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Thực Đơn Ngày Đã Chọn
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedCalendarDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {planDayForCalendar ? 'Thực đơn AI cá nhân' : 'Thực đơn mẫu cân bằng'}
                  </span>
                </div>
              </div>

              {/* If active backend plan day exists */}
              {planDayForCalendar ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Tổng năng lượng ngày:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {planDayForCalendar.totals.calories} kcal · Đạm {planDayForCalendar.totals.protein}g · Carb {planDayForCalendar.totals.carbs}g · Béo {planDayForCalendar.totals.fat}g
                    </span>
                  </div>

                  <div className="space-y-3">
                    {planDayForCalendar.meals.map(m => (
                      <div key={m.recipeId + m.slot} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${
                              m.slot === 0 ? 'bg-orange-500' : m.slot === 1 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`} />
                            <div>
                              <span className="text-[11px] font-extrabold uppercase text-slate-400">
                                Bữa {m.slot + 1} ({m.slot === 0 ? 'Sáng' : m.slot === 1 ? 'Trưa' : 'Tối'})
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{m.title}</h4>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                            {m.nutrition.calories} kcal
                          </span>
                        </div>
                        <MealDetails meal={m} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Default Weekly Curated Meals for this weekday */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
                    💡 Ngày này đang áp dụng thực đơn gợi ý chuẩn thuần chay của VEGEAI. Bạn có thể nhấn nút <strong>Lập thực đơn AI</strong> bên dưới để điều chỉnh theo đúng số lượng nguyên liệu trong tủ lạnh của bạn.
                  </div>

                  <div className="space-y-3">
                    {/* Breakfast */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                          🟠 Sáng
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                            {defaultDaySchedule.breakfast.category}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {defaultDaySchedule.breakfast.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Đạm thực vật: ~{defaultDaySchedule.breakfast.protein}g
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400 shrink-0">
                        {defaultDaySchedule.breakfast.calories} kcal
                      </span>
                    </div>

                    {/* Lunch */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          🟢 Trưa
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                            {defaultDaySchedule.lunch.category}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {defaultDaySchedule.lunch.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Đạm thực vật: ~{defaultDaySchedule.lunch.protein}g
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        {defaultDaySchedule.lunch.calories} kcal
                      </span>
                    </div>

                    {/* Dinner */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          🔵 Tối
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                            {defaultDaySchedule.dinner.category}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {defaultDaySchedule.dinner.name}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Đạm thực vật: ~{defaultDaySchedule.dinner.protein}g
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 shrink-0">
                        {defaultDaySchedule.dinner.calories} kcal
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(selectedDateStr);
                        handleTabChange('planner');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>Tạo Thực Đơn AI Cho Tuần Này</span>
                    </button>
                    <Link
                      to="/ai-chef"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition"
                    >
                      <Utensils size={14} />
                      <span>Hỏi AI cách nấu món này</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI PLANNER VIEW */}
      {activeTab === 'planner' && (
        <div className="meal-plan-page !p-0 !max-w-none animate-in fade-in duration-200">
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
                    <input type="date" required min={todayStr} value={startDate} onChange={event => setStartDate(event.target.value)} />
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
                    <p>Bạn chưa thiết lập chỉ số cơ thể. Hãy cập nhật ngay bên dưới để AI lập thực đơn.</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <Link
                        to="/settings?tab=profile"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                      >
                        Thiết lập Hồ sơ Thể trạng & BMI <ArrowUpRight size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={profile.refresh}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                        title="Tải lại kiểm tra chỉ số dinh dưỡng"
                      >
                        <RefreshCw size={12} /> Tải lại hồ sơ
                      </button>
                    </div>
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
      )}

      {/* TAB 3: SEASONAL & REGIONAL MEALS */}
      {activeTab === 'seasonal' && (
        <div className="animate-in fade-in duration-200">
          <SeasonalRegionalMealsView />
        </div>
      )}

      {/* TAB 4: GOOGLE FIT & MI BAND 8 TRACKER */}
      {activeTab === 'fit' && (
        <div className="animate-in fade-in duration-200">
          <WearableGoogleFitTracker
            plannedCalorieIntake={profile.data?.targets.dailyCaloriesTarget ? Math.round(profile.data.targets.dailyCaloriesTarget) : 1650}
            userBmr={profile.data?.targets.bmr ? Math.round(profile.data.targets.bmr) : 1420}
          />
        </div>
      )}
    </div>
  );
}

export function MealPlansPage() {
  const [searchParams] = useSearchParams();
  return (
    <MainLayout>
      <CommunityGuard>
        {searchParams.get("tab") === "saved" ? (
          <div className="mx-auto max-w-5xl px-4 py-10">
            <SavedMealPlans revision={0} />
          </div>
        ) : (
          <PlannerHub />
        )}
      </CommunityGuard>
    </MainLayout>
  );
}


