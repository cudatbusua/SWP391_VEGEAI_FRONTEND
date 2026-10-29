import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarDays, CheckCircle2, ChefHat, ChevronLeft, ChevronRight, History, Loader2, RefreshCw, Save, ShoppingBag, Sparkles, Utensils, X } from 'lucide-react';
import { MealCalendar31DaysView, calendarGridRange, toDateKey } from './MealCalendar31DaysView';
import { CommunityConfirm } from './CommunityUi';
import { PlannedMealDetails } from './PlannedMealDetails';
import { RecipeImage } from './RecipeImage';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { useAuth } from '../hooks/useAuth';
import { mealPlanService } from '../services/mealPlanService';
import { errorMessage } from '../services/apiClient';
import { sfx } from '../utils/soundEffects';
import { missingMarketItems } from '../utils/mealPlanMarket';
import type { NutritionTargets } from '../types/api';
import type { MealPlan, PlanNutrients, PlannedMeal } from '../types/mealPlan';

interface MealPlanCalendarPlannerProps {
  dailyCalorieTarget?: number;
  onAddToShoppingList: (mealTitle: string) => void;
}

const shortDate = (key: string) => new Date(key + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

/** Where a saved plan sits relative to today, with the colours used for its date tile and chip. */
const planStatus = (start: string, end: string, today: string) =>
  today > end
    ? { label: 'Đã qua', tile: 'bg-slate-400 dark:bg-slate-600', chip: 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700' }
    : today >= start
    ? { label: 'Đang diễn ra', tile: 'bg-emerald-600', chip: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800' }
    : { label: 'Sắp tới', tile: 'bg-sky-500', chip: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/60 dark:border-sky-800' };

/**
 * 30–31 day meal calendar with in-place AI planning: saved plans are merged by the backend
 * (latest save wins on overlapping days); a freshly generated plan stays a local draft until saved.
 */
export function MealPlanCalendarPlanner({ dailyCalorieTarget, onAddToShoppingList }: MealPlanCalendarPlannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [revision, setRevision] = useState(0);

  const [period, setPeriod] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [draft, setDraft] = useState<MealPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [swapping, setSwapping] = useState<number | null>(null);
  const [replacement, setReplacement] = useState('');

  const range = useMemo(() => {
    const { from, to } = calendarGridRange(calendarMonth);
    return { from: toDateKey(from), to: toDateKey(to) };
  }, [calendarMonth]);
  const calendar = useCommunityQuery(
    `meal-calendar:${user?.id}:${range.from}:${range.to}:${revision}`,
    signal => mealPlanService.calendar(range.from, range.to, signal)
  );
  const [savedPage, setSavedPage] = useState(0);
  const savedPlans = useCommunityQuery(
    `saved-meal-plans:${user?.id}:${savedPage}:${revision}`,
    signal => mealPlanService.list(savedPage, signal)
  );
  const options = useCommunityQuery(
    'calendar-plan-options:' + draft?.id,
    signal => mealPlanService.options(draft?.id || '', signal),
    !!draft && draft.status === 'DRAFT'
  );

  const savedDays = useMemo(() => new Map((calendar.data ?? []).map(day => [day.date, day])), [calendar.data]);
  const savedKeys = useMemo(() => new Set(savedDays.keys()), [savedDays]);
  const draftKeys = useMemo(() => new Set(draft?.plan.days.map(day => day.date)), [draft]);

  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const draftIndex = draft ? draft.plan.days.findIndex(day => day.date === selectedKey) : -1;
  const draftDay = draftIndex >= 0 ? draft!.plan.days[draftIndex] : null;
  const savedDay = savedDays.get(selectedKey) ?? null;
  const shown: { meals: PlannedMeal[]; totals: PlanNutrients; targets: NutritionTargets } | null = draftDay
    ? { meals: draftDay.meals, totals: draftDay.totals, targets: draft!.plan.targets }
    : savedDay
    ? { meals: savedDay.meals, totals: savedDay.totals, targets: savedDay.targets }
    : null;
  const canGenerate = selectedKey >= todayKey;
  const overlapsSaved = draft ? draft.plan.days.filter(day => savedKeys.has(day.date)).length : 0;

  // Smart market covers the whole draft, or the saved days of the month being viewed.
  const monthPrefix = toDateKey(calendarMonth).slice(0, 7);
  const marketDays = draft
    ? draft.plan.days
    : (calendar.data ?? []).filter(day => day.date.startsWith(monthPrefix));
  const exportToMarket = async () => {
    if (!marketDays.length) return;
    const title = draft
      ? `Bản nháp ${shortDate(draft.plan.startDate)} - ${shortDate(draft.plan.endDate)}`
      : `Thực đơn ${calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`;
    const importedItems = await missingMarketItems(marketDays.flatMap(day => day.meals), 'Từ ' + title.toLowerCase());
    navigate('/smart-market', { state: { importedItems, planTitle: title } });
  };

  const selectDate = (date: Date) => {
    sfx.playTap();
    setSelectedDate(date);
    setSwapping(null);
  };

  const generate = async () => {
    if (busy || !canGenerate) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await mealPlanService.generate({ period, startDate: selectedKey, mealsPerDay });
      setDraft(result);
      setMessage(`AI đã lập bản nháp ${result.plan.days.length} ngày. Xem từng ngày có chấm cam, đổi món nếu cần rồi bấm "Lưu vào lịch".`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    try {
      await mealPlanService.save(draft.id);
      setDraft(null);
      setRevision(value => value + 1);
      setMessage('Đã lưu thực đơn vào lịch.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const jumpToPlan = (startDate: string) => {
    const start = new Date(startDate + 'T12:00:00');
    setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    selectDate(start);
  };

  const discard = () => {
    setDraft(null);
    setSwapping(null);
    setError('');
    setMessage('Đã bỏ bản nháp. Lịch đang hiển thị các thực đơn đã lưu.');
  };

  const swap = async () => {
    if (!draft || swapping === null || busy || !replacement || draftIndex < 0) return;
    setBusy(true);
    setError('');
    try {
      setDraft(await mealPlanService.swap(draft.id, draftIndex, swapping, replacement));
      setSwapping(null);
      setReplacement('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* LỊCH THỰC ĐƠN 30–31 NGÀY - BÊN TRÁI */}
      <div className="lg:col-span-5">
        <MealCalendar31DaysView
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          dailyCalorieTarget={dailyCalorieTarget}
          hasMealDays={savedKeys}
          draftDays={draftKeys}
        />

        {/* KẾ HOẠCH ĐÃ LƯU - bấm để nhảy tới ngày bắt đầu trên lịch */}
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shadow-2xs">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Kế hoạch đã lưu</h3>
                <p className="text-[11px] text-slate-400">Bấm vào một kế hoạch để xem trên lịch · kế hoạch bị thay hết sẽ tự ẩn</p>
              </div>
            </div>
            {!!savedPlans.data?.totalElements && (
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {savedPlans.data.totalElements} kế hoạch
              </span>
            )}
          </div>

          {savedPlans.busy && (
            <ul role="status" aria-label="Đang tải kế hoạch" className="space-y-2.5">
              {[0, 1, 2].map(index => (
                <li key={index} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {savedPlans.error && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{savedPlans.error}</span>
              <button type="button" onClick={savedPlans.refresh} className="inline-flex items-center gap-1 font-bold hover:underline cursor-pointer shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
                Tải lại
              </button>
            </div>
          )}

          {savedPlans.data && savedPlans.data.items.length === 0 && (
            <div className="py-6 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <CalendarDays className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có kế hoạch nào</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Chọn một ngày trên lịch rồi bấm "Lập với AI" để bắt đầu.</p>
            </div>
          )}

          {savedPlans.data && savedPlans.data.items.length > 0 && (
            <>
              <ul className="space-y-2.5">
                {savedPlans.data.items.map(plan => {
                  const start = new Date(plan.firstVisibleDate + 'T12:00:00');
                  const status = planStatus(plan.firstVisibleDate, plan.lastVisibleDate, todayKey);
                  const isPartial = plan.visibleDays < plan.totalDays;
                  // Overlapping plans share dates; the selected day belongs to the plan the calendar shows for it.
                  const isViewing = savedDay ? savedDay.planId === plan.id : selectedKey >= plan.startDate && selectedKey <= plan.endDate;
                  return (
                    <li key={plan.id}>
                      <button
                        type="button"
                        onClick={() => jumpToPlan(plan.firstVisibleDate)}
                        aria-current={isViewing ? 'true' : undefined}
                        title="Xem kế hoạch này trên lịch"
                        className={`group w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                          isViewing
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700 ring-2 ring-emerald-100 dark:ring-emerald-950'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        <span className={`w-12 shrink-0 rounded-xl overflow-hidden text-center shadow-2xs border ${isViewing ? 'border-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}>
                          <span className={`block py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white ${status.tile}`}>
                            Th{start.getMonth() + 1}
                          </span>
                          <span className="block py-1 text-lg font-black leading-tight text-slate-900 dark:text-white bg-white dark:bg-slate-900 tabular-nums">
                            {start.getDate()}
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {plan.period === 'WEEK' ? 'Thực đơn 7 ngày' : 'Thực đơn 1 tháng'}
                            </strong>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${status.chip}`}>{status.label}</span>
                            {isPartial && (
                              <span
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800"
                                title="Các ngày còn lại đã được thay bằng kế hoạch lưu sau"
                              >
                                Còn {plan.visibleDays}/{plan.totalDays} ngày
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                              <CalendarDays className="w-3 h-3" />
                              {/* Only the days this plan still owns on the calendar */}
                              {plan.firstVisibleDate === plan.lastVisibleDate
                                ? shortDate(plan.firstVisibleDate)
                                : `${shortDate(plan.firstVisibleDate)} → ${shortDate(plan.lastVisibleDate)}`}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Utensils className="w-3 h-3" />
                              {plan.mealsPerDay} bữa/ngày
                            </span>
                          </span>
                          {isPartial && (
                            <span className="mt-0.5 block text-[10px] text-slate-400">
                              Gốc {shortDate(plan.startDate)} → {shortDate(plan.endDate)}, các ngày còn lại đã thay bằng kế hoạch lưu sau
                            </span>
                          )}
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            Lưu lúc {new Date(plan.savedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </span>
                        </span>

                        <ChevronRight className={`w-4 h-4 shrink-0 transition group-hover:translate-x-0.5 ${isViewing ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600 group-hover:text-emerald-600'}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {savedPlans.data.totalPages > 1 && (
                <nav aria-label="Phân trang kế hoạch" className="flex justify-center">
                  <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <button type="button" aria-label="Kế hoạch trang trước" disabled={savedPlans.data.first} onClick={() => setSavedPage(page => page - 1)} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 tabular-nums">Trang {savedPage + 1}/{savedPlans.data.totalPages}</span>
                    <button type="button" aria-label="Kế hoạch trang sau" disabled={savedPlans.data.last} onClick={() => setSavedPage(page => page + 1)} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* LẬP THỰC ĐƠN AI & THỰC ĐƠN CỦA NGÀY ĐANG CHỌN - BÊN PHẢI */}
      <section id="weekly-schedule" className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              Thực đơn ngày {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {draftDay
                ? 'Bản nháp AI, chưa lưu vào lịch.'
                : savedDay
                ? `Thuộc thực đơn ${savedDay.period === 'WEEK' ? 'tuần' : 'tháng'} đã lưu.`
                : 'Ngày này chưa có thực đơn.'}
            </p>
          </div>
          {marketDays.length > 0 && (
            <button
              type="button"
              onClick={() => void exportToMarket()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition shadow-2xs self-start sm:self-auto cursor-pointer"
              title={draft ? 'Lọc nguyên liệu còn thiếu của bản nháp sang Danh sách đi chợ' : 'Lọc nguyên liệu còn thiếu của các thực đơn đã lưu trong tháng đang xem'}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Đi chợ thông minh {draft ? '(bản nháp)' : '(cả tháng)'}</span>
            </button>
          )}
        </div>

        {/* LẬP THỰC ĐƠN VỚI AI TỪ NGÀY ĐANG CHỌN */}
        {!draft && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Lập thực đơn AI bắt đầu từ {selectedDate.toLocaleDateString('vi-VN')}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-emerald-300 dark:border-emerald-800 overflow-hidden text-xs font-bold" role="group" aria-label="Thời gian kế hoạch">
                {(['WEEK', 'MONTH'] as const).map(value => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                    className={`px-3 py-1.5 transition cursor-pointer ${period === value ? 'bg-emerald-700 text-white' : 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'}`}
                  >
                    {value === 'WEEK' ? '7 ngày' : '1 tháng'}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                Số bữa/ngày
                <select
                  value={mealsPerDay}
                  onChange={event => setMealsPerDay(Number(event.target.value))}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={generate}
                disabled={busy || !canGenerate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? 'AI đang lập thực đơn…' : 'Lập với AI'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {canGenerate
                ? 'AI chọn món theo mục tiêu dinh dưỡng, chế độ ăn và dị ứng trong hồ sơ của bạn. Ngày đã có thực đơn sẽ được thay khi bạn lưu kế hoạch mới.'
                : 'Chọn hôm nay hoặc một ngày trong tương lai để lập thực đơn.'}
            </p>
          </div>
        )}

        {draft && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-extrabold text-sm">
                Bản nháp AI: {shortDate(draft.plan.startDate)} – {shortDate(draft.plan.endDate)} · {draft.plan.days.length} ngày · {draft.plan.mealsPerDay} bữa/ngày
              </p>
              {overlapsSaved > 0 && <p className="mt-0.5">Khi lưu sẽ thay thực đơn đã lưu của {overlapsSaved} ngày trùng.</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={discard}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Bỏ nháp
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu vào lịch
              </button>
            </div>
          </div>
        )}

        {draft && draft.plan.warnings.length > 0 && (
          <details className="text-xs text-slate-600 dark:text-slate-400">
            <summary className="font-bold cursor-pointer">Lưu ý kế hoạch ({draft.plan.warnings.length})</summary>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {draft.plan.warnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          </details>
        )}

        {error && swapping === null && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {message && !error && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}
        {calendar.error && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
            <span>Không tải được lịch thực đơn: {calendar.error}</span>
            <button type="button" onClick={calendar.refresh} className="inline-flex items-center gap-1 font-bold hover:underline cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
              Tải lại
            </button>
          </div>
        )}

        {calendar.busy && !shown ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải lịch thực đơn…
          </div>
        ) : !shown ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
            {draft
              ? 'Ngày này nằm ngoài bản nháp. Chọn một ngày có chấm cam để xem thực đơn AI.'
              : 'Chưa có thực đơn cho ngày này. Dùng "Lập với AI" ở trên để lập thực đơn bắt đầu từ ngày đang chọn.'}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {shown.meals.length} bữa · Dự kiến / Mục tiêu
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ['Năng lượng', shown.totals.calories, shown.targets.dailyCaloriesTarget, 'kcal'],
                ['Đạm', shown.totals.protein, shown.targets.proteinTargetG, 'g'],
                ['Carb', shown.totals.carbs, shown.targets.carbsTargetG, 'g'],
                ['Chất béo', shown.totals.fat, shown.targets.fatTargetG, 'g'],
              ] as const).map(([label, value, target, unit]) => (
                <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {Math.round(value)}
                    <small className="block text-[10px] font-semibold text-slate-400">/ {Math.round(target)} {unit}</small>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-1 gap-4">
              {shown.meals.map(meal => (
                <div
                  key={meal.slot + ':' + meal.recipeId}
                  className={`p-5 rounded-2xl border bg-white dark:bg-slate-850 shadow-2xs space-y-3 ${draftDay ? 'border-amber-200 dark:border-amber-900' : 'border-slate-200/80 dark:border-slate-800'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-24 sm:w-28 shrink-0 rounded-xl overflow-hidden">
                      <RecipeImage src={meal.imageUrl} title={meal.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold">Bữa {meal.slot + 1}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                          {meal.portions} khẩu phần
                        </span>
                      </div>
                      <Link to={`/recipe/${meal.recipeId}`} className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 hover:text-emerald-700 dark:hover:text-emerald-400">
                        {meal.title}
                      </Link>
                      <p className="mt-1 text-xs">
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{Math.round(meal.nutrition.calories)} kcal</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}· Đạm {Math.round(meal.nutrition.protein)}g · Carb {Math.round(meal.nutrition.carbs)}g · Béo {Math.round(meal.nutrition.fat)}g
                        </span>
                      </p>
                    </div>
                  </div>

                  <PlannedMealDetails meal={meal} />

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {draftDay ? (
                      <button
                        type="button"
                        onClick={() => { setSwapping(meal.slot); setReplacement(''); setError(''); }}
                        disabled={busy || options.busy || !!options.error}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Đổi món</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/ai-chef?prompt=' + encodeURIComponent(`Hãy gợi ý cho tôi 2 món chay thay thế cho món "${meal.title}" (${Math.round(meal.nutrition.calories)} kcal).`))}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Đổi món với AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddToShoppingList(meal.title)}
                      className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 transition cursor-pointer"
                      title="Thêm nguyên liệu vào danh sách đi chợ"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <CommunityConfirm
        open={swapping !== null}
        title="Đổi món trong bản nháp"
        busy={busy}
        disabled={!replacement}
        onCancel={() => { setSwapping(null); setError(''); }}
        onConfirm={swap}
      >
        <label className="cm-field">
          Chọn công thức
          <select aria-label="Món thay thế" value={replacement} onChange={event => setReplacement(event.target.value)}>
            <option value="">Chọn món phù hợp</option>
            {options.data
              ?.filter(recipe => recipe.recipeId !== draftDay?.meals[swapping ?? 0]?.recipeId)
              .map(recipe => (
                <option key={recipe.recipeId} value={recipe.recipeId}>
                  {recipe.title} · {recipe.calories} kcal/khẩu phần
                </option>
              ))}
          </select>
        </label>
        {options.data && options.data.length < 2 && <p>Chưa có món thay thế phù hợp.</p>}
        {error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      </CommunityConfirm>
    </div>
  );
}
