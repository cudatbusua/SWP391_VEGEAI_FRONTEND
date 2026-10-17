import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Check, ChefHat, ChevronDown, RefreshCw, Save, Sparkles } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { CommunityConfirm, CommunityGuard, VideoPlayer } from '../components/CommunityUi';
import { RecipeImage } from '../components/RecipeImage';
import { SavedMealPlans, planDate } from '../components/SavedMealPlans';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { useAuth } from '../hooks/useAuth';
import { mealPlanService } from '../services/mealPlanService';
import { nutritionService } from '../services/nutritionService';
import { ApiError, errorMessage } from '../services/apiClient';
import { dietLabels, displayAllergies } from '../utils/nutritionProfile';
import type { MealPlan, PlannedMeal } from '../types/mealPlan';
import '../styles/meal-plan.css';

function MealDetails({ meal }: { meal: PlannedMeal }) {
  const [open, setOpen] = useState(false);
  const factor = meal.portions / Math.max(1, meal.recipe.servings || 1);
  return <div className="planned-details"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Nguyên liệu & cách nấu<ChevronDown size={16} className={open ? 'is-open' : ''} /></button>
    {open && <div><ul>{meal.recipe.ingredients.map((item, index) => <li key={index}><span>{item.name}</span><strong>{item.amount == null ? '--' : Math.round(item.amount * factor * 10) / 10} {item.unit}</strong></li>)}</ul><ol>{meal.recipe.instructions.map((step, index) => <li key={index}>{step}</li>)}</ol>{meal.recipe.videos?.map(video => <div key={video.id} className="planned-video"><h4>{video.title}</h4><VideoPlayer video={video} /></div>)}<Link to={'/recipe/' + meal.recipeId}>Công thức gốc<ArrowUpRight size={14} /></Link></div>}
  </div>;
}
export function Planner({
  embedded = false,
  initialPeriod = 'WEEK',
}: {
  embedded?: boolean;
  initialPeriod?: 'WEEK' | 'MONTH';
}) {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localPlanId, setLocalPlanId] = useState<string>('');
  const id = routeId || localPlanId;
  const [period, setPeriod] = useState<'WEEK' | 'MONTH'>(initialPeriod);
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

  useEffect(() => {
    setPeriod(initialPeriod);
  }, [initialPeriod]);

  const profile = useCommunityQuery(
    'planner-profile:' + user?.id,
    signal =>
      nutritionService.getProfile(signal).catch(reason => {
        if (reason instanceof ApiError && reason.status === 404) return null;
        throw reason;
      })
  );
  const query = useCommunityQuery(
    'meal-plan:' + user?.id + ':' + id,
    signal => mealPlanService.get(id || '', signal),
    !!id
  );
  const options = useCommunityQuery(
    'plan-options:' + user?.id + ':' + id,
    signal => mealPlanService.options(id || '', signal),
    !!id && plan?.id === id && plan.status === 'DRAFT'
  );
  useEffect(() => {
    if (!embedded || routeId) {
      setPlan(null);
      setDay(0);
      setError('');
      setMessage('');
      setSwapping(null);
    }
  }, [routeId, embedded]);
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
      if (embedded) {
        setPlan(result);
        setLocalPlanId(result.id);
        setDay(0);
        setMessage(
          `AI Bếp Trưởng đã thiết lập thực đơn ${result.plan.period === 'WEEK' ? 'tuần (7 ngày)' : 'tháng (30 ngày)'} khớp với mục tiêu dinh dưỡng và nguyên liệu tủ lạnh của bạn.`
        );
      } else {
        navigate('/meal-plans/' + result.id);
      }
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
      setMessage('Đã lưu kế hoạch vào Dashboard.');
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
  const selected = plan?.plan.days[day];
  const targets = plan?.plan.targets;
  return (
    <div className={embedded ? 'meal-plan-embedded' : 'meal-plan-page'}>
      {!embedded && (
        <header className="meal-plan-heading">
          <div>
            <span>
              <ChefHat size={17} /> AI BẾP TRƯỞNG THÔNG MINH
            </span>
            <h1>Lập thực đơn Tuần / Tháng</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/ai-chef">
              Quay lại AI Bếp Trưởng Thông Minh
              <ArrowUpRight size={16} />
            </Link>
            <Link to="/dashboard">
              Dashboard
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
      )}
      <div className="meal-plan-layout">
        <aside className="meal-plan-sidebar">
          <form onSubmit={generate} className="plan-settings">
            <h2>
              <CalendarDays size={18} /> Thiết lập thực đơn AI
            </h2>
            <fieldset disabled={busy || profile.busy || !!profile.error || !profile.data}>
              <div className="plan-period" role="group" aria-label="Thời gian kế hoạch">
                {(['WEEK', 'MONTH'] as const).map(value => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {value === 'WEEK' ? 'Theo Tuần' : 'Theo Tháng'}
                  </button>
                ))}
              </div>
              <label>
                Ngày bắt đầu
                <input
                  type="date"
                  required
                  min={today}
                  value={startDate}
                  onChange={event => setStartDate(event.target.value)}
                />
              </label>
              <label>
                Số bữa mỗi ngày
                <select value={meals} onChange={event => setMeals(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map(value => (
                    <option key={value} value={value}>
                      {value} bữa
                    </option>
                  ))}
                </select>
              </label>
              <button className="plan-primary" type="submit">
                <Sparkles size={16} />
                {busy ? 'AI đang phân tích & lập thực đơn...' : `AI Lập thực đơn ${period === 'WEEK' ? 'Tuần' : 'Tháng'}`}
              </button>
            </fieldset>
          </form>
          <section className="plan-profile">
            <h2>Mục tiêu dinh dưỡng đang áp dụng</h2>
            {profile.busy && <p role="status">Đang tải hồ sơ...</p>}
            {profile.error && (
              <div role="alert">
                <p>{profile.error}</p>
                <button onClick={profile.refresh}>Tải lại</button>
              </div>
            )}
            {!profile.busy && !profile.error && !profile.data && (
              <div>
                <p>
                  Bạn chưa có mục tiêu dinh dưỡng. Hãy tính mục tiêu ở mục Dinh dưỡng hoặc Hồ sơ cá nhân để AI lập thực đơn chuẩn xác.
                </p>
                <Link to="/nutrition">
                  Tính mục tiêu dinh dưỡng
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
            {profile.data && (
              <>
                <strong>{profile.data.targets.dailyCaloriesTarget.toLocaleString('vi-VN')} kcal/ngày</strong>
                <p>
                  Đạm {profile.data.targets.proteinTargetG}g · Carb {profile.data.targets.carbsTargetG}g · Béo{' '}
                  {profile.data.targets.fatTargetG}g
                </p>
                <p>{dietLabels[profile.data.dietaryPreferences || ''] || 'Chế độ ăn chay lành mạnh'}</p>
                {displayAllergies(profile.data.allergies) && (
                  <p className="plan-avoid">Tránh dị ứng: {displayAllergies(profile.data.allergies)}</p>
                )}
              </>
            )}
            <Link to="/nutrition">
              Cập nhật mục tiêu dinh dưỡng
              <ArrowUpRight size={14} />
            </Link>
          </section>
          <SavedMealPlans
            revision={revision}
            onSelectPlan={
              embedded
                ? planId => {
                    setLocalPlanId(planId);
                    setDay(0);
                    setMessage('');
                  }
                : undefined
            }
          />
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
                Xem Dashboard
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
          {!id && !plan && (
            <div className="plan-empty">
              <img
                src="/images/vietnamese-vegan-table.png"
                alt="Bữa cơm chay với đậu phụ, rau củ và gỏi cuốn"
              />
              <h2>AI thiết lập thực đơn Tuần & Tháng từ mục tiêu dinh dưỡng và nguyên liệu tủ lạnh của bạn.</h2>
              <p className="text-sm text-gray-500 mt-1">
                Chọn chế độ Tuần hoặc Tháng ở cột bên trái và nhấn nút để AI Bếp Trưởng phân tích & lên lịch bữa ăn chi tiết.
              </p>
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
                {plan.status === 'DRAFT' && (
                  <button className="plan-primary" disabled={busy || !!options.error} onClick={save}>
                    <Save size={16} />
                    Lưu kế hoạch
                  </button>
                )}
              </header>
              {plan.plan.warnings.length > 0 && (
                <details className="plan-warnings" open>
                  <summary>Phân tích & Lưu ý từ AI ({plan.plan.warnings.length})</summary>
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
          <select
            aria-label="Món thay thế"
            value={replacement}
            onChange={event => setReplacement(event.target.value)}
          >
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
  );
}
export function MealPlansPage() {
  return (
    <MainLayout>
      <CommunityGuard>
        <Planner />
      </CommunityGuard>
    </MainLayout>
  );
}
