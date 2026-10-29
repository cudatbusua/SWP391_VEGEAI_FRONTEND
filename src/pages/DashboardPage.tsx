import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChefHat,
  Circle,
  Flame,
  Leaf,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Utensils,
  UserPlus
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { recipeService } from '../services/recipeService';
import { nutritionService } from '../services/nutritionService';
import { fridgeService } from '../services/fridgeService';
import { mealPlanService } from '../services/mealPlanService';
import { ApiError, errorMessage } from '../services/apiClient';
import { RecipeCard } from '../components/RecipeCard';
import { HealthActivityRings } from '../components/HealthActivityRings';
import { dietLabels, displayAllergies } from '../utils/nutritionProfile';
import { sfx } from '../utils/soundEffects';
import type { RecipeSummary } from '../types/recipe';
import type { FridgeItem, FridgeSummary, NutritionProfile } from '../types/api';
import type { MealPlan } from '../types/mealPlan';
import type { ChatSession } from './AiChatPage';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 11) {
    return {
      title: 'Chào buổi sáng',
      badge: 'Buổi sáng năng động',
      emoji: '☀️',
      question: 'Hôm nay bạn muốn khởi đầu ngày mới với món chay thanh nhẹ nào?',
      period: 'sáng'
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      title: 'Chào buổi trưa',
      badge: 'Bữa trưa an lành',
      emoji: '🌤️',
      question: 'Đã đến giờ nạp năng lượng! Bạn cần gợi ý bữa trưa cân bằng đạm thực vật chứ?',
      period: 'trưa'
    };
  }
  if (hour >= 14 && hour < 18) {
    return {
      title: 'Chào buổi chiều',
      badge: 'Buổi chiều tươi tỉnh',
      emoji: '⛅',
      question: 'Bữa phụ nhẹ nhàng hay chuẩn bị nguyên liệu cho bữa tối ấm cúng hôm nay?',
      period: 'chiều'
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      title: 'Chào buổi tối',
      badge: 'Buổi tối ấm cúng',
      emoji: '🌙',
      question: 'Bữa tối thanh đạm giúp ngủ ngon và tái tạo năng lượng cho ngày mai.',
      period: 'tối'
    };
  }
  return {
    title: 'Chào đêm muộn',
    badge: 'Đêm thanh tịnh',
    emoji: '🌌',
    question: 'Hãy thư giãn cơ thể và chuẩn bị cho một giấc ngủ thật an lành.',
    period: 'đêm'
  };
}

