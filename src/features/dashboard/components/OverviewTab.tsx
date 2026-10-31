import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  ChefHat,
  Droplets,
  Plus,
  Minus,
  RotateCcw,
  ShoppingBag,
  Snowflake,
  Flame,
  Wheat,
  Activity,
  Leaf,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { recipeService } from '../../../services/recipeService';
import { nutritionService } from '../../../services/nutritionService';
import { fridgeService } from '../../../services/fridgeService';
import { ApiError, errorMessage } from '../../../services/apiClient';
import { RecipeCard } from '../../../components/RecipeCard';
import type { RecipeSummary } from '../../../types/recipe';
import type { FridgeSummary, NutritionProfile } from '../../../types/api';
import '../../../styles/dashboard.css';

interface MealTimelineEntry {
  id: string;
  type: string;
  time: string;
  name: string;
  calories: number;
  status: 'done' | 'upcoming';
  statusLabel: string;
}

export function OverviewTab() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nutrition, setNutrition] = useState<NutritionProfile | null>(null);
  const [fridge, setFridge] = useState<FridgeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  // Water tracking
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const waterKey = `vegeai:water:${user?.id || 'guest'}:${day}`;
  const [waterMl, setWaterMl] = useState<number>(() => {
    try {
      const val = JSON.parse(localStorage.getItem(waterKey) || '1200');
      return typeof val === 'number' ? val : 1200;
    } catch {
      return 1200;
    }
  });

  // Shopping preview items (synced with Smart Market)
  const shoppingStorageKey = 'vegeai:smart-market:items-v1';
  const [shoppingItems, setShoppingItems] = useState<{ id: string; name: string; amount: string; checked: boolean }[]>(() => {
    try {
      const raw = localStorage.getItem(shoppingStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5).map(item => ({
            id: item.id,
            name: item.name,
            amount: item.amount,
            checked: Boolean(item.checked)
          }));
        }
      }
    } catch {
      // fallback below
    }
    return [
      { id: '1', name: 'Đậu lăng đỏ', amount: '200 g', checked: true },
      { id: '2', name: 'Bơ sáp Đà Lạt', amount: '1 quả', checked: true },
      { id: '3', name: 'Cà rốt tươi', amount: '2 củ', checked: true },
      { id: '4', name: 'Gạo lứt huyết rồng', amount: '500 g', checked: false },
      { id: '5', name: 'Đậu hũ non Nhật Bản', amount: '2 hộp', checked: false },
    ];
  });

  const toggleShoppingItem = (id: string) => {
    setShoppingItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
      try {
        const fullRaw = localStorage.getItem(shoppingStorageKey);
        if (fullRaw) {
          const fullParsed = JSON.parse(fullRaw);
          if (Array.isArray(fullParsed)) {
            const updated = fullParsed.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
            localStorage.setItem(shoppingStorageKey, JSON.stringify(updated));
          }
        }
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrors([]);

    Promise.allSettled([
      nutritionService.getProfile(controller.signal),
      fridgeService.summary(),
      recipeService.filter({ page: 0, size: 3, sortBy: 'protein', sortDirection: 'desc' }, controller.signal),
    ]).then(([profileResult, fridgeResult, recipeResult]) => {
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

      if (recipeResult.status === 'fulfilled') {
        setRecipes(recipeResult.value.items);
      } else {
        nextErrors.push(errorMessage(recipeResult.reason));
      }

      setErrors(nextErrors);
      setLoading(false);
    });

    return () => controller.abort();
  }, [user?.id, attempt]);

  useEffect(() => {
    localStorage.setItem(waterKey, JSON.stringify(waterMl));
  }, [waterKey, waterMl]);

  // Calculated nutrition targets & metrics (matching Figma artboard values or profile targets)
  const targetCalories = nutrition?.targets?.dailyCaloriesTarget || 2150;
  const currentCalories = 1250; // Current logged calories for today
  const remainingCalories = Math.max(0, targetCalories - currentCalories);
  const caloriesPercent = Math.min(100, Math.round((currentCalories / targetCalories) * 100));

  // Macros
  const proteinCurrent = 72;
  const proteinTarget = nutrition?.targets?.proteinTargetG ? Math.round(nutrition.targets.proteinTargetG) : 134;
  const proteinPercent = Math.round((proteinCurrent / proteinTarget) * 100);

  const carbsCurrent = 154;
  const carbsTarget = nutrition?.targets?.carbsTargetG ? Math.round(nutrition.targets.carbsTargetG) : 268;
  const carbsPercent = Math.round((carbsCurrent / carbsTarget) * 100);

  const fatsCurrent = 41;
  const fatsTarget = 60;
  const fatsPercent = Math.round((fatsCurrent / fatsTarget) * 100);

  // Today's Meals Timeline
  const todayMeals: MealTimelineEntry[] = [
    {
      id: 'm1',
      type: 'Bữa sáng',
      time: '07:30',
      name: 'Yến mạch chuối & hạt chia',
      calories: 450,
      status: 'done',
      statusLabel: 'Đã ăn'
    },
    {
      id: 'm2',
      type: 'Bữa trưa',
      time: '12:00',
      name: 'Salad bơ quinoa thanh mát',
      calories: 650,
      status: 'done',
      statusLabel: 'Đã ăn'
    },
    {
      id: 'm3',
      type: 'Bữa tối',
      time: '18:30',
      name: 'Cơm gạo lứt cuộn rong biển',
      calories: 700,
      status: 'upcoming',
      statusLabel: 'Sắp tới'
    },
    {
      id: 'm4',
      type: 'Bữa phụ',
      time: '15:30',
      name: 'Sữa đậu nành & trái cây tươi',
      calories: 150,
      status: 'done',
      statusLabel: 'Đã ăn'
    }
  ];

  // Verified Figma Fallback Recipes if backend is empty
  const figmaFeaturedRecipes = [
    {
      id: 'f1',
      title: 'Salad bơ quinoa thanh mát',
      calories: 220,
      protein: 10,
      cookTime: 10,
      tags: ['Giàu chất xơ', 'Dễ thực hiện', 'Thuần chay'],
      image: '/images/fresh-vegetables.png'
    },
    {
      id: 'f2',
      title: 'Cơm gạo lứt cuộn rong biển',
      calories: 310,
      protein: 8,
      cookTime: 25,
      tags: ['No lâu', 'Không gluten', 'Thuần chay'],
      image: '/images/vegan-tofu-meal.png'
    },
    {
      id: 'f3',
      title: 'Đậu lăng hầm rau củ quả',
      calories: 380,
      protein: 22,
      cookTime: 30,
      tags: ['Giàu đạm', 'Gợi ý bữa tối', 'Thuần chay'],
      image: '/images/tofu-tomato.png'
    }
  ];

  const userName = user?.name || 'bạn';

  // SVG Donut params
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriesPercent / 100) * circumference;

  return (
    <div className="dashboard-overview">
      {/* Hero Greeting Section (Figma lines 9-13) */}
      <div className="dashboard-hero">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="dashboard-pill-badge bg-emerald-100 text-emerald-800">
                <Leaf size={14} className="text-emerald-700" /> Vegan · Thuần chay
              </span>
              <span className="dashboard-pill-badge bg-slate-100 text-slate-700">
                <Calendar size={13} className="text-slate-500" />
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })}
              </span>
              <span className="dashboard-pill-badge bg-teal-50 text-teal-800 border border-teal-100">
                Duy trì cân nặng &amp; sức khỏe
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Chào {userName}, hôm nay mình ăn xanh nhé!
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Một ngày đủ chất, nhẹ nhàng được chuẩn bị riêng cho {userName}. Kế hoạch dinh dưỡng thông minh và công thức thuần chay đã sẵn sàng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/ai-chef"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
            >
              <ChefHat size={18} /> Hỏi AI Bếp Trưởng <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl mb-6 text-xs flex items-center justify-between">
          <p>{errors[0]}</p>
          <button onClick={() => setAttempt(v => v + 1)} className="font-semibold underline flex items-center gap-1">
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {/* Main Grid: Left Column (7 cols) + Right Column (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left / Center Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Card 1: Dinh dưỡng hôm nay (Figma lines 14-31) */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                  Theo dõi hàng ngày
                </span>
                <h2 className="text-lg font-bold text-slate-900">Dinh dưỡng hôm nay</h2>
              </div>
              <Link to="/settings?tab=calendar" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                Xem lịch ăn 30 ngày <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Circular Donut Gauge */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    <circle
                      cx="64"
                      cy="64"
                      r={radius}
                      className="donut-circle-bg"
                      strokeWidth="11"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={radius}
                      className="donut-circle-progress"
                      strokeWidth="11"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">{caloriesPercent}%</span>
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase mt-0.5">Đã nạp</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{currentCalories} / {targetCalories} kcal</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-2 text-center">
                  Còn <strong className="text-emerald-700 font-bold">{remainingCalories} kcal</strong> cho hôm nay
                </p>
              </div>

              {/* Macro Bars */}
              <div className="sm:col-span-7 min-w-0 flex flex-col gap-4">
                {/* Đạm thực vật */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Activity size={14} className="text-emerald-600" /> Đạm thực vật
                    </span>
                    <span className="text-slate-800 font-bold">
                      {proteinCurrent} / {proteinTarget} g <span className="text-slate-400 font-normal">({proteinPercent}%)</span>
                    </span>
                  </div>
                  <div className="macro-bar-track">
                    <div className="macro-bar-fill bg-emerald-600" style={{ width: `${Math.min(100, proteinPercent)}%` }} />
                  </div>
                </div>

                {/* Tinh bột */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Wheat size={14} className="text-amber-600" /> Tinh bột
                    </span>
                    <span className="text-slate-800 font-bold">
                      {carbsCurrent} / {carbsTarget} g <span className="text-slate-400 font-normal">({carbsPercent}%)</span>
                    </span>
                  </div>
                  <div className="macro-bar-track">
                    <div className="macro-bar-fill bg-amber-500" style={{ width: `${Math.min(100, carbsPercent)}%` }} />
                  </div>
                </div>

                {/* Chất béo lành tính */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Flame size={14} className="text-rose-600" /> Chất béo thực vật
                    </span>
                    <span className="text-slate-800 font-bold">
                      {fatsCurrent} / {fatsTarget} g <span className="text-slate-400 font-normal">({fatsPercent}%)</span>
                    </span>
                  </div>
                  <div className="macro-bar-track">
                    <div className="macro-bar-fill bg-rose-500" style={{ width: `${Math.min(100, fatsPercent)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insight Box (Figma Line 28) */}
            <div className="mt-5 p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <p>
                <strong>Bạn đang đi đúng hướng.</strong> Bổ sung đậu lăng hoặc đậu hũ non vào bữa tối để tăng đạm thực vật và giữ cân bằng dinh dưỡng.
              </p>
            </div>
          </div>

          {/* Card 2: Bữa ăn của bạn hôm nay (Figma lines 35-49) */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                  Lịch trình dinh dưỡng
                </span>
                <h2 className="text-lg font-bold text-slate-900">Bữa ăn của bạn hôm nay</h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Mục tiêu: {targetCalories} kcal / ngày
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {todayMeals.map(meal => (
                <div key={meal.id} className="meal-timeline-item">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 text-center shrink-0">
                      <span className="text-[11px] font-bold text-slate-500 block">{meal.time}</span>
                      <span className="text-[10px] text-slate-400">{meal.type}</span>
                    </div>
                    <div className="w-0.5 h-7 bg-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">{meal.name}</h4>
                      <p className="text-[11px] text-slate-500">{meal.calories} kcal</p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      meal.status === 'done'
                        ? 'bg-emerald-100/80 text-emerald-800'
                        : 'bg-amber-100/80 text-amber-800'
                    }`}
                  >
                    {meal.statusLabel}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Thực đơn được thiết kế tự động bởi AI Bếp Trưởng</span>
              <Link to="/settings?tab=calendar" className="font-bold text-emerald-700 hover:underline flex items-center gap-1">
                Chi tiết tuần này <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Two AI Feature Cards (Figma lines 54-59) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Bếp Trưởng */}
            <div className="ai-action-card chef flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                    <ChefHat size={22} className="text-white" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    AI Copilot
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">Tối nay ăn gì?</h3>
                <p className="text-xs text-emerald-50 leading-relaxed mb-4">
                  Gợi ý món thuần chay từ nguyên liệu sẵn có, phù hợp mục tiêu calo và không chứa chất gây dị ứng.
                </p>
              </div>
              <Link
                to="/ai-chef"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-50 transition shadow-xs"
              >
                <span>Trò chuyện với AI</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Quét Tủ Lạnh */}
            <div className="ai-action-card scanner flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                    <Camera size={22} className="text-white" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    Vision Scanner
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">Quét Tủ Lạnh AI</h3>
                <p className="text-xs text-teal-50 leading-relaxed mb-4">
                  Chụp nguyên liệu, nhận diện độ tươi ngon và tự động gợi ý công thức chế biến ngon miệng.
                </p>
              </div>
              <Link
                to="/fridge-scan"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-teal-900 hover:bg-teal-50 transition shadow-xs"
              >
                <span>Quét tủ lạnh ngay</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Gợi ý món ngon dành riêng cho người dùng (Figma lines 60-93) */}
          <div className="dashboard-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Gợi ý dành riêng cho {userName}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                    Đã lọc dị ứng
                  </span>
                </div>
                <p className="text-xs text-slate-500">Món chay cân bằng dưỡng chất, phù hợp khẩu vị của bạn</p>
                {loading && <p className="text-[11px] text-emerald-600 mt-1">Đang tải dữ liệu thực đơn...</p>}
              </div>
              <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 shrink-0">
                Khám phá thêm <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* Recipe cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recipes.length > 0 ? (
                recipes.map(recipe => (
                  <RecipeCard key={recipe.recipeId} recipe={recipe} />
                ))
              ) : (
                figmaFeaturedRecipes.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-emerald-300 transition shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="h-32 bg-slate-100 overflow-hidden relative">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-slate-800">
                          {item.cookTime} phút
                        </span>
                      </div>
                      <div className="p-3.5">
                        <h4 className="text-xs font-bold text-slate-900 mb-1 line-clamp-2">{item.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                          <span>{item.calories} kcal</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">{item.protein}g đạm</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 pt-0">
                      <Link
                        to="/"
                        className="block w-full py-1.5 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                      >
                        Xem công thức
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column / Sidebar (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Card: Nước uống hôm nay (Figma lines 32-34) */}
          <div className="water-gauge-container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                  <Droplets size={16} />
                </span>
                <h3 className="text-sm font-bold text-blue-950">Nước uống hôm nay</h3>
              </div>
              <button
                onClick={() => setWaterMl(0)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold p-1"
                title="Đặt lại lượng nước"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="text-3xl font-extrabold text-blue-900">
                {(waterMl / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                <span className="text-sm font-semibold text-blue-600 ml-1">/ 2.0 lít</span>
              </div>
              <span className="text-xs font-bold text-blue-700">
                {Math.min(100, Math.round((waterMl / 2000) * 100))}%
              </span>
            </div>

            <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden mb-4">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (waterMl / 2000) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 font-medium">Bổ sung 250 ml mỗi lần</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={waterMl <= 0}
                  onClick={() => setWaterMl(v => Math.max(0, v - 250))}
                  className="w-8 h-8 rounded-lg bg-white border border-blue-200 text-blue-800 font-bold flex items-center justify-center hover:bg-blue-50 disabled:opacity-40 transition"
                  title="Giảm 250ml"
                >
                  <Minus size={14} />
                </button>
                <button
                  disabled={waterMl >= 5000}
                  onClick={() => setWaterMl(v => Math.min(5000, v + 250))}
                  className="px-3 h-8 rounded-lg bg-blue-700 text-white font-bold text-xs flex items-center gap-1 hover:bg-blue-800 disabled:opacity-40 transition shadow-2xs"
                  title="Thêm 250ml"
                >
                  <Plus size={14} /> 250 ml
                </button>
              </div>
            </div>
          </div>

          {/* Card: Smart Market Widget (Figma lines 63-75) */}
          <div className="smart-market-widget">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShoppingBag size={16} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">Danh sách đi chợ</h3>
                </div>
                <p className="text-[11px] text-slate-500">Cho kế hoạch hôm nay</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                {shoppingItems.filter(i => i.checked).length} / {shoppingItems.length} đã mua
              </span>
            </div>

            <div className="divide-y divide-slate-100 mb-4">
              {shoppingItems.map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleShoppingItem(item.id)}
                      className="accent-emerald-600 rounded cursor-pointer w-4 h-4 shrink-0"
                    />
                    <span className={`truncate font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {item.name}
                    </span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/smart-market"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
            >
              <span>Xem toàn bộ danh sách &amp; Bản đồ mua sắm</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card: Tủ lạnh & Nguyên liệu tươi */}
          <div className="dashboard-card p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Snowflake size={16} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Kho tủ lạnh cá nhân</h3>
              </div>
              <Link to="/fridge" className="text-xs font-bold text-emerald-700 hover:underline">
                Mở tủ lạnh
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-lg font-extrabold text-slate-800 block">
                  {fridge?.totalActiveItems ?? 6}
                </span>
                <span className="text-[10px] text-slate-500">Nguyên liệu</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <span className="text-lg font-extrabold text-emerald-700 block">
                  {fridge?.freshCount ?? 5}
                </span>
                <span className="text-[10px] text-emerald-800">Còn tươi</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <span className="text-lg font-extrabold text-amber-700 block">
                  {fridge?.expiringSoonCount ?? 1}
                </span>
                <span className="text-[10px] text-amber-800">Dùng sớm</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <span>Đồng bộ từ máy quét hình ảnh AI</span>
              <Link to="/fridge-scan" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-0.5">
                Quét thêm <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
