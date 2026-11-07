import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  CircleHelp,
  CloudUpload,
  ImagePlus,
  Leaf,
  LoaderCircle,
  MapPin,
  PenLine,
  Plus,
  Refrigerator,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { aiService } from '../services/aiService';
import { fridgeService } from '../services/fridgeService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { FridgeScanResponse } from '../types/api';
import '../styles/fridge-scan.css';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
type SelectedImage = { id: string; file: File; preview: string };

function ingredientIllustration(name: string) {
  const normalized = name.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const illustrations: [string[], string][] = [
    [['ca chua', 'tomato'], '🍅'],
    [['dua leo', 'cucumber'], '🥒'],
    [['ca rot', 'carrot'], '🥕'],
    [['bap cai', 'rau', 'cai', 'xalach', 'lettuce', 'spinach'], '🥬'],
    [['hanh', 'onion'], '🧅'],
    [['toi', 'garlic'], '🧄'],
    [['ot', 'chili'], '🌶️'],
    [['nam', 'mushroom'], '🍄'],
    [['dau hu', 'dau phu', 'tofu'], '🧈'],
    [['bap', 'ngo', 'corn'], '🌽'],
    [['khoai', 'potato'], '🥔'],
    [['tao', 'apple'], '🍎'],
    [['chuoi', 'banana'], '🍌'],
    [['chanh', 'lemon'], '🍋'],
    [['trung', 'egg'], '🥚'],
  ];
  return illustrations.find(([keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[1] ?? '🥗';
}

export function isNonFoodKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const nonFoodPhrases = [
    'cui kho', 'que cui', 'khuc go', 'mieng go', 'cay cui', 'canh cay', 'than cay',
    'cay canh', 'cay xanh', 'chau cay',
    'dong la', 'la kho', 'la rung', 'la muc', 'co dai',
    'soi da', 'hon da', 'cuc da', 'da soi', 'gach da',
    'rac thai', 'tui nilon', 'chai nhua', 'do nhua', 'phe lieu',
  ];

  if (nonFoodPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  const tokens = lower.split(/[^a-z0-9]+/);
  const suspiciousTokens = ['cui', 'rac'];
  if (tokens.some((t) => suspiciousTokens.includes(t))) {
    return true;
  }

  const isLeafOrPlant = tokens.includes('cay') || tokens.includes('la');
  const isFoodPlant =
    lower.includes('rau') ||
    lower.includes('cai') ||
    lower.includes('la lot') ||
    lower.includes('la tia to') ||
    lower.includes('la giang') ||
    lower.includes('la chanh');
  if (isLeafOrPlant && !isFoodPlant && (lower.includes('dong') || lower.includes('rung') || lower.includes('kho') || tokens.length <= 2)) {
    return true;
  }

  return false;
}

export type ImageReliability = {
  isReliable: boolean;
  reason?: string;
  foodCount: number;
};

export function evaluateImageReliability(image: SelectedImage, scanRes?: FridgeScanResponse): ImageReliability {
  const fileName = image?.file?.name || '';
  if (isNonFoodKeyword(fileName)) {
    return {
      isReliable: false,
      reason: 'Tên ảnh cho thấy là cành cây, đống lá hoặc vật phẩm không ăn được',
      foodCount: 0,
    };
  }

  if (!scanRes) {
    return { isReliable: true, foodCount: 0 };
  }

  const nonFoodItems = (scanRes.ingredients || []).filter(
    (i) => i.category === 'NON_FOOD' || i.isEdible === false || isNonFoodKeyword(i.name)
  );

  const edibleItems = (scanRes.ingredients || []).filter(
    (i) => i.category !== 'NON_FOOD' && i.isEdible !== false && !isNonFoodKeyword(i.name)
  );

  if (nonFoodItems.length > 0 && edibleItems.length === 0) {
    return {
      isReliable: false,
      reason: `Phát hiện ${nonFoodItems.map((i) => i.name).join(', ')} (không ăn được)`,
      foodCount: 0,
    };
  }

  const hasNonFoodWarning = (scanRes.warnings || []).some((w) => {
    const lw = w.toLowerCase();
    return (
      lw.includes('không phải thực phẩm') ||
      lw.includes('không phải nguyên liệu') ||
      lw.includes('củi khô') ||
      lw.includes('cành cây') ||
      lw.includes('đống lá')
    );
  });

  if (hasNonFoodWarning && edibleItems.length === 0) {
    return {
      isReliable: false,
      reason: 'AI xác định ảnh là cành cây / đống lá hoặc vật phẩm không ăn được',
      foodCount: 0,
    };
  }

  if (edibleItems.length === 0 && (scanRes.totalItemsDetected === 0 || !scanRes.ingredients?.length)) {
    return {
      isReliable: false,
      reason: 'AI không tìm thấy nguyên liệu nấu ăn nào trong ảnh',
      foodCount: 0,
    };
  }

  return {
    isReliable: true,
    foodCount: edibleItems.length,
  };
}

function isItemEdible(item: { name: string; category?: string; isEdible?: boolean }): boolean {
  if (item.isEdible === false || item.category === 'NON_FOOD') return false;
  return !isNonFoodKeyword(item.name);
}

function mergeScanResults(results: FridgeScanResponse[]): FridgeScanResponse {
  const ingredients = new Map<string, FridgeScanResponse['ingredients'][number]>();
  const rejectedNonFood: string[] = [];

  results.forEach((result) =>
    (result.ingredients || []).forEach((item) => {
      const isNonFood = !isItemEdible(item);
      if (isNonFood) {
        if (!rejectedNonFood.includes(item.name)) rejectedNonFood.push(item.name);
        return;
      }
      let specificName = item.name.trim();
      const lower = specificName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === 'rau xanh' || lower === 'rau') {
        specificName = 'Rau cải ngọt tươi';
      }
      const key = specificName.toLocaleLowerCase('vi');
      if (key && !ingredients.has(key)) ingredients.set(key, { ...item, name: specificName });
    })
  );

  const baseWarnings = [...new Set(results.flatMap((result) => result.warnings ?? []))];
  if (rejectedNonFood.length > 0) {
    baseWarnings.unshift(
      `⚠️ ĐÃ LOẠI TRỪ: Phát hiện ${rejectedNonFood.join(', ')} không thuộc dạng nguyên liệu thực phẩm để nấu ăn. Hệ thống đã đánh dấu đỏ (!) ở góc ảnh và không đưa vào danh sách nấu.`
    );
  }

  return {
    summary: results.map((result) => result.summary).filter(Boolean).join(' '),
    totalItemsDetected: ingredients.size,
    hasNonVegetarianItem: results.some((result) => result.hasNonVegetarianItem),
    ingredients: [...ingredients.values()],
    suggestedRecipes: [...new Set(results.flatMap((result) => result.suggestedRecipes ?? []))],
    warnings: baseWarnings,
    scannedAt: new Date().toISOString(),
  };
}

function FridgeScanSteps({ currentStep }: { currentStep: number }) {
  const steps = ['Tải ảnh', 'Kiểm tra & Chọn nguyên liệu', 'Xác nhận lưu vào Tủ lạnh'];

  return (
    <section className="fridge-scan-steps" aria-label={`Quét tủ lạnh, bước ${currentStep} trên 3`}>
      <div className="fridge-scan-steps-heading">
        <span>TRÍ TUỆ NHÂN TẠO QUÉT TỦ LẠNH</span>
        <span>BƯỚC {currentStep}/3</span>
      </div>
      <ol className="fridge-scan-steps-list">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          return (
            <li
              key={step}
              className={`fridge-scan-step${isCurrent ? ' is-current' : ''}${isComplete ? ' is-complete' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="fridge-scan-step-number">{isComplete ? <Check size={14} /> : stepNumber}</span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type ScanReviewProps = {
  result: FridgeScanResponse;
  images: SelectedImage[];
  imageResults: FridgeScanResponse[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  onRemoveImageAtIndex: (index: number) => void;
  onRemoveAllUnreliable: () => void;
  ingredients: FridgeScanResponse['ingredients'];
  updateIngredient: (index: number, changes: Partial<FridgeScanResponse['ingredients'][number]>) => void;
  removeIngredient: (index: number) => void;
  newIngredientName: string;
  setNewIngredientName: (name: string) => void;
  addIngredient: () => void;
  isAuthenticated: boolean;
  usableItems: FridgeScanResponse['ingredients'];
  saving: boolean;
  onSave: (itemsToSave: FridgeScanResponse['ingredients']) => Promise<void> | void;
  onUploadMore: () => void;
  onBack: () => void;
  error: string;
  message: string;
};

function ScanReview(props: ScanReviewProps) {
  const {
    result,
    images,
    imageResults,
    activeImageIndex,
    onSelectImage,
    onRemoveImageAtIndex,
    onRemoveAllUnreliable,
    ingredients,
    updateIngredient,
    removeIngredient,
    newIngredientName,
    setNewIngredientName,
    addIngredient,
    isAuthenticated,
    usableItems,
    saving,
    onSave,
    onUploadMore,
    onBack,
    error,
    message,
  } = props;

  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const toggleSelectIngredient = (index: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectedIngredientsToSave = ingredients.filter(
    (item, idx) => !excludedIndices.has(idx) && item.isVegetarian && item.freshness !== 'SPOILED'
  );

  const reliabilities = images.map((img, idx) => evaluateImageReliability(img, imageResults[idx]));
  const currentReliability = reliabilities[activeImageIndex] || { isReliable: true, foodCount: 0 };
  const unreliableCount = reliabilities.filter((r) => !r.isReliable).length;

  const currentImage = images[activeImageIndex];
  const freshness: Record<string, string> = { FRESH: 'Tươi', USABLE: 'Dùng sớm', SPOILED: 'Không nên dùng' };
  const confidence = (imageResults[activeImageIndex]?.ingredients ?? [])
    .map((item) => item.confidence)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const imageConfidence = confidence.length
    ? Math.round(confidence.reduce((sum, value) => sum + (value <= 1 ? value * 100 : value), 0) / confidence.length)
    : null;

  return (
    <>
      {/* Banner notification for Unreliable Images */}
      {unreliableCount > 0 && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-sm">
                !
              </span>
              <div>
                <p className="text-sm font-bold text-rose-900">
                  Phát hiện {unreliableCount} ảnh không đáng tin cậy (cành cây, đống lá hoặc vật phẩm không ăn được)
                </p>
                <p className="mt-0.5 text-xs text-rose-800/90">
                  Hệ thống đã đánh dấu đỏ (!) và tự động loại trừ khỏi danh sách nguyên liệu. Bạn có thể xóa từng ảnh hoặc bấm nút để tự động dọn sạch.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveAllUnreliable}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Trash2 size={14} />
              <span>✨ Tự động loại bỏ tất cả ảnh lỗi ({unreliableCount})</span>
            </button>
          </div>
        </div>
      )}

      <section aria-live="polite" className="fridge-review-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="space-y-3 lg:col-span-5">
            <div className="fridge-review-photo rounded-xl bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <ScanLine size={16} className="text-emerald-700" /> Ảnh quét từ AI
                </h2>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                  Ngăn {String(activeImageIndex + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="relative">
                {currentImage ? (
                  <img
                    src={currentImage.preview}
                    alt={`Ảnh nguyên liệu ngăn ${activeImageIndex + 1}`}
                    className="fridge-review-image h-[260px] w-full rounded-lg bg-white object-contain sm:h-[300px]"
                  />
                ) : (
                  <div className="fridge-review-image flex h-[260px] flex-col items-center justify-center rounded-lg bg-white text-slate-400 sm:h-[300px]">
                    <ImagePlus size={32} className="mb-2" />
                    <p className="text-sm">Nguyên liệu nhập thủ công</p>
                  </div>
                )}

                {!currentReliability.isReliable ? (
                  <div
                    className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-lg ring-2 ring-white animate-pulse"
                    title={currentReliability.reason || 'Vật phẩm không thuộc dạng nguyên liệu nấu ăn - Đã đánh dấu đỏ'}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-rose-600 text-[11px] font-black">
                      !
                    </span>
                    <span>Không đáng tin cậy: {currentReliability.reason || 'Không phải thực phẩm'}</span>
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-lg ring-2 ring-white">
                    <CheckCircle2 size={13} />
                    <span>
                      Ảnh đạt chuẩn: {currentReliability.foodCount > 0 ? `${currentReliability.foodCount} nguyên liệu` : 'Hợp lệ'}
                    </span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {images.map((image, index) => {
                    const rel = reliabilities[index] || { isReliable: true, foodCount: 0 };
                    const isSelected = index === activeImageIndex;
                    return (
                      <div
                        key={image.id}
                        onClick={() => onSelectImage(index)}
                        className={`relative group flex min-w-0 flex-1 items-center gap-2 rounded-lg border p-1.5 text-left cursor-pointer transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-2xs'
                            : rel.isReliable
                            ? 'border-slate-200 bg-white hover:bg-slate-50'
                            : 'border-rose-300 bg-rose-50/70 hover:bg-rose-50'
                        }`}
                      >
                        <img src={image.preview} alt="" className="h-8 w-10 shrink-0 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[10px] font-bold text-slate-700">Ảnh {index + 1}</span>
                          <span className={`block text-[9px] ${rel.isReliable ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-bold'}`}>
                            {rel.isReliable ? 'Đạt chuẩn' : 'Không tin cậy'}
                          </span>
                        </div>

                        <button
                          type="button"
                          aria-label={`Xóa ảnh ${index + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveImageAtIndex(index);
                          }}
                          className="p-1 rounded-full bg-white/90 hover:bg-rose-100 text-slate-400 hover:text-rose-600 shadow-2xs transition"
                          title="Xóa ảnh này"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={onUploadMore}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:text-emerald-700 cursor-pointer"
              >
                <Camera size={15} /> Chụp lại / Tải thêm ảnh khác
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Phân tích hình ảnh hoàn tất</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {images.length ? `${images.length} ảnh đã được xử lý` : 'Danh sách được nhập bằng tay'}
                    </p>
                  </div>
                </div>
                {imageConfidence != null && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                    {imageConfidence}% tin cậy
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Ingredient Review & Selection */}
          <div className="fridge-review-list rounded-xl border border-slate-100 p-3 sm:p-4 lg:col-span-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh Sách Nguyên Liệu Suy Ra Từ Ảnh Quét
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tick chọn nguyên liệu muốn nạp vào Kho Tủ Lạnh (/fridge), điều chỉnh số lượng hoặc thêm món còn thiếu
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] text-emerald-800 font-bold">
                Đã chọn {selectedIngredientsToSave.length} / {ingredients.length} món để thêm vào Tủ lạnh
              </span>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {ingredients.map((item, index) => {
                const isSelected = !excludedIndices.has(index) && item.isVegetarian && item.freshness !== 'SPOILED';
                return (
                  <article
                    key={`${item.name}-${index}`}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                      isSelected
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!item.isVegetarian || item.freshness === 'SPOILED'}
                      onChange={() => toggleSelectIngredient(index)}
                      aria-label={`Chọn ${item.name} để thêm vào tủ lạnh`}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xl">
                      {ingredientIllustration(item.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {item.isVegetarian ? '🌱 Thuần chay' : '⚠️ Cần kiểm tra'} · {freshness[item.freshness] ?? item.freshness}
                        {item.confidence != null
                          ? ` · AI ${Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence)}%`
                          : ''}
                      </p>
                    </div>
                    <select
                      aria-label={`Độ tươi ${item.name}`}
                      value={item.freshness}
                      onChange={(e) =>
                        updateIngredient(index, {
                          freshness: e.target.value as 'FRESH' | 'USABLE' | 'SPOILED',
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-emerald-500"
                    >
                      <option value="FRESH">Tươi mới</option>
                      <option value="USABLE">Dùng sớm</option>
                      <option value="SPOILED">Hỏng (Loại bỏ)</option>
                    </select>
                    <input
                      aria-label={`Số lượng ${item.name}`}
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity ?? 1}
                      onChange={(event) =>
                        updateIngredient(index, { quantity: Math.max(0.1, Number(event.target.value)) })
                      }
                      className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <select
                      aria-label={`Đơn vị ${item.name}`}
                      value={item.unit ?? 'phần'}
                      onChange={(event) => updateIngredient(index, { unit: event.target.value })}
                      className="max-w-20 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-[10px] outline-none focus:border-emerald-500"
                    >
                      <option>phần</option>
                      <option>cái</option>
                      <option>bó</option>
                      <option>kg</option>
                      <option>g</option>
                      <option>ml</option>
                      <option>quả</option>
                      <option>hộp</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Xóa ${item.name}`}
                      onClick={() => {
                        setExcludedIndices((prev) => new Set([...prev].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))));
                        removeIngredient(index);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                );
              })}
            </div>

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addIngredient();
              }}
            >
              <input
                value={newIngredientName}
                onChange={(event) => setNewIngredientName(event.target.value)}
                placeholder="Bổ sung thêm nguyên liệu khác bằng tay..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newIngredientName.trim()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition cursor-pointer"
              >
                <Plus size={14} /> Thêm vào danh sách
              </button>
            </form>
          </div>
        </div>

        {result.hasNonVegetarianItem && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Một số nguyên liệu có thể không phù hợp với chế độ ăn thuần chay và đã được bỏ chọn tự động.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
            {error}
          </p>
        )}

        {/* Prominent Post-Confirmation Success Card */}
        {message && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 sm:p-5 text-emerald-950 shadow-xs"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-black text-emerald-950">{message}</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Nguyên liệu đã được đồng bộ vào Kho Tủ Lạnh (/fridge). Bạn có thể kiểm tra tủ lạnh, lên thực đơn tuần hoặc định vị cửa hàng gần bạn để mua thêm nguyên liệu còn thiếu.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  to="/fridge"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                >
                  <Refrigerator size={15} /> Mở Kho Tủ Lạnh (/fridge)
                </Link>
                <Link
                  to="/smart-market"
                  state={{
                    recipeTitle: `Bổ sung nguyên liệu sau khi quét tủ lạnh`,
                    ingredients: selectedIngredientsToSave.map(
                      (i) => `${i.name}: ${i.quantity ?? 1} ${i.unit ?? 'phần'}`
                    ),
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2.5 text-xs font-bold text-emerald-900 transition"
                >
                  <MapPin size={15} /> Định vị điểm bán gần tôi (GPS)
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>

          <div className="flex flex-wrap gap-2.5">
            {isAuthenticated && selectedIngredientsToSave.length > 0 && (
              <Button
                type="button"
                isLoading={saving}
                onClick={() => setShowConfirmModal(true)}
                leftIcon={!saving ? <Refrigerator size={16} /> : undefined}
                className="bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/50"
              >
                ➕ Xác nhận thêm {selectedIngredientsToSave.length} nguyên liệu vào Tủ lạnh
              </Button>
            )}

            {usableItems.length > 0 && (
              <Link
                to="/smart-market"
                state={{
                  recipeTitle: `Nguyên liệu từ Quét Tủ Lạnh (${usableItems.length} món)`,
                  ingredients: usableItems.map((item) => `${item.name}: ${item.quantity ?? 1} ${item.unit ?? 'phần'}`),
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-4 py-3 text-sm font-bold transition"
              >
                <MapPin size={16} /> Tìm điểm bán nguyên liệu gần đây (GPS)
              </Link>
            )}

            {usableItems.length > 0 && (
              <Link
                to="/ai-chef"
                state={{
                  source: 'fridge-scan',
                  title: `Quét tủ lạnh (${usableItems.length} món)`,
                  ingredients: usableItems.map((item) => item.name),
                  initialPrompt: `Tôi vừa quét tủ lạnh và có các nguyên liệu sau: ${usableItems
                    .map((i) => `${i.name} (${i.quantity ?? 1} ${i.unit ?? 'phần'})`)
                    .join(', ')}. Bếp trưởng hãy gợi ý món chay ngon và hướng dẫn cách nấu chi tiết nhé!`,
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 text-sm font-bold shadow-xs transition"
              >
                <ChefHat size={16} /> Chuyển sang AI Bếp Trưởng
              </Link>
            )}
          </div>

          {!isAuthenticated && (
            <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline">
              Đăng nhập để lưu nguyên liệu vào Kho Tủ Lạnh
            </Link>
          )}
        </div>
      </section>

      {/* Confirmation Modal Before Adding Ingredients to Fridge */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Refrigerator size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Xác nhận thêm nguyên liệu vào Tủ lạnh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kiểm tra lại {selectedIngredientsToSave.length} nguyên liệu trước khi lưu vào Kho Tủ Lạnh (/fridge)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {selectedIngredientsToSave.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{ingredientIllustration(item.name)}</span>
                    <div>
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="ml-2 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {freshness[item.freshness] ?? item.freshness}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700">
                    {item.quantity ?? 1} {item.unit ?? 'phần'}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-emerald-50/80 p-3 text-xs text-emerald-900 mb-5">
              💡 Nếu nguyên liệu đã tồn tại trong tủ lạnh, hệ thống sẽ tự động cập nhật số lượng và độ tươi mới nhất.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setShowConfirmModal(false);
                  await onSave(selectedIngredientsToSave);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-5 py-2.5 text-xs font-black text-white shadow-sm cursor-pointer"
              >
                <CheckCircle2 size={15} />
                {saving ? 'Đang lưu...' : `Xác nhận nạp ${selectedIngredientsToSave.length} món vào Tủ lạnh`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Recipes */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ChefHat size={17} className="text-emerald-700" />
              Dự kiến {result.suggestedRecipes?.length ?? 0} công thức thuần chay phù hợp
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">Gợi ý dựa trên nguyên liệu vừa được AI nhận diện</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">
            Thời gian chuẩn bị: 15–25 phút
          </span>
        </div>

        {result.suggestedRecipes?.length ? (
          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {result.suggestedRecipes.map((recipe, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30"
              >
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">{recipe}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to="/ai-chef"
                    state={{
                      source: 'fridge-scan',
                      title: `Nấu ${recipe}`,
                      initialPrompt: `Hãy hướng dẫn tôi nấu món "${recipe}" bằng các nguyên liệu thuần chay vừa nhận diện được.`,
                    }}
                    title="Nhờ AI Bếp Trưởng hướng dẫn nấu"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition shadow-2xs"
                  >
                    <Utensils size={12} />
                    <span>Nấu</span>
                  </Link>
                  <Link
                    to="/settings?tab=calendar"
                    title="Lên lịch ăn với món này"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[11px] font-bold transition shadow-2xs"
                  >
                    <CalendarDays size={12} />
                    <span>Thực đơn</span>
                  </Link>
                  <Link
                    to="/blog/write"
                    state={{
                      recipeTitle: `[Món Chay Mới] ${recipe}`,
                      recipeExcerpt: `Công thức sáng tạo món "${recipe}" được khám phá từ nguyên liệu tủ lạnh: ${usableItems
                        .map((i) => i.name)
                        .join(', ')}.`,
                      recipeContent: `## Món chay sáng tạo: ${recipe}\n\n### 🥗 Nguyên liệu có sẵn từ tủ lạnh:\n${usableItems
                        .map((i) => `- ${i.name} (${i.quantity ?? 1} ${i.unit ?? 'phần'})`)
                        .join(
                          '\n'
                        )}\n\n### 👨‍🍳 Hướng dẫn nấu ăn gợi ý bởi VEGEAI:\n1. **Sơ chế**: Rửa sạch các loại rau củ và nguyên liệu bằng nước muối loãng, cắt miếng vừa ăn.\n2. **Chế biến**: Đun nóng chảo với dầu thực vật, xào thơm gia vị và cho nguyên liệu vào nấu chín tới.\n3. **Hoàn thiện**: Nêm nếm nước tương chay, hạt nêm nấm vừa khẩu vị và rắc thêm tiêu thơm, bày ra đĩa thưởng thức nóng.\n\n> ✨ *Công thức độc đáo được gợi ý từ AI Bếp Trưởng & Tủ lạnh thông minh VEGEAI.*`,
                      recipeCategory: 'KITCHEN',
                    }}
                    title="Tạo bài viết Blog chia sẻ công thức món mới này cho cộng đồng"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-2xs"
                  >
                    <PenLine size={12} />
                    <span>Đăng Blog</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Chưa có gợi ý món ăn cho lượt quét này.</p>
        )}
      </section>
    </>
  );
}

export function FridgeScanPage() {
  const { isAuthenticated } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [result, setResult] = useState<FridgeScanResponse | null>(null);
  const [imageResults, setImageResults] = useState<FridgeScanResponse[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ingredients, setIngredients] = useState<FridgeScanResponse['ingredients']>([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [completedImages, setCompletedImages] = useState(0);

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addImages = (files: FileList | File[]) => {
    setError('');
    setMessage('');
    const incoming = Array.from(files);
    if (!incoming.length) return;
    const accepted: SelectedImage[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
        continue;
      }
      if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
        setError('Mỗi ảnh cần có dung lượng từ 1 byte đến 5 MB.');
        continue;
      }
      if (images.length + accepted.length >= MAX_IMAGES) {
        setError(`Bạn có thể tải tối đa ${MAX_IMAGES} ảnh trong một lượt quét.`);
        break;
      }
      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      accepted.push({ id: `${Date.now()}-${accepted.length}-${file.name}`, file, preview });
    }
    if (accepted.length) {
      setImages((current) => [...current, ...accepted].slice(0, MAX_IMAGES));
      setResult(null);
      setIngredients([]);
      setCompletedImages(0);
    }
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
        objectUrls.current.delete(removed.preview);
      }
      return current.filter((image) => image.id !== id);
    });
  };

  const removeImageAtIndex = (index: number) => {
    const imageToRemove = images[index];
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
      objectUrls.current.delete(imageToRemove.preview);
    }
    const nextImages = images.filter((_, i) => i !== index);
    const nextImageResults = imageResults.filter((_, i) => i !== index);
    setImages(nextImages);
    setImageResults(nextImageResults);

    if (nextImages.length === 0) {
      reset();
      return;
    }

    const nextActive = Math.min(activeImageIndex, nextImages.length - 1);
    setActiveImageIndex(nextActive);

    if (nextImageResults.length > 0) {
      const scanResult = mergeScanResults(nextImageResults);
      setResult(scanResult);
      setIngredients(
        scanResult.ingredients.map((item) => ({ ...item, quantity: item.quantity ?? 1, unit: item.unit ?? 'phần' }))
      );
    } else {
      setResult(null);
      setIngredients([]);
    }
    setMessage('Đã loại bỏ ảnh được chọn và cập nhật lại danh sách nguyên liệu.');
  };

  const removeAllUnreliableImages = () => {
    const reliablePairs = images
      .map((img, idx) => ({
        img,
        res: imageResults[idx],
        idx,
        rel: evaluateImageReliability(img, imageResults[idx]),
      }))
      .filter((x) => x.rel.isReliable);

    if (reliablePairs.length === 0) {
      setError(
        'Tất cả ảnh đã tải lên đều không hợp lệ hoặc không phải nguyên liệu thực phẩm. Vui lòng chụp lại ảnh tủ lạnh.'
      );
      return;
    }

    const removedCount = images.length - reliablePairs.length;
    images.forEach((img, idx) => {
      if (!reliablePairs.some((r) => r.idx === idx)) {
        URL.revokeObjectURL(img.preview);
        objectUrls.current.delete(img.preview);
      }
    });

    const nextImages = reliablePairs.map((x) => x.img);
    const nextResults = reliablePairs.map((x) => x.res);

    setImages(nextImages);
    setImageResults(nextResults);
    setActiveImageIndex(0);

    const scanResult = mergeScanResults(nextResults);
    setResult(scanResult);
    setIngredients(
      scanResult.ingredients.map((item) => ({ ...item, quantity: item.quantity ?? 1, unit: item.unit ?? 'phần' }))
    );
    setMessage(
      `Đã tự động loại bỏ ${removedCount} ảnh lỗi/không đáng tin cậy. Kết quả nguyên liệu đã được tính lại chỉ từ các ảnh đạt chuẩn!`
    );
  };

  const reset = () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
    setImages([]);
    setResult(null);
    setImageResults([]);
    setActiveImageIndex(0);
    setIngredients([]);
    setNewIngredientName('');
    setError('');
    setMessage('');
    setCompletedImages(0);
    if (inputRef.current) inputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const scan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!images.length || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    setResult(null);
    setCompletedImages(0);
    try {
      const responses: FridgeScanResponse[] = [];
      for (let index = 0; index < images.length; index += 1) {
        responses.push(await aiService.scanFridge(images[index].file));
        setCompletedImages(index + 1);
      }
      const scanResult = mergeScanResults(responses);
      if (!scanResult.ingredients.length) {
        setError('AI chưa nhận diện được nguyên liệu trong ảnh. Hãy thử ảnh rõ hơn hoặc nhập nguyên liệu bằng tay.');
      } else {
        setResult(scanResult);
        setImageResults(responses);
        setActiveImageIndex(0);
        setIngredients(
          scanResult.ingredients.map((item) => ({ ...item, quantity: item.quantity ?? 1, unit: item.unit ?? 'phần' }))
        );
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const saveToFridge = async (itemsToSave?: FridgeScanResponse['ingredients']) => {
    if (!result || saving) return;
    const finalItems = itemsToSave && itemsToSave.length > 0 ? itemsToSave : ingredients;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await fridgeService.confirmScan({ ...result, ingredients: finalItems });
      setMessage(
        `Đã xác nhận và thêm thành công ${saved.totalProcessed} nguyên liệu vào Kho Tủ Lạnh (${saved.newlyAddedCount} nguyên liệu mới, ${saved.updatedExistingCount} nguyên liệu được cộng dồn/cập nhật).`
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const updateIngredient = (index: number, changes: Partial<FridgeScanResponse['ingredients'][number]>) =>
    setIngredients((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)));
  const addIngredient = () => {
    const name = newIngredientName.trim();
    if (!name) return;
    setIngredients((items) => [
      ...items,
      { name, category: 'VEGAN', isVegetarian: true, freshness: 'FRESH', quantity: 1, unit: 'phần' },
    ]);
    setNewIngredientName('');
    setError('');
    if (!result)
      setResult({
        summary: 'Danh sách nguyên liệu được nhập thủ công.',
        totalItemsDetected: 0,
        hasNonVegetarianItem: false,
        ingredients: [],
        scannedAt: new Date().toISOString(),
      });
  };

  const startManualEntry = () => {
    setResult({
      summary: 'Bạn có thể bổ sung nguyên liệu vào danh sách bằng tay.',
      totalItemsDetected: 0,
      hasNonVegetarianItem: false,
      ingredients: [],
      scannedAt: new Date().toISOString(),
    });
    setIngredients([]);
    setError('');
  };

  const usableItems = ingredients.filter((item) => item.isVegetarian && item.freshness !== 'SPOILED');
  const progress = images.length ? Math.round((completedImages / images.length) * 100) : 0;
  const reportedConfidences = ingredients
    .map((item) => item.confidence)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const averageConfidence = reportedConfidences.length
    ? Math.round(
        reportedConfidences.reduce((sum, value) => sum + (value <= 1 ? value * 100 : value), 0) /
          reportedConfidences.length
      )
    : null;
  const currentStep = message ? 3 : result || busy ? 2 : 1;

  return (
    <MainLayout>
      <div className="fridge-scan-page min-h-[calc(100vh-10rem)] bg-[#f6f9fb] px-4 py-7 sm:px-6 lg:py-9">
        <div className="mx-auto max-w-6xl">
          <input
            ref={inputRef}
            id="fridge-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              if (event.target.files) addImages(event.target.files);
              event.target.value = '';
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              if (event.target.files) addImages(event.target.files);
              event.target.value = '';
            }}
          />

          <div className="mb-5 flex items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link to="/" className="hover:text-emerald-700">
                Trang chủ
              </Link>
              <span>/</span>
              <Link to="/fridge" className="hover:text-emerald-700">
                Kho Tủ Lạnh
              </Link>
              <span>/</span>
              <span className="font-semibold text-emerald-700">Quét Ảnh Tủ Lạnh AI</span>
            </div>
            <Link
              to="/fridge"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition"
            >
              <Refrigerator size={14} /> Xem Kho Tủ Lạnh hiện tại
            </Link>
          </div>

          <FridgeScanSteps currentStep={currentStep} />

          {result ? (
            <div className="mb-5 grid items-end gap-3 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Kiểm tra &amp; Xác nhận thêm vào Tủ lạnh
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  AI đã suy ra {ingredients.length} nguyên liệu từ ảnh quét. Hãy kiểm tra lại danh sách, điều chỉnh định lượng và bấm <strong>Xác nhận thêm vào Tủ lạnh</strong>.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
                {averageConfidence != null && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={13} className="mr-1 inline" />
                    Độ chuẩn xác AI: {averageConfidence}%
                  </span>
                )}
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <Leaf size={13} className="mr-1 inline" />
                  {usableItems.length} thực phẩm khả dụng
                </span>
              </div>
            </div>
          ) : (
            !busy && (
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    Quét Tủ Lạnh &amp; Thêm Nguyên Liệu Tự Động
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Tải ảnh ngăn tủ lạnh hoặc chụp nguyên liệu để AI nhận diện, đánh giá độ tươi, nạp vào Kho Tủ Lạnh (/fridge) và gợi ý món chay phù hợp.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <Sparkles size={14} /> Chế độ phân tích thị giác 2.4
                </span>
              </div>
            )
          )}

          <div
            className={`grid items-start gap-4 ${
              result ? 'mx-auto w-full max-w-6xl grid-cols-1' : 'lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]'
            } ${busy ? 'mx-auto max-w-5xl' : ''}`}
          >
            <div className="space-y-4">
              {busy ? (
                <section
                  role="status"
                  aria-live="polite"
                  className="mx-auto max-w-xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                      <LoaderCircle size={30} className="animate-spin text-emerald-600" />
                    </div>
                  </div>
                  <h1 className="text-center text-xl font-bold text-emerald-950">
                    AI Bếp Trưởng đang quét tủ lạnh của bạn...
                  </h1>
                  <p className="mt-2 text-center text-sm text-slate-500">
                    Hệ thống đang nhận diện nguyên liệu từ {images.length} ảnh bạn đã chọn.
                  </p>
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-700">Tiến độ phân tích ảnh</span>
                      <span className="font-bold text-emerald-700">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </section>
              ) : result ? (
                <ScanReview
                  result={result}
                  images={images}
                  imageResults={imageResults}
                  activeImageIndex={activeImageIndex}
                  onSelectImage={setActiveImageIndex}
                  onRemoveImageAtIndex={removeImageAtIndex}
                  onRemoveAllUnreliable={removeAllUnreliableImages}
                  ingredients={ingredients}
                  updateIngredient={updateIngredient}
                  removeIngredient={(index) =>
                    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  newIngredientName={newIngredientName}
                  setNewIngredientName={setNewIngredientName}
                  addIngredient={addIngredient}
                  isAuthenticated={isAuthenticated}
                  usableItems={usableItems}
                  saving={saving}
                  onSave={saveToFridge}
                  onUploadMore={() => inputRef.current?.click()}
                  onBack={() => {
                    setResult(null);
                    setIngredients([]);
                    setError('');
                  }}
                  error={error}
                  message={message}
                />
              ) : (
                <>
                  <form
                    onSubmit={scan}
                    className="fridge-scan-upload-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(230px,0.8fr)]">
                      <div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => inputRef.current?.click()}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragging(true);
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            addImages(event.dataTransfer.files);
                          }}
                          className={`fridge-scan-dropzone flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 text-center transition ${
                            dragging
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
                          }`}
                        >
                          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CloudUpload size={23} />
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            Kéo thả ảnh tủ lạnh vào đây hoặc{' '}
                            <span className="text-emerald-700 underline underline-offset-2">chọn ảnh từ máy tính</span>
                          </span>
                          <span className="mt-1 text-xs text-slate-500">
                            Hỗ trợ JPG, PNG hoặc WEBP tối đa 5 MB mỗi ảnh
                          </span>
                        </button>

                        {images.length > 0 && (
                          <section className="mt-3 rounded-xl bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <ImagePlus size={15} className="text-emerald-700" /> Hình ảnh đã tải lên
                              </h2>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500">
                                {images.length}/{MAX_IMAGES} ảnh
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {images.map((image, index) => {
                                const isSuspicious = isNonFoodKeyword(image.file.name);
                                return (
                                  <article
                                    key={image.id}
                                    className="relative overflow-hidden rounded-lg bg-white border border-slate-200"
                                  >
                                    <img
                                      src={image.preview}
                                      alt={`Ảnh nguyên liệu ${index + 1}`}
                                      className="h-28 w-full object-cover"
                                    />
                                    {isSuspicious && (
                                      <div
                                        className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs shadow-md ring-2 ring-white animate-pulse"
                                        title="Phát hiện tên tệp nghi ngờ là cành cây/đống lá/vật phẩm không ăn được"
                                      >
                                        !
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      aria-label={`Xóa ảnh ${image.file.name}`}
                                      onClick={() => removeImage(image.id)}
                                      className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-slate-500 shadow hover:text-red-600 cursor-pointer"
                                      title="Xóa ảnh này"
                                    >
                                      <X size={14} />
                                    </button>
                                    <div className="flex items-center justify-between gap-1 px-2 py-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-[10px] font-semibold text-slate-700">
                                          {image.file.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {(image.file.size / 1024 / 1024).toFixed(1)} MB
                                        </p>
                                      </div>
                                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                    </div>
                                  </article>
                                );
                              })}
                              {images.length < MAX_IMAGES && (
                                <button
                                  type="button"
                                  onClick={() => inputRef.current?.click()}
                                  className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center text-[10px] text-slate-500 hover:border-emerald-400 cursor-pointer"
                                >
                                  <Plus size={20} className="mb-1 text-emerald-700" />
                                  Thêm ảnh ngăn khác
                                </button>
                              )}
                            </div>
                          </section>
                        )}

                        {error && (
                          <div role="alert" className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
                            <div className="flex gap-2.5">
                              <AlertCircle size={17} className="mt-0.5 shrink-0 text-orange-600" />
                              <div>
                                <p className="text-sm font-bold text-orange-900">
                                  Không thể nhận diện nguyên liệu từ ảnh vừa tải lên
                                </p>
                                <p className="mt-1 text-xs leading-5 text-orange-900/80">{error}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => cameraRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Camera size={15} /> Chụp bằng camera
                          </button>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={startManualEntry}
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Nhập nguyên liệu bằng tay
                            </button>
                            <Button
                              type="submit"
                              disabled={!images.length || busy}
                              isLoading={busy}
                              leftIcon={!busy ? <Sparkles size={16} /> : undefined}
                              className="bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/50"
                            >
                              Phân tích bằng AI
                            </Button>
                          </div>
                        </div>
                      </div>

                      <aside className="rounded-xl bg-slate-50 p-4">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <Camera size={15} />
                          </span>
                          Quy trình Quét &amp; Nạp Tủ Lạnh
                        </h2>
                        <div className="mt-3 space-y-3">
                          {[
                            ['1. Chụp / Tải ảnh tủ lạnh', 'AI nhận diện tên nguyên liệu, số lượng và đánh giá độ tươi.'],
                            ['2. Kiểm tra & Xác nhận', 'Tick chọn các món muốn nạp và bấm Xác nhận thêm vào Kho Tủ Lạnh.'],
                            ['3. Lên lịch nấu hoặc Tìm điểm bán', 'Dùng nguyên liệu trong tủ để lên thực đơn tuần hoặc định vị GPS nơi bán món còn thiếu.'],
                          ].map(([title, desc], index) => (
                            <div key={title} className="flex gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{title}</p>
                                <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </form>
                </>
              )}
            </div>

            {!result && !busy && (
              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Sparkles size={16} />
                    </span>
                    Gợi ý quét tủ lạnh tốt nhất
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Chỉ tải từ 1 đến 5 ảnh để AI nhận diện chuẩn xác nhất.
                  </p>
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-[10px] leading-4 text-emerald-900">
                    <Sparkles size={14} className="mr-1 inline" />
                    Độ chính xác sẽ tốt nhất khi chụp ảnh đủ sáng và thấy rõ từng loại thực phẩm.
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CircleHelp size={15} className="text-emerald-700" />
                    Dữ liệu tủ lạnh của bạn được bảo mật
                  </p>
                  <p className="mt-2 pl-6 text-[11px] leading-5 text-slate-500">
                    Ảnh chỉ dùng để phân tích trong lượt quét. Bạn có thể nhập nguyên liệu bằng tay nếu không muốn tải ảnh.
                  </p>
                </section>
              </aside>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