export const DashboardPage: React.FC = () => {
  const { user, isLoading, isAuthenticated, sessionError } = useAuth();
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nutrition, setNutrition] = useState<NutritionProfile | null>(null);
  const [fridge, setFridge] = useState<FridgeSummary | null>(null);
  const [expiringItems, setExpiringItems] = useState<FridgeItem[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  // Pill Chat input prompt state
  const [capsulePrompt, setCapsulePrompt] = useState('');

  // Guest Quick BMI / Target Calorie calculator state
  const [guestHeight, setGuestHeight] = useState('165');
  const [guestWeight, setGuestWeight] = useState('56');
  const [guestGender, setGuestGender] = useState<'FEMALE' | 'MALE'>('FEMALE');
  const [guestBmiResult, setGuestBmiResult] = useState<{
    bmi: number;
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(() => {
    const hM = 165 / 100;
    const bmiVal = Math.round((56 / (hM * hM)) * 10) / 10;
    const bmr = 447.593 + (9.247 * 56) + (3.098 * 165) - (4.330 * 25);
    const tdee = Math.round(bmr * 1.4);
    return {
      bmi: bmiVal,
      category: 'Cân đối lý tưởng',
      calories: tdee,
      protein: Math.round((tdee * 0.18) / 4),
      carbs: Math.round((tdee * 0.55) / 4),
      fat: Math.round((tdee * 0.27) / 9),
    };
  });

  const handleRecalculateGuestBmi = () => {
    sfx.playTap();
    const h = parseFloat(guestHeight);
    const w = parseFloat(guestWeight);
    if (!h || !w || h <= 0 || w <= 0) return;
    const hM = h / 100;
    const bmiVal = Math.round((w / (hM * hM)) * 10) / 10;
    let cat = 'Bình thường';
    if (bmiVal < 18.5) cat = 'Nhẹ cân';
    else if (bmiVal < 24.9) cat = 'Cân đối lý tưởng';
    else if (bmiVal < 29.9) cat = 'Tiền béo phì';
    else cat = 'Béo phì';

    const bmr = guestGender === 'MALE'
      ? 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * 25)
      : 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * 25);
    const tdee = Math.round(bmr * 1.4);
    setGuestBmiResult({
      bmi: bmiVal,
      category: cat,
      calories: tdee,
      protein: Math.round((tdee * 0.18) / 4),
      carbs: Math.round((tdee * 0.55) / 4),
      fat: Math.round((tdee * 0.27) / 9),
    });
  };

  // Quick Shopping List state (synced with Smart Market)
  const shoppingStorageKey = 'vegeai:smart-market:items-v1';
  const [shoppingItems, setShoppingItems] = useState<
    { id: string; name: string; amount: string; checked: boolean }[]
  >(() => {
    try {
      const raw = localStorage.getItem(shoppingStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5).map(item => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            checked: Boolean(item.checked),
          }));
        }
      }
    } catch {
      // ignore
    }
    return [
      { id: '1', name: 'Đậu hũ non hữu cơ', amount: '2 hộp', checked: false },
      { id: '2', name: 'Nấm đùi gà tươi', amount: '300 g', checked: false },
      { id: '3', name: 'Bơ sáp Đà Lạt', amount: '2 quả', checked: true },
    ];
  });

  const toggleShoppingItem = (id: string) => {
    sfx.playTap();
    setShoppingItems(prev => {
      const next = prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item));
      try {
        const fullRaw = localStorage.getItem(shoppingStorageKey);
        if (fullRaw) {
          const fullParsed = JSON.parse(fullRaw);
          if (Array.isArray(fullParsed)) {
            const updated = fullParsed.map(item =>
              item.id === id ? { ...item, checked: !item.checked } : item
            );
            localStorage.setItem(shoppingStorageKey, JSON.stringify(updated));
          }
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Recent AI Chef sessions
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`vegeai:ai-chef:sessions:${user?.id || 'guest'}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSessions(parsed.slice(0, 3));
        }
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  // Fetch PostgreSQL data (member) or public recipes (guest)
  useEffect(() => {
    const controller = new AbortController();
    setLoadingData(true);
    setErrors([]);

    if (isAuthenticated) {
      Promise.allSettled([
        nutritionService.getProfile(controller.signal),
        fridgeService.summary(),
        fridgeService.expiringSoon(4),
        mealPlanService.list(0, controller.signal),
        recipeService.filter({ page: 0, size: 3, sortBy: 'protein', sortDirection: 'desc' }, controller.signal),
      ]).then(async ([profileResult, fridgeResult, expiringResult, plansResult, recipeResult]) => {
        if (controller.signal.aborted) return;
        const nextErrors: string[] = [];

        if (profileResult.status === 'fulfilled') {
          setNutrition(profileResult.value);
        } else if (!(profileResult.reason instanceof ApiError && profileResult.reason.status === 404)) {
          nextErrors.push(errorMessage(profileResult.reason));
        }

        if (fridgeResult.status === 'fulfilled') {
          setFridge(fridgeResult.value);
        } else {
          nextErrors.push(errorMessage(fridgeResult.reason));
        }

        if (expiringResult.status === 'fulfilled') {
          setExpiringItems(expiringResult.value);
        }

        if (recipeResult.status === 'fulfilled') {
          setRecipes(recipeResult.value.items);
        } else {
          nextErrors.push(errorMessage(recipeResult.reason));
        }

        // If user has saved meal plans, load the latest one
        if (plansResult.status === 'fulfilled' && plansResult.value.items.length > 0) {
          try {
            const latestPlanSummary = plansResult.value.items[0];
            const fullPlan = await mealPlanService.get(latestPlanSummary.id, controller.signal);
            if (!controller.signal.aborted) {
              setActivePlan(fullPlan);
            }
          } catch {
            // ignore plan load error
          }
        }

        setErrors(nextErrors);
        setLoadingData(false);
      });
    } else {
      // Guest mode: fetch nutritious recipes
      recipeService
        .filter({ page: 0, size: 3, sortBy: 'protein', sortDirection: 'desc' }, controller.signal)
        .then(res => {
          if (!controller.signal.aborted) {
            setRecipes(res.items);
          }
        })
        .catch(err => {
          if (!controller.signal.aborted) {
            setErrors([errorMessage(err)]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingData(false);
          }
        });
    }

    return () => controller.abort();
  }, [isAuthenticated, user?.id, attempt]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p role="status" className="text-sm font-medium text-stone-500 dark:text-slate-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            Đang tải trung tâm ẩm thực VEGEAI...
          </p>
        </div>
      </MainLayout>
    );
  }

  if (sessionError && !isAuthenticated && !user) {
    // If explicit session error, show reload option but keep guest layout available
  }

  const timeGreeting = getTimeGreeting();

  const dietLabel = nutrition?.dietaryPreferences
    ? dietLabels[nutrition.dietaryPreferences] || nutrition.dietaryPreferences
    : 'Ăn chay lành mạnh';
  const allergyText = displayAllergies(nutrition?.allergies);

  // Today's meal from active meal plan
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayPlanDay = activePlan?.plan.days.find(d => d.date === todayStr) || activePlan?.plan.days[0];
  const nextMeal = todayPlanDay?.meals[0];

  const uncheckedShoppingCount = shoppingItems.filter(i => !i.checked).length;
  const isPantryEmpty = (fridge?.totalActiveItems ?? 0) === 0;

  return (
    <MainLayout>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* Sync notification if API failed */}
        {errors.length > 0 && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200"
          >
            <span>Dữ liệu đồng bộ: {errors.join(' · ')}</span>
            <button
              onClick={() => setAttempt(v => v + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 text-white font-bold text-xs cursor-pointer shrink-0 hover:bg-amber-800 transition"
            >
              <RefreshCw size={13} /> Thử lại
            </button>
          </div>
        )}

        {/* 1. HERO SECTION: Welcoming & Editorial Introduction with Elongated AI Chat Capsule */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#f8f6f0] via-[#fbfaf7] to-[#f4f1ea] dark:from-[#111923] dark:via-[#131d28] dark:to-[#0f1720] border border-stone-200/70 dark:border-slate-800/80 p-7 sm:p-9 shadow-xs">
          {/* Subtle botanical accent */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 opacity-5 dark:opacity-10 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full text-emerald-800 fill-current">
              <path d="M45,-60C58,-50,68,-36,73,-20C78,-4,78,14,71,30C64,46,50,60,33,68C16,76,-3,78,-21,74C-39,70,-56,60,-66,45C-76,30,-79,10,-74,-8C-69,-26,-56,-42,-41,-52C-26,-62,-13,-66,3,-70C19,-74,38,-78,45,-60Z" transform="translate(100 100)" />
            </svg>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  {new Date().toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-stone-300 dark:text-slate-700">·</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-stone-200/80 dark:border-emerald-800/60 shadow-2xs">
                  <Leaf className="w-3 h-3 text-emerald-600" /> {dietLabel}
                </span>
                {allergyText && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50/90 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 shadow-2xs">
                    Tránh dị ứng: {allergyText}
                  </span>
                )}
                {!isAuthenticated && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700 shadow-2xs">
                    ✨ Trải nghiệm khách vãng lai
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 dark:text-white">
                {timeGreeting.title}, {user?.name || (isAuthenticated ? 'Bạn' : 'Khách quý')}! {timeGreeting.emoji} <br className="hidden sm:inline" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold block sm:inline mt-1 sm:mt-0">
                  {timeGreeting.question}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Theo dõi thực đơn dinh dưỡng trong ngày, cập nhật rau củ trong tủ lạnh và khám phá công thức chay thuần khiết được thiết kế riêng cho mục tiêu sức khỏe của bạn.
              </p>
            </div>

            {/* Prominent Elongated AI Chat Capsule ("Viên thuốc ngang dài") */}
            <div className="pt-1 max-w-3xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!capsulePrompt.trim()) return;
                  sfx.playTap();
                  navigate(`/ai-chef?prompt=${encodeURIComponent(capsulePrompt.trim())}`);
                }}
                className="flex items-center gap-2 p-1.5 sm:p-2 rounded-full bg-white dark:bg-[#16222f] border-2 border-emerald-600/40 dark:border-emerald-500/40 hover:border-emerald-600 dark:hover:border-emerald-400 shadow-sm hover:shadow-md transition-all focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-600"
              >
                {/* Action 1: Camera (Fridge Scanner) */}
                <Link
                  to="/fridge-scan"
                  title="Quét tủ lạnh AI bằng camera hoặc ảnh chụp"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition shrink-0 border border-emerald-200/80 dark:border-emerald-800/80"
                >
                  <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Quét tủ lạnh AI</span>
                </Link>

                {/* Action 2: Calendar (Weekly Meal Planner) */}
                <Link
                  to="/settings?tab=calendar"
                  title="Quản lý thực đơn theo tuần"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold transition shrink-0 border border-stone-200/80 dark:border-slate-700"
                >
                  <CalendarDays className="w-4 h-4 text-stone-600 dark:text-slate-400" />
                  <span className="hidden md:inline">Lịch ăn 30 ngày</span>
                </Link>

                {/* Text Input Pill body */}
                <input
                  type="text"
                  value={capsulePrompt}
                  onChange={(e) => setCapsulePrompt(e.target.value)}
                  placeholder="Hãy bắt đầu nhắn tin tại đây... (VD: Nấu món gì với nấm và đậu hũ?)"
                  className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-hidden"
                />

                {/* Submit / Ask AI Button */}
                <button
                  type="submit"
                  title="Bắt đầu trò chuyện với AI Bếp Trưởng"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition shrink-0 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hỏi AI</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Missing biometrics guide banner for members */}
        {isAuthenticated && (!nutrition || !nutrition.heightCm || !nutrition.weightKg) && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                  Chào mừng bạn! Hãy hoàn thiện thông tin thể trạng & dinh dưỡng
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Cập nhật chiều cao và cân nặng để VEGEAI tự động kích hoạt tính toán BMI chuẩn y tế, BMR và cá nhân hóa thực đơn dành riêng cho bạn.
                </p>
              </div>
            </div>
            <Link
              to="/settings?tab=profile"
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shrink-0 text-center shadow-xs cursor-pointer"
            >
              Cập nhật hồ sơ ngay →
            </Link>
          </div>
        )}

        {/* 2. PRIMARY FOCUS: TODAY'S MEAL & SECONDARY NUTRITION */}
        <section className="grid lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Block: Today's Next Meaningful Meal (Span 7) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl bg-white dark:bg-[#121a24] border border-stone-200/70 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                      {isAuthenticated && nextMeal ? "Bữa ăn tiếp theo hôm nay" : !isAuthenticated ? "Gợi ý món chay hôm nay" : "Thực đơn dinh dưỡng hôm nay"}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {isAuthenticated && nextMeal ? "Theo kế hoạch ăn uống đã lên của bạn" : !isAuthenticated ? "Món chay thanh đạm, giàu vi chất tự nhiên dành cho bạn" : "Tối ưu theo mục tiêu sức khỏe và chỉ số cơ thể"}
                    </p>
                  </div>
                </div>
                <Link
                  to={isAuthenticated ? "/settings?tab=calendar" : "/explore"}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  {isAuthenticated ? "Xem cả tuần" : "Khám phá thêm"} <ArrowRight size={13} />
                </Link>
              </div>

              {nextMeal ? (
                /* Meal exists for today */
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-stone-50/70 dark:bg-[#16222f]/80 border border-stone-200/60 dark:border-slate-700/60">
                  <div className="w-full sm:w-36 h-36 rounded-2xl overflow-hidden bg-stone-100 dark:bg-slate-800 shrink-0 shadow-xs">
                    <img
                      src={nextMeal.imageUrl || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80'}
                      alt={nextMeal.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Bữa {nextMeal.slot + 1} · {nextMeal.portions} khẩu phần
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white truncate">
                      {nextMeal.title}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-stone-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1 font-bold text-stone-800 dark:text-slate-200">
                        <Flame className="w-3.5 h-3.5 text-amber-500" /> {nextMeal.nutrition.calories} kcal
                      </span>
                      <span>·</span>
                      <span>Đạm {nextMeal.nutrition.protein}g</span>
                      <span>·</span>
                      <span>Carb {nextMeal.nutrition.carbs}g</span>
                      <span>·</span>
                      <span>Béo {nextMeal.nutrition.fat}g</span>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <Link
                        to={'/recipe/' + nextMeal.recipeId}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                      >
                        Xem hướng dẫn nấu
                      </Link>
                      <Link
                        to="/settings?tab=calendar"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a2938] hover:bg-stone-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 text-xs font-bold transition"
                      >
                        Đổi món khác
                      </Link>
                    </div>
                  </div>
                </div>
              ) : !isAuthenticated ? (
                /* Guest preview meal */
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-stone-50/70 dark:bg-[#16222f]/80 border border-stone-200/60 dark:border-slate-700/60">
                  <div className="w-full sm:w-36 h-36 rounded-2xl overflow-hidden bg-stone-100 dark:bg-slate-800 shrink-0 shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80"
                      alt="Cơm gạo lứt đậu hũ nấm sốt tiêu đen"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Gợi ý bữa trưa · 1 khẩu phần
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white truncate">
                      Cơm gạo lứt đậu hũ áp chảo sốt nấm hương
                    </h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-stone-600 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1 font-bold text-stone-800 dark:text-slate-200">
                        <Flame className="w-3.5 h-3.5 text-amber-500" /> 520 kcal
                      </span>
                      <span>·</span>
                      <span>Đạm 24g</span>
                      <span>·</span>
                      <span>Carb 68g</span>
                      <span>·</span>
                      <span>Béo 14g</span>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <Link
                        to="/explore"
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                      >
                        Khám phá công thức
                      </Link>
                      <Link
                        to="/register"
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a2938] hover:bg-stone-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 border border-stone-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <UserPlus size={13} /> Đăng ký để lưu thực đơn
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state: No meal plan for today */
                <div className="p-8 text-center rounded-2xl bg-linear-to-b from-stone-50 to-stone-100/50 dark:from-[#15202c] dark:to-[#121a24] border border-stone-200/60 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-2xs">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      Hôm nay bạn chưa có kế hoạch bữa ăn
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      AI Bếp Trưởng có thể giúp bạn lập ngay thực đơn cân bằng trên lịch ăn 30 ngày, đủ chất đạm thực vật và vi chất dựa trên chỉ số cơ thể.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/settings?tab=calendar"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <Sparkles size={14} /> Lập thực đơn AI trên lịch
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
              <span>Được tính toán tự động dựa trên chỉ số TDEE</span>
              <Link to="/settings?tab=calendar" className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                Tùy chỉnh lịch ăn uống →
              </Link>
            </div>
          </div>

          {/* Secondary Block: Nutrition Goals & BMI (Span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-white dark:bg-[#121a24] border border-stone-200/70 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100/70 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                      Mục tiêu Dinh dưỡng
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {isAuthenticated ? 'Chỉ số cơ thể & phân bổ năng lượng' : 'Tính nhanh chỉ số BMI & Nhu cầu Calo'}
                    </p>
                  </div>
                </div>
                <Link
                  to={isAuthenticated ? '/settings?tab=profile' : '/register'}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {isAuthenticated ? 'Chỉnh sửa' : 'Đăng ký ngay'}
                </Link>
              </div>

              {nutrition ? (
                /* Authenticated Profile exists: Apple Watch Concentric Activity Rings Snapshot */
                <div className="space-y-4">
                  <HealthActivityRings
                    calories={1420}
                    calorieTarget={Math.round(nutrition.targets.dailyCaloriesTarget)}
                    proteinGrams={56}
                    proteinTarget={Math.round(nutrition.targets.proteinTargetG)}
                    fiberGrams={28}
                    fiberTarget={35}
                    heightCm={nutrition.heightCm}
                    weightKg={nutrition.weightKg}
                    showDetails={true}
                    compact={true}
                    onEditClick={() => navigate('/settings?tab=profile')}
                  />
                </div>
              ) : !isAuthenticated ? (
                /* Interactive Guest BMI & TDEE Calculator */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#16222f]/80 border border-stone-200/60 dark:border-slate-700/60 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">Chiều cao (cm)</label>
                        <input
                          type="number"
                          value={guestHeight}
                          onChange={(e) => setGuestHeight(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#121a24] text-xs font-bold text-stone-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-300 mb-1">Cân nặng (kg)</label>
                        <input
                          type="number"
                          value={guestWeight}
                          onChange={(e) => setGuestWeight(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#121a24] text-xs font-bold text-stone-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGuestGender('FEMALE')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            guestGender === 'FEMALE' ? 'bg-emerald-700 text-white' : 'bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-300'
                          }`}
                        >
                          Nữ
                        </button>
                        <button
                          type="button"
                          onClick={() => setGuestGender('MALE')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            guestGender === 'MALE' ? 'bg-emerald-700 text-white' : 'bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-300'
                          }`}
                        >
                          Nam
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleRecalculateGuestBmi}
                        className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Tính ngay
                      </button>
                    </div>
                  </div>

                  {/* Calculated result preview */}
                  <div className="flex items-baseline justify-between p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                    <div>
                      <span className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                        {guestBmiResult.calories.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-slate-400 ml-1.5">
                        kcal / ngày
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-[#121a24] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        BMI: {guestBmiResult.bmi}
                      </span>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold mt-0.5">
                        {guestBmiResult.category}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Authenticated but empty profile */
                <div className="p-7 text-center rounded-2xl bg-stone-50 dark:bg-[#15202c] border border-stone-200/60 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Chưa thiết lập hồ sơ dinh dưỡng
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                      Khai báo chiều cao, cân nặng và chế độ ăn để tính nhu cầu năng lượng chuẩn xác.
                    </p>
                  </div>
                  <div className="pt-1">
                    <Link
                      to="/settings?tab=profile"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                    >
                      Khai báo chỉ số BMI & TDEE <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
              <span>{isAuthenticated && nutrition?.targets ? `BMR: ${Math.round(nutrition.targets.bmr)} kcal` : 'Tiêu chuẩn Harris-Benedict'}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Thuật toán dinh dưỡng xác định</span>
            </div>
          </div>
        </section>

        {/* 3. SUPPORTING ACTIONABLE SECTIONS: PANTRY & SHOPPING */}
        <section className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Block: Fridge Ingredients & Expiry Attention (Span 7) */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121a24] border border-stone-200/70 dark:border-slate-800/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100/70 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                  <Snowflake className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    Tủ lạnh: Nguyên liệu cần ưu tiên dùng
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {isAuthenticated ? `Tổng ${fridge?.totalActiveItems ?? 0} món · ${fridge?.freshCount ?? 0} đang tươi mới` : 'Hệ thống nhận diện rau củ qua thị giác AI'}
                  </p>
                </div>
              </div>
              <Link to="/fridge" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                Mở kho tủ lạnh →
              </Link>
            </div>

            {!isAuthenticated ? (
              /* Guest Fridge Preview */
              <div className="p-6 text-center rounded-2xl bg-stone-50/70 dark:bg-[#16222f]/70 border border-stone-200/50 dark:border-slate-700/50 space-y-3">
                <Snowflake className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-stone-800 dark:text-slate-200">
                  Thị giác máy tính: Quét tủ lạnh & Cảnh báo hạn dùng
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md mx-auto">
                  Chỉ cần chụp ảnh ngăn rau củ, AI sẽ tự động phân loại thực phẩm, ước tính khối lượng xấp xỉ và cảnh báo khi thực phẩm sắp hết hạn.
                </p>
                <div className="pt-1 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/fridge-scan"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Camera size={14} /> Trải nghiệm Quét thử AI
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-slate-700 text-xs font-bold transition"
                  >
                    <UserPlus size={14} /> Đăng ký để lưu kho
                  </Link>
                </div>
              </div>
            ) : isPantryEmpty ? (
              /* Empty state: No ingredients in fridge */
              <div className="p-6 text-center rounded-2xl bg-stone-50/70 dark:bg-[#16222f]/70 border border-stone-200/50 dark:border-slate-700/50 space-y-2">
                <Snowflake className="w-7 h-7 text-stone-400 mx-auto" />
                <h3 className="text-sm font-bold text-stone-800 dark:text-slate-200">
                  Tủ lạnh của bạn đang trống
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
                  Chụp ảnh ngăn tủ lạnh để AI tự động nhận diện rau củ và gợi ý món ăn ngay tức thì.
                </p>
                <div className="pt-1">
                  <Link
                    to="/fridge-scan"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Camera size={14} /> Chụp ảnh Quét tủ lạnh AI
                  </Link>
                </div>
              </div>
            ) : expiringItems.length > 0 ? (
              /* Expiring soon items */
              <div className="space-y-2.5">
                {expiringItems.map(item => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs transition hover:border-amber-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <strong className="block text-stone-900 dark:text-white truncate font-bold text-sm">
                          {item.name}
                        </strong>
                        <span className="text-amber-800 dark:text-amber-300 font-medium">
                          {item.quantity} {item.unit || 'phần'} · Hạn dùng: {item.expiryDate || 'Nên dùng sớm'}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/ai-chef?prompt=${encodeURIComponent(`Tôi có nguyên liệu ${item.name} sắp hết hạn, hãy gợi ý cho tôi 2 món chay ngon nhất để sử dụng ngay hôm nay.`)}`}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#16222f] text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 transition shrink-0 ml-2 shadow-2xs"
                    >
                      Nấu món này với AI
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              /* All items fresh */
              <div className="p-5 text-center rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Tất cả nguyên liệu trong tủ lạnh đều còn hạn tươi tốt!
                </p>
                <Link to="/fridge-scan" className="inline-block text-xs text-emerald-700 dark:text-emerald-400 font-semibold underline">
                  Quét thêm rau củ mới vào tủ
                </Link>
              </div>
            )}
          </div>

          {/* Right Block: Smart Shopping Checklist (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#121a24] border border-stone-200/70 dark:border-slate-800/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    Danh sách Đi chợ Thông minh
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Còn thiếu {uncheckedShoppingCount} món cần mua
                  </p>
                </div>
              </div>
              <Link to="/smart-market" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                Mở Bản đồ →
              </Link>
            </div>

            <div className="space-y-2">
              {shoppingItems.slice(0, 4).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleShoppingItem(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer text-xs ${
                    item.checked
                      ? 'bg-stone-50/50 dark:bg-[#16222f]/40 border-stone-200/50 dark:border-slate-800 text-stone-400 line-through'
                      : 'bg-white dark:bg-[#16222f] border-stone-200/80 dark:border-slate-700/70 text-stone-800 dark:text-slate-100 hover:border-emerald-500/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <span className="truncate font-semibold">{item.name}</span>
                  </span>
                  <span className="font-bold text-stone-400 dark:text-slate-400 ml-2 shrink-0">{item.amount}</span>
                </button>
              ))}
            </div>

            <Link
              to="/smart-market"
              className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition border border-emerald-200/50 dark:border-emerald-800/50"
            >
              <MapPin className="w-3.5 h-3.5" /> Tìm Quán chay & Chợ thực phẩm lân cận
            </Link>
          </div>
        </section>

        {/* 4. PROMINENT RECIPE DISCOVERY: High-quality food imagery */}
        <section className="space-y-6 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                <Sparkles className="w-4 h-4" /> Khám phá Hương vị Xanh
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                Món chay giàu dưỡng chất được chọn lọc cho bạn
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-1">
                Kết hợp giữa sở thích dinh dưỡng của bạn và nguồn cảm hứng ẩm thực thuần thực vật Việt Nam
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#121a24] hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition border border-stone-200/80 dark:border-slate-700/80 shadow-2xs"
            >
              Xem tất cả công thức <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-sm text-stone-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> Đang chọn lọc công thức món chay phù hợp...
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map(recipe => (
                <RecipeCard key={recipe.recipeId} recipe={recipe} />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center rounded-3xl bg-stone-50 dark:bg-[#121a24] text-sm text-stone-500 dark:text-slate-400 border border-stone-200/60 dark:border-slate-800">
              Đang làm mới kho công thức...
            </div>
          )}
        </section>

        {/* 5. SECONDARY: RECENT AI CONVERSATIONS & SAVED ACTIVITY */}
        {recentSessions.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-stone-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Tiếp tục phiên làm việc với AI Bếp Trưởng
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  Các câu hỏi tư vấn thực đơn và phân tích ảnh chụp tủ lạnh gần đây
                </p>
              </div>
              <Link to="/ai-chef" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                Xem tất cả hội thoại →
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {recentSessions.map(session => (
                <Link
                  key={session.id}
                  to="/ai-chef"
                  className="p-4 rounded-2xl bg-white dark:bg-[#121a24] border border-stone-200/70 dark:border-slate-800 hover:border-emerald-500/70 dark:hover:border-emerald-500/60 transition shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        session.category === 'fridge-scan'
                          ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
                      }`}
                    >
                      {session.category === 'fridge-scan' ? '🧊 Quét tủ lạnh' : '🧑‍🍳 AI Bếp trưởng'}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-2 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {session.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {session.messages[session.messages.length - 1]?.text || 'Bấm để tiếp tục trao đổi...'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Tiếp tục phiên <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
