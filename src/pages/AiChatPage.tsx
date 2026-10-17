import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChefHat,
  Leaf,
  Loader2,
  Package,
  Plus,
  ScanLine,
  Soup,
  Sparkles,
  Target,
  Timer,
  Utensils,
  X,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { CommunityGuard } from '../components/CommunityUi';
import { Planner } from './MealPlansPage';
import { aiService } from '../services/aiService';
import { fridgeService } from '../services/fridgeService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { AiChatResponse, FridgeScanResponse, NutritionGoal, NutritionTargets } from '../types/api';

const suggestions = [
  {
    icon: Soup,
    title: 'Suy thực đơn từ nguyên liệu tủ lạnh',
    text: 'Tôi vừa quét tủ lạnh có đậu phụ, nấm đùi gà, bông cải xanh và cà chua. Hãy suy ra thực đơn chay 3 bữa giàu đạm và hướng dẫn cách chế biến.',
  },
  {
    icon: Target,
    title: 'Phân tích mục tiêu dinh dưỡng & lên thực đơn tuần',
    text: 'Hãy phân tích mục tiêu calo và dưỡng chất (Đạm, Carb, Béo, Chất xơ) của tôi để gợi ý thực đơn chay theo tuần cân bằng dinh dưỡng.',
  },
  {
    icon: Timer,
    title: 'Bữa chay 20 phút đủ chất',
    text: 'Gợi ý một bữa chay dễ nấu trong 20 phút, kèm định lượng nguyên liệu và các bước thực hiện chi tiết.',
  },
  {
    icon: Leaf,
    title: 'Đổi vị món chay Việt Nam',
    text: 'Gợi ý 3 món chay Việt Nam thanh đạm để đổi vị cho gia đình, ưu tiên nguyên liệu tươi dễ mua.',
  },
];

const freshnessLabels: Record<string, string> = {
  FRESH: 'Tươi mới',
  USABLE: 'Nên dùng sớm',
  SPOILED: 'Đã hỏng (Không dùng)',
};

const goalLabels: Record<NutritionGoal, string> = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Giữ cân',
  GAIN_MUSCLE: 'Tăng cơ',
};

