import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mealPlanService } from '../services/mealPlanService';
import { errorMessage } from '../services/apiClient';
import { wearableService, type WearableMetrics } from '../utils/wearableService';
import type { DailyIntake, MealCalendarDay, PlanNutrients } from '../types/mealPlan';
import type { NutritionTargets } from '../types/api';

const empty: PlanNutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function DailyIntakeCard({ date, day, targets }: {
  date: string; day: MealCalendarDay | null; targets?: NutritionTargets;
}) {
  const [intake, setIntake] = useState<DailyIntake | null>(null);
  const [portions, setPortions] = useState<Record<number, string>>({});
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [wearable, setWearable] = useState<WearableMetrics>(() => wearableService.getMetrics());

  useEffect(() => {
    const sync = () => setWearable(wearableService.getMetrics());
    window.addEventListener('wearable_sync_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('wearable_sync_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    mealPlanService.intake(date, controller.signal)
      .then(value => { if (!controller.signal.aborted) setIntake(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [date]);

  const update = async (slot: number, plannedPortions: number, remove: boolean) => {
    const amount = Number(portions[slot] ?? plannedPortions);
    if (!remove && (!Number.isFinite(amount) || amount < 0.25 || amount > 5)) {
      setError('Khẩu phần thực tế phải từ 0,25 đến 5.'); return;
    }
    setBusySlot(slot); setError('');
    try {
      setIntake(remove ? await mealPlanService.removeIntake(date, slot)
        : await mealPlanService.recordIntake(date, slot, amount));
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusySlot(null); }
  };

  const totals = intake?.totals ?? empty;
  const goals = targets ?? day?.targets;
  const metrics = [
    ['Calo', totals.calories, goals?.dailyCaloriesTarget, 'kcal'],
    ['Đạm', totals.protein, goals?.proteinTargetG, 'g'],
    ['Carb', totals.carbs, goals?.carbsTargetG, 'g'],
    ['Chất béo', totals.fat, goals?.fatTargetG, 'g'],
  ] as const;

  return <section aria-labelledby="daily-intake-title" className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#121a24] p-6 sm:p-8 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div><h2 id="daily-intake-title" className="text-lg font-bold text-stone-900 dark:text-white">Bữa ăn thực tế hôm nay</h2>
        <p className="text-xs text-stone-500 dark:text-slate-400">Chỉ số dựa trên khẩu phần bạn xác nhận đã ăn.</p></div>
      <Link to="/settings?tab=calendar" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Xem lịch thực đơn →</Link>
    </div>
    {day?.needsReview && <p role="alert" className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 p-3 text-sm text-amber-900 dark:text-amber-200">Hồ sơ dinh dưỡng đã thay đổi. Kế hoạch này cần xem lại; hãy tạo thực đơn mới trước khi ghi bữa ăn.</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {metrics.map(([label, actual, target, unit]) => <div key={label} className="rounded-xl bg-emerald-50/70 dark:bg-slate-800/90 p-3">
        <p className="text-xs text-stone-500 dark:text-slate-400">{label}</p>
        <p className="font-bold text-stone-900 dark:text-white">{Math.round(actual)} / {target ? Math.round(target) : '—'} {unit}</p>
        {target != null && target > 0 && <div className="mt-2 h-1.5 rounded-full bg-emerald-100 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, actual / target * 100)}%` }} /></div>}
      </div>)}
    </div>
    {(wearable.steps > 0 || wearable.activeCalories > 0) && goals?.dailyCaloriesTarget ? (
      <div className="mb-5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-3.5 text-xs text-sky-900 dark:text-sky-200 flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>Thiết bị đeo hôm nay:</strong> +{Math.round(wearable.activeCalories)} kcal ({wearable.steps.toLocaleString('vi-VN')} bước) · Ngân sách điều chỉnh:{' '}
          <strong>{Math.round(goals.dailyCaloriesTarget + wearable.activeCalories).toLocaleString('vi-VN')} kcal</strong>
          {' '}(còn lại{' '}
          <strong>{Math.max(0, Math.round(goals.dailyCaloriesTarget + wearable.activeCalories - totals.calories)).toLocaleString('vi-VN')} kcal</strong>)
        </span>
        <Link to="/settings?tab=calendar" className="font-extrabold text-sky-700 dark:text-sky-300 hover:underline">
          Điều chỉnh thực đơn →
        </Link>
      </div>
    ) : null}
    {day?.meals.length ? <div className="space-y-2">{day.meals.map(meal => {
      const recorded = intake?.meals.find(item => item.slot === meal.slot);
      const sameRecipe = recorded?.recipeId === meal.recipeId;
      return <div key={meal.slot} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 dark:border-slate-700 p-3">
        <div className="flex-1 min-w-[170px]"><p className="text-sm font-semibold text-stone-900 dark:text-white">Bữa {meal.slot + 1}: {meal.title}</p>
          <p className="text-xs text-stone-500 dark:text-slate-400">Dự kiến {meal.portions} khẩu phần · {Math.round(meal.nutrition.calories)} kcal{recorded && sameRecipe ? ` · Đã ăn ${recorded.portions} khẩu phần` : ''}</p>
          {recorded && !sameRecipe && <p className="text-xs text-amber-800 dark:text-amber-300">Đã ghi bữa trước: {recorded.title} ({recorded.portions} khẩu phần). Ghi món hiện tại sẽ thay bản ghi này.</p>}</div>
        <label className="text-xs text-stone-600 dark:text-slate-300">Khẩu phần thực tế <input type="number" min="0.25" max="5" step="0.25" value={portions[meal.slot] ?? String(sameRecipe ? recorded?.portions ?? meal.portions : meal.portions)}
          onChange={event => setPortions(previous => ({ ...previous, [meal.slot]: event.target.value }))}
          disabled={day.needsReview || busySlot !== null} className="ml-2 w-20 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-stone-900 dark:text-white px-2 py-1.5" /></label>
        <button type="button" disabled={day.needsReview || busySlot !== null} onClick={() => void update(meal.slot, meal.portions, false)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{recorded && sameRecipe ? 'Cập nhật' : 'Đã ăn'}</button>
        {recorded && <button type="button" disabled={busySlot !== null} onClick={() => void update(meal.slot, meal.portions, true)} className="text-xs font-bold text-rose-700 dark:text-rose-400 disabled:opacity-50">Bỏ ghi nhận</button>}
      </div>;
    })}</div> : <p className="text-sm text-stone-500 dark:text-slate-400">Chưa có thực đơn đã lưu cho hôm nay. Tạo thực đơn để ghi nhận bữa ăn.</p>}
  </section>;
}
