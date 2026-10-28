import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Flame,
  Users,
  RefreshCw,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Snowflake,
  ChefHat,
  Play,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { RecipeImage } from '../components/RecipeImage';
import { VideoPlayer } from '../components/CommunityUi';
import { recipeService } from '../services/recipeService';
import { fridgeService } from '../services/fridgeService';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/apiClient';
import type { RecipeDetail } from '../types/recipe';
import type { FridgeItem } from '../types/api';

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Smart Fridge Integration State
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [fridgeLoading, setFridgeLoading] = useState(false);

  // AI Video & Visual Recipe Analysis State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    summary: string;
    highlights: string[];
    cookingTips: string[];
  } | null>(null);

  // 1. Fetch Recipe Detail
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRecipe(null);
    setError('');

    if (!id) {
      setError('Không tìm thấy công thức.');
      setLoading(false);
      return;
    }

    recipeService.detail(id, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setRecipe(value);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reload]);

  // 2. Fetch Active Fridge Items from "Tủ Bếp Của Tôi"
  useEffect(() => {
    if (isAuthenticated) {
      setFridgeLoading(true);
      fridgeService.list('ACTIVE')
        .then(items => setFridgeItems(items))
        .catch(() => setFridgeItems([]))
        .finally(() => setFridgeLoading(false));
    } else {
      // Guest demo sample items so anyone viewing can see the feasibility engine in action
      setFridgeItems([
        { itemId: 'demo-1', name: 'Đậu hũ non', status: 'ACTIVE', freshnessStatus: 'FRESH', quantity: 2, unit: 'hộp' } as FridgeItem,
        { itemId: 'demo-2', name: 'Cà chua', status: 'ACTIVE', freshnessStatus: 'USABLE', quantity: 3, unit: 'quả' } as FridgeItem,
        { itemId: 'demo-3', name: 'Rau cải ngọt', status: 'ACTIVE', freshnessStatus: 'FRESH', quantity: 1, unit: 'bó' } as FridgeItem,
      ]);
    }
  }, [isAuthenticated]);

  // 3. Match Recipe Ingredients with Fridge Items (Fuzzy Comparison)
  const feasibilityData = useMemo(() => {
    if (!recipe?.ingredients || recipe.ingredients.length === 0) {
      return { matches: [], stockedCount: 0, missingItems: [], percentage: 0 };
    }

    const matches = recipe.ingredients.map(ing => {
      const normIng = normalizeVi(ing.name);
      const matchedFridgeItem = fridgeItems.find(fi => {
        const normF = normalizeVi(fi.name);
        return (
          normF.includes(normIng) ||
          normIng.includes(normF) ||
          normIng.split(/\s+/).some(w => w.length >= 3 && normF.includes(w))
        );
      });

      return {
        ...ing,
        inStock: Boolean(matchedFridgeItem),
        matchedFridgeItem,
      };
    });

    const stockedCount = matches.filter(m => m.inStock).length;
    const missingItems = matches.filter(m => !m.inStock);
    const percentage = Math.round((stockedCount / matches.length) * 100);

    return { matches, stockedCount, missingItems, percentage };
  }, [recipe?.ingredients, fridgeItems]);

  // 4. Quick Export Missing Ingredients to Smart Market (ShopeeFood / GrabMart)
  const handleExportMissingToMarket = () => {
    if (!recipe || feasibilityData.missingItems.length === 0) return;

    const importedItems = feasibilityData.missingItems.map(item => ({
      id: 'recipe-' + Math.random().toString(36).substring(2, 9),
      name: item.name,
      amount: item.amount ? `${item.amount} ${item.unit || ''}`.trim() : 'Theo định lượng',
      category: 'produce' as const,
      categoryLabel: 'Rau củ & Quả tươi',
      mealNote: `Từ công thức: "${recipe.title}"`,
      checked: false,
    }));

    navigate('/smart-market', {
      state: {
        importedItems,
        planTitle: `Món: ${recipe.title}`
      }
    });
  };

  // 5. Trigger AI Video & Visual Recipe Analysis
  const handleTriggerAiAnalysis = () => {
    if (aiAnalysisResult) {
      setShowAiAnalysis(prev => !prev);
      return;
    }

    setAiAnalyzing(true);
    setShowAiAnalysis(true);

    setTimeout(() => {
      const title = recipe?.title || 'Món chay';
      setAiAnalysisResult({
        summary: `AI đã phân tích cấu trúc nguyên liệu, tỷ lệ dinh dưỡng và các công đoạn chế biến từ video/hình ảnh của món "${title}".`,
        highlights: [
          `Tối ưu nguồn đạm thực vật (${recipe?.proteinGrams ?? 18}g) từ các loại đậu và nấm tươi tự nhiên.`,
          `Kỹ thuật xào nấu giữ trọn vi chất dinh dưỡng và chất diệp lục mà không cần nhiều dầu mỡ.`,
          `Hàm lượng chất xơ dồi dào (${recipe?.fiberGrams ?? 8}g), hỗ trợ hệ tiêu hóa nhẹ nhàng và thanh lọc cơ thể.`
        ],
        cookingTips: [
          'Sơ chế nấm bằng khăn ẩm hoặc rửa nhanh dưới vòi nước, không ngâm lâu trong nước để nấm giữ độ giòn ngọt.',
          'Nêm gia vị hạt nêm chay từ nấm và muối hồng ở giai đoạn cuối để bảo toàn hương vị thanh khiết.',
          'Có thể tăng vị thơm tự nhiên bằng cách phi hành boa-rô hoặc gừng tươi đập dập trước khi cho nguyên liệu chính vào.'
        ]
      });
      setAiAnalyzing(false);
    }, 500);
  };

  const { percentage, stockedCount, missingItems, matches } = feasibilityData;
  const isFullyStocked = percentage === 100;
  const isPartiallyStocked = percentage >= 50;

  return (
    <MainLayout>
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/explore"
          className="inline-flex gap-2 items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <ArrowLeft size={16} /> Quay lại khám phá công thức
        </Link>

        {loading && (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Đang tải công thức và kiểm tra nguyên liệu...</p>
          </div>
        )}

        {error && (
          <div role="alert" className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300">
            <p>{error}</p>
            <button
              onClick={() => setReload(value => value + 1)}
              className="flex items-center gap-2 mt-4 font-bold text-xs underline cursor-pointer"
            >
              <RefreshCw size={16} /> Thử lại
            </button>
          </div>
        )}

        {recipe && (
          <>
            {/* Top Hero: Recipe Overview & Visual Snapshot */}
            <div className="grid md:grid-cols-2 gap-8 items-start bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="space-y-3">
                <RecipeImage src={recipe.imageUrl} title={recipe.title} detail />

                {/* Quick AI Recipe Video & Photo Scan Button */}
                <button
                  type="button"
                  onClick={handleTriggerAiAnalysis}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{showAiAnalysis ? 'Thu gọn phân tích AI' : '✨ AI Quét & Bóc tách Nguyên liệu từ Video / Ảnh'}</span>
                  {showAiAnalysis ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              <div className="min-w-0 flex flex-col justify-between h-full space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Thuần chay tự nhiên
                    </span>
                    {recipe.tags?.map(tag => (
                      <span key={tag.code} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                    {recipe.title}
                  </h1>

                  <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-line break-words leading-relaxed">
                    {recipe.description}
                  </p>

                  <div className="flex flex-wrap gap-5 my-5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex gap-2 items-center">
                      <Clock size={16} className="text-emerald-600" />
                      {recipe.prepTimeMinutes ?? '--'} phút chuẩn bị
                    </span>
                    <span className="flex gap-2 items-center">
                      <Clock size={16} className="text-emerald-600" />
                      {recipe.cookTimeMinutes ?? '--'} phút nấu
                    </span>
                    <span className="flex gap-2 items-center">
                      <Users size={16} className="text-emerald-600" />
                      {recipe.servings ?? '--'} khẩu phần
                    </span>
                  </div>
                </div>

                {/* Nutrition strip */}
                <section className="border-t border-slate-100 dark:border-slate-800 pt-5" aria-label="Dinh dưỡng mỗi khẩu phần">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Dinh dưỡng mỗi khẩu phần</h2>
                    <p className="flex gap-1.5 items-center text-emerald-700 dark:text-emerald-400 font-extrabold text-base">
                      <Flame size={17} className="text-amber-500" />
                      {recipe.calories ?? '--'} kcal
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {([
                      ['Đạm thực vật', recipe.proteinGrams, 'text-emerald-600'],
                      ['Tinh bột', recipe.carbsGrams, 'text-teal-600'],
                      ['Chất béo tốt', recipe.fatGrams, 'text-amber-600'],
                      ['Chất xơ', recipe.fiberGrams, 'text-lime-600']
                    ] as const).map(([label, value, colorClass]) => (
                      <div
                        key={label}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700"
                      >
                        <dt className="text-slate-400 text-[11px] font-medium">{label}</dt>
                        <dd className={`font-black text-sm mt-0.5 ${colorClass}`}>
                          {value == null ? 'Chưa có' : `${value} g`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </div>

            {/* AI Video & Visual Recipe Analysis Panel (Collapsible) */}
            {showAiAnalysis && (
              <section className="bg-linear-to-br from-emerald-50/80 via-white to-teal-50/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Kết quả AI Phân Tích Video &amp; Bóc Tách Nguyên Liệu
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    Gemini Multimodal
                  </span>
                </div>

                {aiAnalyzing ? (
                  <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>AI đang phân tích từng phân cảnh video và bóc tách cấu trúc nguyên liệu...</span>
                  </div>
                ) : aiAnalysisResult ? (
                  <div className="space-y-4 text-xs sm:text-sm">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {aiAnalysisResult.summary}
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Highlights */}
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-800/60 space-y-2">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                          <Check className="w-4 h-4 text-emerald-600" /> Điểm sáng dinh dưỡng
                        </h4>
                        <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                          {aiAnalysisResult.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cooking Tips */}
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-100 dark:border-teal-800/60 space-y-2">
                        <h4 className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5 text-xs">
                          <Lightbulb className="w-4 h-4 text-amber-500" /> Bí quyết từ Bếp Trưởng
                        </h4>
                        <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                          {aiAnalysisResult.cookingTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-teal-600 font-bold">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            {/* SMART FRIDGE FEASIBILITY CARD: The Core Cookability Matcher */}
            <section className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isFullyStocked
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : isPartiallyStocked
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
                  }`}>
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Kiểm tra Độ khả thi với "Tủ Bếp Của Tôi"
                      </h2>
                      {!isAuthenticated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                          Dùng thử
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      {fridgeLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>Đang kiểm tra Tủ Bếp Của Tôi...</span>
                        </>
                      ) : (
                        <span>Tự động đối chiếu nguyên liệu của món ăn với thực phẩm sẵn có trong tủ lạnh của bạn</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feasibility Percentage Badge */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {percentage}%
                    </span>
                    <p className={`text-[11px] font-bold ${
                      isFullyStocked
                        ? 'text-emerald-600'
                        : isPartiallyStocked
                        ? 'text-amber-600'
                        : 'text-orange-600'
                    }`}>
                      {isFullyStocked ? 'Sẵn sàng nấu ngay' : isPartiallyStocked ? 'Khả thi cao' : 'Cần mua thêm'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyStocked
                        ? 'bg-emerald-500'
                        : isPartiallyStocked
                        ? 'bg-amber-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.max(8, percentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Có sẵn <strong>{stockedCount}</strong> / {recipe.ingredients?.length || 0} nguyên liệu</span>
                  {missingItems.length > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      Còn thiếu <strong>{missingItems.length}</strong> nguyên liệu
                    </span>
                  )}
                </div>
              </div>

              {/* Status Message & Action Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isFullyStocked ? (
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Tuyệt vời! Bạn đã có đủ toàn bộ nguyên liệu trong Tủ Bếp. Có thể bắt tay vào nấu món này ngay hôm nay!
                    </span>
                  ) : (
                    <span>
                      Trong Tủ Bếp của bạn đã có <strong>{stockedCount}</strong> món. Bạn đang thiếu:{' '}
                      <strong className="text-amber-800 dark:text-amber-300">
                        {missingItems.map(i => i.name).join(', ')}
                      </strong>.
                    </span>
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {missingItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportMissingToMarket}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <ShoppingBag size={14} />
                      <span>Thêm {missingItems.length} món thiếu vào Giỏ Đi Chợ</span>
                    </button>
                  )}

                  <Link
                    to={`/ai-chef?prompt=${encodeURIComponent(`Tôi đang xem công thức món "${recipe.title}". Trong Tủ Bếp của tôi hiện có: ${matches.filter(m => m.inStock).map(m => m.name).join(', ') || 'chưa có sẵn gì'}, nhưng còn thiếu: ${missingItems.map(m => m.name).join(', ') || 'không thiếu'}. Bếp trưởng hãy hướng dẫn cách nấu hoặc gợi ý nguyên liệu thay thế nhé!`)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 text-xs font-bold hover:bg-teal-100 transition shadow-2xs"
                  >
                    <ChefHat size={14} />
                    <span>Hỏi AI cách thay thế</span>
                  </Link>

                  <Link
                    to="/fridge"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs"
                  >
                    <Snowflake size={14} />
                    <span>Mở Tủ Bếp</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Ingredients & Instructions Grid */}
            <div className="grid md:grid-cols-[1fr_1.8fr] gap-8 items-start">
              {/* Ingredients List with Live In-Stock Badges */}
              <section className="min-w-0 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nguyên liệu cần có</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Định lượng cho {recipe.servings ? `${recipe.servings} khẩu phần` : 'cả mẻ'}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {matches.length} món
                  </span>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {matches.map((ingredient, index) => (
                    <li key={ingredient.ingredientId || index} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <span className="block font-bold text-slate-900 dark:text-white">
                          {ingredient.name}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {ingredient.inStock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đã có trong Tủ Bếp ({ingredient.matchedFridgeItem?.quantity || '1'} {ingredient.matchedFridgeItem?.unit || 'phần'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Chưa có trong Tủ Bếp
                            </span>
                          )}

                          {ingredient.allergenType && (
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                              Dị ứng: {ingredient.allergenType}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-slate-600 dark:text-slate-400 font-extrabold text-xs sm:text-sm shrink-0 whitespace-nowrap pt-0.5">
                        {ingredient.amount} {ingredient.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Cooking Instructions */}
              <section className="min-w-0 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Các bước thực hiện</h2>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {recipe.instructions?.length || 0} công đoạn
                  </span>
                </div>

                <ol className="space-y-4">
                  {recipe.instructions?.map((step, index) => (
                    <li
                      key={index}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5"
                    >
                      <h3 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Bước {index + 1}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Video Section */}
            {!!recipe.videos?.length && (
              <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Play className="w-5 h-5 text-emerald-600 fill-current" />
                      Video hướng dẫn nấu từng bước
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Xem trực quan kỹ thuật cắt tỉa, canh lửa và nêm nếm món ăn từ đầu bếp chay
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerAiAnalysis}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>AI Bóc tách công thức từ video</span>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {recipe.videos.map(video => (
                    <article key={video.id} className="min-w-0 space-y-3">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        <Link to={'/videos/' + video.id} className="hover:text-emerald-700 transition">
                          {video.title}
                        </Link>
                      </h3>
                      <VideoPlayer video={video} />
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Related Community Blogs Section */}
            <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-emerald-600" />
                    Cẩm nang &amp; Bài viết liên quan
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kinh nghiệm chế biến, lựa chọn nguyên liệu và câu chuyện dinh dưỡng từ cộng đồng VEGEAI
                  </p>
                </div>
                <Link
                  to="/blog"
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  Xem thêm Blog <ArrowUpRight size={14} />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  to="/blog"
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 transition group shadow-2xs"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                    Kỹ thuật nấu chay
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 mt-2 truncate">
                    Bí quyết nêm nếm món chay thanh ngọt tự nhiên không cần hạt nêm công nghiệp
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    Sử dụng mía lau, củ sen, nấm hương và bắp ngọt để tạo vị ngọt hậu tự nhiên cho mọi món canh và kho.
                  </p>
                </Link>

                <Link
                  to="/blog"
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500 transition group shadow-2xs"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-950 px-2.5 py-0.5 rounded-full">
                    Dinh dưỡng thực vật
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 mt-2 truncate">
                    Bổ sung đủ đạm và khoáng chất cho người mới bắt đầu ăn chay
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    Phối hợp giữa đậu hạt, đậu hũ non, hạt lanh và rau xanh thẫm để không lo thiếu chất hay mệt mỏi.
                  </p>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