function SmartAiChefHub() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const stateData = (location.state || {}) as {
    ingredients?: unknown;
    nutritionTargets?: NutritionTargets;
    goal?: NutritionGoal;
    dietaryPreferences?: string;
    allergies?: string;
    mode?: 'chat' | 'meal-plan' | 'fridge-scan';
    period?: 'WEEK' | 'MONTH';
  };

  const initialTab =
    searchParams.get('tab') === 'meal-plan' || stateData.mode === 'meal-plan' ? 'meal-plan' : 'chat';
  const [activeTab, setActiveTab] = useState<'chat' | 'meal-plan'>(initialTab);
  const [plannerPeriod, setPlannerPeriod] = useState<'WEEK' | 'MONTH'>(stateData.period || 'WEEK');

  // Integrated Fridge Scanner state inside Chatbox
  const [scannerOpen, setScannerOpen] = useState<boolean>(
    searchParams.get('tab') === 'fridge-scan' || stateData.mode === 'fridge-scan'
  );
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState('');
  const [scanResult, setScanResult] = useState<FridgeScanResponse | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanSaving, setScanSaving] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // Chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState(() => {
    const ingredients = stateData.ingredients;
    const names = Array.isArray(ingredients)
      ? ingredients
          .filter((name): name is string => typeof name === 'string' && !!name.trim())
          .slice(0, 20)
          .map(name => name.slice(0, 60))
      : [];
    if (names.length) {
      return `Tôi có nguyên liệu từ tủ lạnh: ${names.join(', ')}. Hãy suy ra các món chay phù hợp, định lượng chi tiết và đề xuất thực đơn cho tôi.`;
    }
    if (stateData.nutritionTargets) {
      const t = stateData.nutritionTargets;
      const g = stateData.goal ? goalLabels[stateData.goal] : 'Cân bằng';
      return `Mục tiêu dinh dưỡng của tôi (${g}): BMI ${t.bmi?.toFixed(1)}, TDEE ${Math.round(t.tdee)} kcal, cần đạt ${Math.round(t.dailyCaloriesTarget)} kcal/ngày (Đạm ${t.proteinTargetG}g, Carb ${t.carbsTargetG}g, Chất béo ${t.fatTargetG}g, Chất xơ ${t.fiberTargetG}g). Hãy phân tích mục tiêu này và thiết lập gợi ý thực đơn chay theo tuần/tháng phù hợp cho tôi.`;
    }
    return '';
  });
  const [lastResponse, setLastResponse] = useState<AiChatResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'meal-plan') setActiveTab('meal-plan');
    else if (tabParam === 'fridge-scan') {
      setActiveTab('chat');
      setScannerOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!scanImage) {
      setScanPreview('');
      return;
    }
    const url = URL.createObjectURL(scanImage);
    setScanPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [scanImage]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);

  const sendPromptToAi = async (promptText: string) => {
    if (!promptText.trim() || busy) return;
    setBusy(true);
    setError('');
    const message = promptText.trim();
    setMessages(previous => [...previous, { sender: 'user', text: message }]);
    setInput('');
    try {
      const history = messages.slice(-10).map(item => ({
        role: item.sender === 'user' ? ('user' as const) : ('model' as const),
        text: item.text.slice(0, 4000),
      }));
      const response = await aiService.chat(message, lastResponse?.sessionId, history);
      setMessages(previous => [...previous, { sender: 'ai', text: response.reply }]);
      setLastResponse(response);
    } catch (reason) {
      setError(errorMessage(reason));
      setInput(message);
      setMessages(previous => previous.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendPromptToAi(input);
  };

  const handleScanFridge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scanImage || scanBusy) return;
    setScanBusy(true);
    setScanError('');
    setScanMessage('');
    setScanResult(null);
    try {
      const res = await aiService.scanFridge(scanImage);
      setScanResult(res);
    } catch (reason) {
      setScanError(errorMessage(reason));
    } finally {
      setScanBusy(false);
    }
  };

  const handleSaveFridge = async () => {
    if (!scanResult || scanSaving) return;
    setScanSaving(true);
    setScanError('');
    setScanMessage('');
    try {
      const saved = await fridgeService.confirmScan(scanResult);
      setScanMessage(
        `Đã lưu ${saved.totalProcessed} nguyên liệu vào Kho Tủ Lạnh (${saved.newlyAddedCount} mới, ${saved.updatedExistingCount} cập nhật).`
      );
    } catch (reason) {
      setScanError(errorMessage(reason));
    } finally {
      setScanSaving(false);
    }
  };

  const usableIngredients =
    scanResult?.ingredients
      ?.filter(item => item.isVegetarian && item.freshness !== 'SPOILED')
      .map(item => item.name) || [];

  const handleSendScanToChat = async () => {
    if (!usableIngredients.length) return;
    const prompt = `Tôi vừa quét tủ lạnh và có các nguyên liệu chay tươi dùng được gồm: ${usableIngredients.join(', ')}. Hãy suy ra thực đơn các món chay ngon từ những nguyên liệu này, kèm định lượng và đề xuất lịch ăn cho tôi.`;
    setActiveTab('chat');
    await sendPromptToAi(prompt);
  };

  const switchTab = (tab: 'chat' | 'meal-plan', period?: 'WEEK' | 'MONTH') => {
    setActiveTab(tab);
    if (period) setPlannerPeriod(period);
    if (tab === 'meal-plan') {
      setSearchParams({ tab: 'meal-plan' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Integrated Workspace Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-200">
        <div>
          <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles size={15} /> TRUNG TÂM TRÍ TUỆ NHÂN TẠO VEGEAI
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900">AI Bếp Trưởng Thông Minh</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tích hợp Chatbox AI tư vấn món chay, Quét tủ lạnh nhận diện nguyên liệu và Lập thực đơn Tuần / Tháng theo mục tiêu dinh dưỡng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => switchTab('chat')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <ChefHat size={18} />
            Chatbox AI & Quét Tủ Lạnh
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('chat');
              setScannerOpen(true);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === 'chat' && scannerOpen
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Camera size={18} className="text-emerald-600" />
            Quét Tủ Lạnh
          </button>

          <button
            type="button"
            onClick={() => switchTab('meal-plan')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
              activeTab === 'meal-plan'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <CalendarDays size={18} />
            Lập Thực Đơn Tuần / Tháng
          </button>

          {isAuthenticated && (
            <Link
              to="/fridge"
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 px-4 py-2.5 text-sm font-semibold transition"
            >
              <Package size={17} className="text-emerald-600" />
              Kho Tủ Lạnh
            </Link>
          )}
        </div>
      </div>

      {/* Incoming Nutrition Targets Banner (when sent from Nutrition Calculator / Profile) */}
      {stateData.nutritionTargets && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5">
              <Target size={15} /> Đã nhận mục tiêu dinh dưỡng cá nhân của bạn
            </p>
            <p className="text-sm font-semibold text-emerald-950">
              Mục tiêu: {Math.round(stateData.nutritionTargets.dailyCaloriesTarget).toLocaleString('vi-VN')} kcal/ngày · BMI{' '}
              {stateData.nutritionTargets.bmi?.toFixed(1)} · Đạm {stateData.nutritionTargets.proteinTargetG}g · Carb{' '}
              {stateData.nutritionTargets.carbsTargetG}g · Béo {stateData.nutritionTargets.fatTargetG}g
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                if (input.trim()) void sendPromptToAi(input);
              }}
              disabled={busy}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
            >
              AI Phân tích trong Chatbox
            </button>
            <button
              type="button"
              onClick={() => switchTab('meal-plan', 'WEEK')}
              className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            >
              Set Thực Đơn Tuần
            </button>
            <button
              type="button"
              onClick={() => switchTab('meal-plan', 'MONTH')}
              className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            >
              Set Thực Đơn Tháng
            </button>
          </div>
        </div>
      )}

      {activeTab === 'meal-plan' ? (
        <CommunityGuard>
          <Planner embedded initialPeriod={plannerPeriod} />
        </CommunityGuard>
      ) : (
        <div className="grid lg:grid-cols-[270px_1fr] gap-8">
          {/* Left Assistant Sidebar */}
          <aside className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85"
                alt="Bữa chay với rau củ tươi"
                className="w-full aspect-[4/3] object-cover rounded-xl mb-4"
              />
              <div className="flex items-center gap-2 font-bold mb-1.5 text-slate-900">
                <ChefHat size={19} className="text-emerald-700" /> Trợ lý Bếp Chay AI
              </div>
              <p className="text-xs text-gray-500 leading-5 mb-4">
                Quét ảnh tủ lạnh để AI nhận diện nguyên liệu, suy ra món chay và tự động lập thực đơn tuần/tháng theo chỉ số cơ thể của bạn.
              </p>

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setScannerOpen(value => !value)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ScanLine size={16} /> Quét tủ lạnh trong Chatbox
                  </span>
                  <span>{scannerOpen ? 'Đang mở' : 'Mở ngay'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('meal-plan', 'WEEK')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition cursor-pointer"
                >
                  <CalendarDays size={16} className="text-emerald-600" /> Lập thực đơn Tuần / Tháng
                </button>

                {isAuthenticated && (
                  <Link
                    to="/fridge"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition"
                  >
                    <Package size={16} className="text-emerald-600" /> Quản lý Kho Tủ Lạnh
                  </Link>
                )}

                <Link
                  to="/nutrition"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition"
                >
                  <Leaf size={16} className="text-emerald-600" /> Tính mục tiêu Dinh dưỡng
                </Link>

                <Link
                  to="/"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition"
                >
                  <Utensils size={16} className="text-emerald-600" /> Khám phá công thức chay
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Chatbox + Integrated Fridge Scanner Section */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden min-w-0 shadow-2xs flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <ChefHat size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">AI Bếp Trưởng Thông Minh VEGEAI</p>
                  <p className="text-xs text-gray-500">
                    Chat trực tiếp · Quét tủ lạnh nhận diện nguyên liệu · Đề xuất thực đơn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScannerOpen(value => !value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    scannerOpen
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Camera size={15} />
                  {scannerOpen ? 'Thu gọn Quét tủ lạnh' : 'Quét tủ lạnh AI'}
                </button>
                <button
                  title="Cuộc trò chuyện mới"
                  aria-label="Cuộc trò chuyện mới"
                  disabled={busy}
                  onClick={() => {
                    setMessages([]);
                    setLastResponse(null);
                    setError('');
                    setInput('');
                  }}
                  className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Integrated Fridge Scanner Panel inside Chatbox */}
            {scannerOpen && (
              <div className="bg-emerald-50/50 border-b border-emerald-100 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                      <Camera size={18} className="text-emerald-700" />
                      Quét Tủ Lạnh & Nhận Diện Nguyên Liệu Trong Chatbox
                    </h2>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Tải ảnh chụp tủ lạnh hoặc nguyên liệu (JPG, PNG, WEBP tối đa 5MB). AI Vision sẽ nhận diện độ tươi, lưu vào kho và suy ra thực đơn ngay lập tức.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Đóng khung quét tủ lạnh"
                    onClick={() => setScannerOpen(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleScanFridge} className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      id="chat-fridge-image"
                      aria-label="Chọn ảnh nguyên liệu tủ lạnh"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={scanBusy}
                      onChange={event => {
                        setScanImage(event.target.files?.[0] || null);
                        setScanResult(null);
                        setScanError('');
                        setScanMessage('');
                      }}
                      className="block w-full text-xs file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800"
                    />
                    <Button type="submit" disabled={!scanImage} isLoading={scanBusy} className="shrink-0">
                      {scanBusy ? 'AI đang quét ảnh...' : 'Phân tích nguyên liệu'}
                    </Button>
                  </div>

                  {scanPreview && (
                    <img
                      src={scanPreview}
                      alt="Ảnh nguyên liệu đã chọn"
                      className="max-h-52 rounded-xl object-contain mx-auto border border-gray-100"
                    />
                  )}
                  {scanError && (
                    <p role="alert" className="text-red-600 text-xs font-medium">
                      {scanError}
                    </p>
                  )}
                  {scanMessage && (
                    <p role="status" className="text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={15} /> {scanMessage}
                    </p>
                  )}
                </form>

                {scanResult && (
                  <div aria-live="polite" className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Kết quả AI Quét Tủ Lạnh ({scanResult.totalItemsDetected} nguyên liệu)
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">{scanResult.summary}</p>
                      </div>
                    </div>

                    {scanResult.hasNonVegetarianItem && (
                      <p className="bg-amber-50 text-amber-800 text-xs rounded-xl p-2.5 font-medium">
                        Lưu ý: Phát hiện nguyên liệu không thuần chay. Hệ thống sẽ tự động loại trừ khi gợi ý thực đơn chay.
                      </p>
                    )}

                    {!!scanResult.ingredients?.length && (
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {scanResult.ingredients.map((item, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-xl p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-slate-900">{item.name}</strong>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  item.freshness === 'FRESH'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.freshness === 'USABLE'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {freshnessLabels[item.freshness] || item.freshness}
                              </span>
                            </div>
                            <p className="text-gray-500">
                              {item.isVegetarian ? 'Nguyên liệu chay' : 'Không phải chay'}
                              {item.shelfLifeEstimate ? ` · Hạn: ${item.shelfLifeEstimate}` : ''}
                            </p>
                            {item.storageTip && <p className="text-emerald-800">{item.storageTip}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {!!scanResult.suggestedRecipes?.length && (
                      <div className="text-xs">
                        <p className="font-bold text-emerald-800 mb-1">Món chay suy ra từ tủ lạnh của bạn:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {scanResult.suggestedRecipes.map((rec, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 font-medium border border-emerald-200"
                            >
                              {rec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100">
                      {usableIngredients.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSendScanToChat}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
                        >
                          <Sparkles size={15} />
                          Đưa {usableIngredients.length} nguyên liệu vào AI Chat để suy thực đơn
                        </button>
                      )}
                      {isAuthenticated && !!scanResult.ingredients.length && (
                        <Button type="button" variant="outline" isLoading={scanSaving} onClick={handleSaveFridge}>
                          Lưu vào Kho Tủ Lạnh
                        </Button>
                      )}
                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={() => switchTab('meal-plan', 'WEEK')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <CalendarDays size={15} />
                          Lập Thực Đơn Tuần / Tháng từ Tủ Lạnh
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Conversation Log */}
            <div role="log" aria-live="polite" className="h-[430px] sm:h-[460px] overflow-y-auto p-5 sm:p-8">
              {!messages.length && (
                <div className="max-w-xl mx-auto py-4">
                  <Sparkles size={30} className="text-emerald-600 mb-4" />
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900">
                    Cùng AI Bếp Trưởng nấu món chay ngon & chuẩn dinh dưỡng.
                  </h2>
                  <p className="text-gray-500 text-sm leading-6 mb-6">
                    Bạn có thể quét ảnh tủ lạnh ngay phía trên, gửi mục tiêu BMI/Calo từ trang Dinh dưỡng, hoặc chọn nhanh một gợi ý dưới đây:
                  </p>
                  <div className="space-y-2.5">
                    {suggestions.map(({ icon: Icon, title, text }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          setInput(text);
                          field.current?.focus();
                        }}
                        className="w-full flex items-center gap-3 text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-800 transition cursor-pointer"
                      >
                        <Icon size={19} className="text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium">{title}</span>
                        <ArrowUp size={16} className="ml-auto rotate-45 shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    {message.sender === 'ai' && <ChefHat size={22} className="text-emerald-700 shrink-0 mt-1" />}
                    <div
                      className={`max-w-[90%] min-w-0 ${
                        message.sender === 'user'
                          ? 'bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3'
                          : 'bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-3'
                      }`}
                    >
                      <p className="text-xs font-bold mb-1.5 text-emerald-800">
                        {message.sender === 'user' ? 'Bạn' : 'AI Bếp Trưởng Thông Minh'}
                      </p>
                      <p className="text-sm leading-7 whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {busy && (
                <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 mt-5">
                  <Loader2 size={18} className="animate-spin" /> AI Bếp Trưởng đang phân tích và chuẩn bị thực đơn...
                </p>
              )}
              <div ref={bottom} />
            </div>

            {!!lastResponse?.recommendedRecipes?.length && (
              <div className="px-5 py-3 border-t border-gray-100 bg-emerald-50/30">
                <p className="text-xs font-bold text-emerald-800 mb-2">Món chay được AI đề xuất</p>
                <ul className="text-sm space-y-1 list-disc pl-5 text-slate-700">
                  {lastResponse.recommendedRecipes.map((recipe, index) => (
                    <li key={index}>{recipe}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chat Input Bar with Integrated Fridge Scan Trigger */}
            <div className="p-4 sm:p-5 border-t border-gray-100">
              {error && (
                <p role="alert" className="text-sm text-red-600 mb-3">
                  {error}
                </p>
              )}
              <form
                onSubmit={submit}
                className="flex items-end gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl p-3 focus-within:border-emerald-600"
              >
                <button
                  type="button"
                  title="Quét ảnh tủ lạnh trong chatbox"
                  aria-label="Quét ảnh tủ lạnh trong chatbox"
                  onClick={() => setScannerOpen(value => !value)}
                  className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition cursor-pointer ${
                    scannerOpen
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-white border-gray-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Camera size={19} />
                </button>
                <textarea
                  ref={field}
                  id="ai-message"
                  aria-label="Câu hỏi cho AI Bếp trưởng"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  maxLength={2000}
                  rows={2}
                  disabled={busy}
                  required
                  placeholder="Nhập nguyên liệu, mục tiêu calo hoặc bấm biểu tượng máy ảnh để quét tủ lạnh..."
                  className="w-full resize-none bg-transparent text-sm p-1 outline-none"
                />
                <button
                  type="submit"
                  title="Gửi câu hỏi"
                  aria-label="Gửi câu hỏi"
                  disabled={busy || !input.trim()}
                  className="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-700 text-white rounded-xl disabled:opacity-40 hover:bg-emerald-800 cursor-pointer"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}
                </button>
              </form>
              <div className="flex flex-wrap justify-between gap-2 mt-2.5 text-xs text-gray-400">
                <span>{input.length}/2000 ký tự · Bấm biểu tượng Máy ảnh để quét tủ lạnh trực tiếp</span>
                {lastResponse?.isGuestTrial && (
                  <span>
                    Lượt dùng thử còn lại: {lastResponse.remainingGuestQuota ?? '—'} ·{' '}
                    <Link to="/login" className="text-emerald-700 font-semibold">
                      Đăng nhập
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function AiChatPage() {
  const { user, isLoading } = useAuth();
  return (
    <MainLayout>
      {isLoading ? (
        <p role="status" className="p-8 text-center">
          Đang tải phiên đăng nhập...
        </p>
      ) : (
        <SmartAiChefHub key={user?.id || 'guest'} />
      )}
    </MainLayout>
  );
}
