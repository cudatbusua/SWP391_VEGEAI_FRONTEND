import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarDays, Camera, Check, CheckCircle2, ChefHat, CircleHelp, CloudUpload, ImagePlus, Leaf, LoaderCircle, Plus, ScanLine, ShieldCheck, Snowflake, Sparkles, Trash2, Utensils, X } from 'lucide-react';
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
  // Normalize Vietnamese accents before matching API ingredient names to small, consistent food icons.
  const normalized = name.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const illustrations: [string[], string][] = [
    [['ca chua', 'tomato'], '🍅'], [['dua leo', 'cucumber'], '🥒'], [['ca rot', 'carrot'], '🥕'],
    [['bap cai', 'rau', 'cai', 'xalach', 'lettuce', 'spinach'], '🥬'], [['hanh', 'onion'], '🧅'],
    [['toi', 'garlic'], '🧄'], [['ot', 'chili'], '🌶️'], [['nam', 'mushroom'], '🍄'],
    [['dau hu', 'dau phu', 'tofu'], '🧈'], [['bap', 'ngo', 'corn'], '🌽'], [['khoai', 'potato'], '🥔'],
    [['tao', 'apple'], '🍎'], [['chuoi', 'banana'], '🍌'], [['chanh', 'lemon'], '🍋'], [['trung', 'egg'], '🥚'],
  ];
  return illustrations.find(([keywords]) => keywords.some(keyword => normalized.includes(keyword)))?.[1] ?? '🥗';
}


function isNonFoodKeyword(text: string): boolean {
  const lower = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lower.includes('cui') || lower.includes('que cui') || lower.includes('canh cay') ||
         lower.includes('khuc go') || lower.includes('go') || lower.includes('cay canh') ||
         lower.includes('nhua') || lower.includes('da');
}

function isItemEdible(item: { name: string; category?: string; isEdible?: boolean }): boolean {
  if (item.isEdible === false || item.category === 'NON_FOOD') return false;
  return !isNonFoodKeyword(item.name);
}

function mergeScanResults(results: FridgeScanResponse[]): FridgeScanResponse {
  // Several photos may identify the same ingredient; keep its first AI result and merge the unique suggestions/warnings.
  const ingredients = new Map<string, FridgeScanResponse['ingredients'][number]>();
  const rejectedNonFood: string[] = [];

  results.forEach(result => (result.ingredients || []).forEach(item => {
    const isNonFood = !isItemEdible(item);
    if (isNonFood) {
      if (!rejectedNonFood.includes(item.name)) rejectedNonFood.push(item.name);
      return; // DO NOT include non-food items in ingredients list
    }
    let specificName = item.name.trim();
    const lower = specificName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower === 'rau xanh' || lower === 'rau') {
      specificName = 'Rau cải ngọt tươi';
    }
    const key = specificName.toLocaleLowerCase('vi');
    if (key && !ingredients.has(key)) ingredients.set(key, { ...item, name: specificName });
  }));

  const baseWarnings = [...new Set(results.flatMap(result => result.warnings ?? []))];
  if (rejectedNonFood.length > 0) {
    baseWarnings.unshift(`⚠️ ĐÃ LOẠI TRỪ: Phát hiện ${rejectedNonFood.join(', ')} không thuộc dạng nguyên liệu thực phẩm để nấu ăn. Hệ thống đã đánh dấu đỏ (!) ở góc ảnh và không đưa vào danh sách nấu.`);
  }

  return {
    summary: results.map(result => result.summary).filter(Boolean).join(' '),
    totalItemsDetected: ingredients.size,
    hasNonVegetarianItem: results.some(result => result.hasNonVegetarianItem),
    ingredients: [...ingredients.values()],
    suggestedRecipes: [...new Set(results.flatMap(result => result.suggestedRecipes ?? []))],
    warnings: baseWarnings,
    scannedAt: new Date().toISOString(),
  };
}

// F5 reference flow: image upload → AI review → fridge confirmation.
function FridgeScanSteps({ currentStep }: { currentStep: number }) {
  const steps = ['Tải ảnh', 'Kiểm tra nguyên liệu', 'Hoàn tất'];

  return <section className="fridge-scan-steps" aria-label={`Quét tủ lạnh, bước ${currentStep} trên 3`}>
    <div className="fridge-scan-steps-heading">
      <span>TRÍ TUỆ NHÂN TẠO QUÉT TỦ LẠNH</span>
      <span>BƯỚC {currentStep}/3</span>
    </div>
    <ol className="fridge-scan-steps-list">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        return <li key={step} className={`fridge-scan-step${isCurrent ? ' is-current' : ''}${isComplete ? ' is-complete' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
          <span className="fridge-scan-step-number">{isComplete ? <Check size={14} /> : stepNumber}</span>
          <span>{step}</span>
        </li>;
      })}
    </ol>
  </section>;
}

type ScanReviewProps = {
  result: FridgeScanResponse;
  images: SelectedImage[];
  imageResults: FridgeScanResponse[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  ingredients: FridgeScanResponse['ingredients'];
  updateIngredient: (index: number, changes: Partial<FridgeScanResponse['ingredients'][number]>) => void;
  removeIngredient: (index: number) => void;
  newIngredientName: string;
  setNewIngredientName: (name: string) => void;
  addIngredient: () => void;
  isAuthenticated: boolean;
  usableItems: FridgeScanResponse['ingredients'];
  saving: boolean;
  onSave: () => void;
  onUploadMore: () => void;
  onBack: () => void;
  error: string;
  message: string;
};

function ScanReview(props: ScanReviewProps) {
  
  const checkImageHasNonFood = (index: number) => {
    const imgRes = imageResults[index];
    if (imgRes) {
      if (imgRes.ingredients?.some(i => i.category === 'NON_FOOD' || i.isEdible === false || isNonFoodKeyword(i.name))) {
        return true;
      }
      if (imgRes.warnings?.some(w => w.toLowerCase().includes('không phải') || w.toLowerCase().includes('củi'))) {
        return true;
      }
    }
    const imgName = images[index]?.file?.name || '';
    if (isNonFoodKeyword(imgName)) return true;
    return false;
  };

  const { result, images, imageResults, activeImageIndex, onSelectImage, ingredients, updateIngredient,
    removeIngredient, newIngredientName, setNewIngredientName, addIngredient, isAuthenticated,
    usableItems, saving, onSave, onUploadMore, onBack, error, message } = props;
  const currentImage = images[activeImageIndex];
  const freshness: Record<string, string> = { FRESH: 'Tươi', USABLE: 'Dùng sớm', SPOILED: 'Không nên dùng' };
  const confidence = (imageResults[activeImageIndex]?.ingredients ?? []).map(item => item.confidence)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const imageConfidence = confidence.length
    ? Math.round(confidence.reduce((sum, value) => sum + (value <= 1 ? value * 100 : value), 0) / confidence.length)
    : null;

  return <>
    <section aria-live="polite" className="fridge-review-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-3 lg:col-span-5">
          <div className="fridge-review-photo rounded-xl bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><ScanLine size={16} className="text-emerald-700" /> Ảnh quét từ AI</h2><span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500">Ngăn {String(activeImageIndex + 1).padStart(2, '0')}</span></div>
            <div className="relative">
              {currentImage ? <img src={currentImage.preview} alt={`Ảnh nguyên liệu ngăn ${activeImageIndex + 1}`} className="fridge-review-image h-[260px] w-full rounded-lg bg-white object-contain sm:h-[300px]" /> : <div className="fridge-review-image flex h-[260px] flex-col items-center justify-center rounded-lg bg-white text-slate-400 sm:h-[300px]"><ImagePlus size={32} className="mb-2" /><p className="text-sm">Nguyên liệu nhập thủ công</p></div>}
              {checkImageHasNonFood(activeImageIndex) && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-lg ring-2 ring-white animate-pulse" title="Vật phẩm không thuộc dạng nguyên liệu nấu ăn - Đã đánh dấu đỏ">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-rose-600 text-[11px] font-black">!</span>
                  <span>Không phải nguyên liệu nấu ăn</span>
                </div>
              )}
            </div>
            {images.length > 1 && <div className="mt-2 flex gap-2">{images.map((image, index) => <button key={image.id} type="button" onClick={() => onSelectImage(index)} className={`relative flex min-w-0 flex-1 items-center gap-2 rounded-lg border p-1.5 text-left ${index === activeImageIndex ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <img src={image.preview} alt="" className="h-8 w-10 rounded object-cover" />
                  <span className="truncate text-[10px] text-slate-600">Ảnh {index + 1}</span>
                  {checkImageHasNonFood(index) && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[11px] font-black text-white shadow-md ring-2 ring-white animate-bounce" title="Ảnh có vật phẩm không ăn được (củi khô...) - Đã loại trừ">!</span>
                  )}
                </button>)}</div>}
            <button type="button" onClick={onUploadMore} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:text-emerald-700"><Camera size={15} /> Chụp lại / Tải ảnh khác</button>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck size={16} /></span><div><p className="text-xs font-bold text-slate-800">Phân tích hình ảnh hoàn tất</p><p className="mt-0.5 text-[10px] text-slate-500">{images.length ? `${images.length} ảnh đã được xử lý` : 'Danh sách được nhập bằng tay'}</p></div></div>{imageConfidence != null && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{imageConfidence}% tin cậy</span>}</div></div>
        </div>

        <div className="fridge-review-list rounded-xl border border-slate-100 p-3 sm:p-4 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900">Danh Sách Thực Phẩm Bóc Tách</h2><p className="mt-0.5 text-[11px] text-slate-500">Chỉnh sửa số lượng hoặc xóa thực phẩm không đúng</p></div><span className="shrink-0 text-[10px] text-slate-500">{ingredients.length} / {ingredients.length} mục hợp lệ</span></div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">{ingredients.map((item, index) => <article key={`${item.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xl">{ingredientIllustration(item.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{item.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{item.isVegetarian ? 'Thực phẩm thuần chay' : 'Cần kiểm tra thành phần'} · {freshness[item.freshness] ?? item.freshness}{item.confidence != null ? ` · ${Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence)}%` : ''}</p></div><input aria-label={`Số lượng ${item.name}`} type="number" min="0.1" step="0.1" value={item.quantity ?? 1} onChange={event => updateIngredient(index, { quantity: Math.max(0.1, Number(event.target.value)) })} className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center text-xs outline-none focus:border-emerald-500" /><select aria-label={`Đơn vị ${item.name}`} value={item.unit ?? 'phần'} onChange={event => updateIngredient(index, { unit: event.target.value })} className="max-w-20 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-[10px] outline-none focus:border-emerald-500"><option>phần</option><option>cái</option><option>bó</option><option>kg</option><option>g</option><option>ml</option><option>quả</option><option>hộp</option></select><button type="button" aria-label={`Xóa ${item.name}`} onClick={() => removeIngredient(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></article>)}</div>
          <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); addIngredient(); }}><input value={newIngredientName} onChange={event => setNewIngredientName(event.target.value)} placeholder="Thêm nguyên liệu khác" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500" /><button type="submit" disabled={!newIngredientName.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"><Plus size={14} /> Thêm</button></form>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-xs font-bold text-slate-700">Hồ sơ cá nhân phù hợp đang áp dụng</p><p className="mt-1 text-[11px] text-slate-500">Gợi ý món sẽ dựa trên nguyên liệu và chế độ ăn của bạn.</p></div><Link to="/nutrition" className="text-xs font-semibold text-emerald-700 hover:underline">Xem hồ sơ</Link></div>
      {result.hasNonVegetarianItem && <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">Một số nguyên liệu có thể không phù hợp với chế độ ăn chay.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{message}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={16} /> Quay lại</button><div className="flex flex-wrap gap-2">{isAuthenticated && !!usableItems.length && <Button type="button" isLoading={saving} onClick={onSave} leftIcon={!saving ? <Sparkles size={16} /> : undefined} className="bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/50">Xác nhận, gợi ý món ngay</Button>}{!!usableItems.length && <Link to="/ai-chef" state={{ source: 'fridge-scan', title: `Quét tủ lạnh (${usableItems.length} món)`, ingredients: usableItems.map(item => item.name) }} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 text-sm font-bold shadow-xs transition"><ChefHat size={16} /> Chuyển sang AI Bếp Trưởng</Link>}</div>{!isAuthenticated && <Link to="/login" className="text-xs font-semibold text-emerald-700 hover:underline">Đăng nhập để lưu vào kho</Link>}</div>
      {message && <Link to="/fridge" className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline">Xem kho nguyên liệu →</Link>}
    </section>
    <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ChefHat size={17} className="text-emerald-700" />
            Dự kiến {result.suggestedRecipes?.length ?? 0} công thức thuần chay phù hợp
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Gợi ý dựa trên nguyên liệu vừa được AI nhận diện
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">
          Thời gian chuẩn bị: 15–25 phút
        </span>
      </div>
      {result.suggestedRecipes?.length ? (
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {result.suggestedRecipes.map((recipe, index) => (
            <div key={index} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                {recipe}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to="/ai-chef"
                  state={{
                    source: 'fridge-scan',
                    title: `Nấu ${recipe}`,
                    initialPrompt: `Hãy hướng dẫn tôi nấu món "${recipe}" bằng các nguyên liệu thuần chay vừa nhận diện được.`
                  }}
                  title="Nhờ AI Bếp Trưởng hướng dẫn nấu"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition shadow-2xs"
                >
                  <Utensils size={12} />
                  <span>Nấu</span>
                </Link>
                <Link
                  to="/meal-plans"
                  title="Lên thực đơn tuần với món này"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[11px] font-bold transition shadow-2xs"
                >
                  <CalendarDays size={12} />
                  <span>Thực đơn</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Chưa có gợi ý món ăn cho lượt quét này.</p>
      )}
    </section>
  </>;
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

  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const addImages = (files: FileList | File[]) => {
    setError(''); setMessage('');
    const incoming = Array.from(files);
    if (!incoming.length) return;
    const accepted: SelectedImage[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) { setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.'); continue; }
      if (file.size === 0 || file.size > MAX_IMAGE_SIZE) { setError('Mỗi ảnh cần có dung lượng từ 1 byte đến 5 MB.'); continue; }
      if (images.length + accepted.length >= MAX_IMAGES) { setError(`Bạn có thể tải tối đa ${MAX_IMAGES} ảnh trong một lượt quét.`); break; }
      const preview = URL.createObjectURL(file);
      objectUrls.current.add(preview);
      accepted.push({ id: `${Date.now()}-${accepted.length}-${file.name}`, file, preview });
    }
    if (accepted.length) {
      setImages(current => [...current, ...accepted].slice(0, MAX_IMAGES));
      setResult(null); setIngredients([]); setCompletedImages(0);
    }
  };

  const removeImage = (id: string) => {
    setImages(current => {
      const removed = current.find(image => image.id === id);
      if (removed) { URL.revokeObjectURL(removed.preview); objectUrls.current.delete(removed.preview); }
      return current.filter(image => image.id !== id);
    });
  };

  const reset = () => {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url)); objectUrls.current.clear();
    setImages([]); setResult(null); setImageResults([]); setActiveImageIndex(0); setIngredients([]); setNewIngredientName(''); setError(''); setMessage(''); setCompletedImages(0);
    if (inputRef.current) inputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const scan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!images.length || busy) return;
    setBusy(true); setError(''); setMessage(''); setResult(null); setCompletedImages(0);
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
        setIngredients(scanResult.ingredients.map(item => ({ ...item, quantity: item.quantity ?? 1, unit: item.unit ?? 'phần' })));
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const saveToFridge = async () => {
    if (!result || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await fridgeService.confirmScan({ ...result, ingredients });
      setMessage(`Đã lưu ${saved.totalProcessed} nguyên liệu vào kho (${saved.newlyAddedCount} mới, ${saved.updatedExistingCount} được cập nhật).`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const updateIngredient = (index: number, changes: Partial<FridgeScanResponse['ingredients'][number]>) => setIngredients(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  const addIngredient = () => {
    const name = newIngredientName.trim();
    if (!name) return;
    setIngredients(items => [...items, { name, category: 'VEGAN', isVegetarian: true, freshness: 'FRESH', quantity: 1, unit: 'phần' }]);
    setNewIngredientName(''); setError('');
    if (!result) setResult({ summary: 'Danh sách nguyên liệu được nhập thủ công.', totalItemsDetected: 0, hasNonVegetarianItem: false, ingredients: [], scannedAt: new Date().toISOString() });
  };

  const startManualEntry = () => {
    setResult({ summary: 'Bạn có thể bổ sung nguyên liệu vào danh sách bằng tay.', totalItemsDetected: 0, hasNonVegetarianItem: false, ingredients: [], scannedAt: new Date().toISOString() });
    setIngredients([]); setError('');
  };
  const usableItems = ingredients.filter(item => item.isVegetarian && item.freshness !== 'SPOILED');
  const progress = images.length ? Math.round((completedImages / images.length) * 100) : 0;
  const reportedConfidences = ingredients.map(item => item.confidence).filter((value): value is number => value != null && Number.isFinite(value));
  const averageConfidence = reportedConfidences.length
    ? Math.round(reportedConfidences.reduce((sum, value) => sum + (value <= 1 ? value * 100 : value), 0) / reportedConfidences.length)
    : null;
  const currentStep = message ? 3 : result || busy ? 2 : 1;

  return <MainLayout>
    <div className="fridge-scan-page min-h-[calc(100vh-10rem)] bg-[#f6f9fb] px-4 py-7 sm:px-6 lg:py-9">
      <div className="mx-auto max-w-6xl">
        <input ref={inputRef} id="fridge-images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={event => { if (event.target.files) addImages(event.target.files); event.target.value = ''; }} />
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" disabled={busy} onChange={event => { if (event.target.files) addImages(event.target.files); event.target.value = ''; }} />

        <div className="mb-5 flex items-center gap-2 text-xs text-slate-500"><Link to="/" className="hover:text-emerald-700">Trang chủ</Link><span>/</span><span>Quét Tủ Lạnh</span>{result && <><span>/</span><span className="font-medium text-emerald-700">Xác nhận thực phẩm</span></>}</div>

        {/* Keep the F5 progress visible across upload, scan, and confirmation states. */}
        <FridgeScanSteps currentStep={currentStep} />

        {result ? <div className="mb-5 grid items-end gap-3 lg:grid-cols-12">
          <div className="lg:col-span-8"><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Kiểm tra &amp; Bổ sung nguyên liệu</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">AI đã nhận diện {ingredients.length} nguyên liệu. Hãy kiểm tra kết quả, chỉnh sửa số lượng hoặc bổ sung món còn thiếu.</p></div>
          <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">{averageConfidence != null && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800"><CheckCircle2 size={13} className="mr-1 inline" />Độ chuẩn xác AI: {averageConfidence}%</span>}<span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800"><Leaf size={13} className="mr-1 inline" />{usableItems.length} thực phẩm khả dụng</span></div>
        </div> : !busy && <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Quét Tủ Lạnh &amp; Gợi Ý Món Ăn</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tải ảnh ngăn tủ lạnh hoặc chụp nguyên liệu để AI nhận diện và gợi ý công thức thuần chay.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800"><Sparkles size={14} /> Chế độ phân tích thị giác 2.4</span>
        </div>}

        <div className={`grid items-start gap-4 ${result ? 'mx-auto w-full max-w-6xl grid-cols-1' : 'lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr]'} ${busy ? 'mx-auto max-w-5xl' : ''}`}>
          <div className="space-y-4">
            {busy ? <section role="status" aria-live="polite" className="mx-auto max-w-xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"><LoaderCircle size={30} className="animate-spin text-emerald-600" /></div></div>
              <h1 className="text-center text-xl font-bold text-emerald-950">AI Bếp Trưởng đang quét tủ lạnh của bạn...</h1><p className="mt-2 text-center text-sm text-slate-500">Hệ thống đang nhận diện nguyên liệu từ {images.length} ảnh bạn đã chọn.</p>
              <div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">Tiến độ phân tích ảnh</span><span className="font-bold text-emerald-700">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{completedImages} / {images.length} ảnh hoàn tất</span><span>{completedImages === images.length ? 'Hoàn tất' : 'Đang xử lý ảnh'}</span></div></div>
              <ol className="mt-4 space-y-2.5">
                {[['Đã tải lên và kiểm tra ảnh', true], ['Đang nhận diện các loại rau, củ, quả', completedImages === images.length], ['Đánh giá độ tươi và gợi ý món ăn', false]].map(([label, done], index) => <li key={String(label)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${!done && index === 1 ? 'bg-orange-50 text-slate-700' : 'text-slate-500'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : index === 1 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check size={14} /> : index === 1 ? <LoaderCircle size={14} className="animate-spin" /> : <span className="text-xs">{index + 1}</span>}</span><span className="flex-1">{String(label)}</span><span className="text-[11px]">{done ? 'Hoàn thành' : index === 1 ? 'Đang xử lý' : 'Chờ'}</span></li>)}
              </ol>
              <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800"><Leaf size={15} className="mr-2 inline" />Ảnh của bạn chỉ dùng để phân tích nguyên liệu trong lượt quét này.</p>
            </section> : result ? <ScanReview
              result={result}
              images={images}
              imageResults={imageResults}
              activeImageIndex={activeImageIndex}
              onSelectImage={setActiveImageIndex}
              ingredients={ingredients}
              updateIngredient={updateIngredient}
              removeIngredient={index => setIngredients(current => current.filter((_, itemIndex) => itemIndex !== index))}
              newIngredientName={newIngredientName}
              setNewIngredientName={setNewIngredientName}
              addIngredient={addIngredient}
              isAuthenticated={isAuthenticated}
              usableItems={usableItems}
              saving={saving}
              onSave={saveToFridge}
              onUploadMore={() => inputRef.current?.click()}
              onBack={() => { setResult(null); setIngredients([]); setError(''); }}
              error={error}
              message={message}
            /> : <>
              <form onSubmit={scan} className="fridge-scan-upload-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(230px,0.8fr)]">
                  <div>
                    <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addImages(event.dataTransfer.files); }} className={`fridge-scan-dropzone flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 text-center transition ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'}`}>
                      <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CloudUpload size={23} /></span><span className="text-sm font-bold text-slate-800">Kéo thả ảnh tủ lạnh vào đây hoặc <span className="text-emerald-700 underline underline-offset-2">chọn ảnh từ máy tính</span></span><span className="mt-1 text-xs text-slate-500">Hỗ trợ JPG, PNG hoặc WEBP tối đa 5 MB mỗi ảnh</span><span className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-slate-400"><span><ShieldCheck size={12} className="mr-1 inline" />Bảo mật riêng tư</span><span><ScanLine size={12} className="mr-1 inline" />AI nhận diện nguyên liệu</span><span><CheckCircle2 size={12} className="mr-1 inline" />Xử lý tức thì</span></span>
                    </button>
                    {images.length > 0 && <section className="mt-3 rounded-xl bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xs font-bold text-slate-700"><ImagePlus size={15} className="text-emerald-700" /> Hình ảnh đã tải lên</h2><span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500">{images.length}/{MAX_IMAGES} ảnh</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{images.map((image, index) => <article key={image.id} className="relative overflow-hidden rounded-lg bg-white border border-slate-200">
                      <img src={image.preview} alt={`Ảnh nguyên liệu ${index + 1}`} className="h-28 w-full object-cover" />
                      {isNonFoodKeyword(image.file.name) && (
                        <div className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs shadow-md ring-2 ring-white animate-pulse" title="Phát hiện vật phẩm không phải nguyên liệu (củi khô, que củi...)">!</div>
                      )}<button type="button" aria-label={`Xóa ảnh ${image.file.name}`} onClick={() => removeImage(image.id)} className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-slate-500 shadow hover:text-red-600"><X size={14} /></button><div className="flex items-center justify-between gap-1 px-2 py-2"><div className="min-w-0"><p className="truncate text-[10px] font-semibold text-slate-700">{image.file.name}</p><p className="text-[10px] text-slate-400">{(image.file.size / 1024 / 1024).toFixed(1)} MB</p></div><CheckCircle2 size={14} className="shrink-0 text-emerald-600" /></div></article>)}{images.length < MAX_IMAGES && <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center text-[10px] text-slate-500 hover:border-emerald-400"><Plus size={20} className="mb-1 text-emerald-700" />Thêm ảnh ngăn khác</button>}</div></section>}
                    {error && <div role="alert" className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-4"><div className="flex gap-2.5"><AlertCircle size={17} className="mt-0.5 shrink-0 text-orange-600" /><div><p className="text-sm font-bold text-orange-900">Không thể nhận diện nguyên liệu từ ảnh vừa tải lên</p><p className="mt-1 text-xs leading-5 text-orange-900/80">{error}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff7952] px-3 py-2 text-xs font-semibold text-white hover:bg-[#f26740]"><Camera size={14} /> Chụp lại hoặc tải ảnh khác</button><button type="button" onClick={startManualEntry} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:text-emerald-700"><Plus size={14} /> Nhập nguyên liệu bằng tay</button><button type="button" onClick={() => setError('')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white">Quay lại trang Quét tủ lạnh</button></div></div>}
                    <div className="mt-3 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-3"><button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Camera size={15} /> Chụp bằng camera</button><div className="flex flex-wrap gap-2"><button type="button" onClick={startManualEntry} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Nhập nguyên liệu bằng tay</button><Button type="submit" disabled={!images.length || busy} isLoading={busy} leftIcon={!busy ? <Sparkles size={16} /> : undefined} className="bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-700/50">Phân tích bằng AI</Button></div></div>
                  </div>
                  <aside className="rounded-xl bg-slate-50 p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Camera size={15} /></span>Lưu ý khi chụp ảnh tủ lạnh</h2><div className="mt-3 space-y-3">{[['Chụp rõ nét, không rung tay', 'Giữ điện thoại và bật đèn flash nếu ngăn tủ tối.'], ['Lấy nguyên liệu ra mặt phẳng', 'Trải đều thực phẩm để AI nhận diện dễ hơn.'], ['Chụp đủ sáng và không che khuất', 'Ảnh sáng rõ giúp đánh giá độ tươi tốt hơn.']].map(([title, desc], index) => <div key={title} className="flex gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">{index + 1}</span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{desc}</p></div></div>)}</div></aside>
                </div>
              </form>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800">Hình ảnh quét đạt chuẩn mẫu</h2><span className="text-[10px] font-semibold text-emerald-700">◎ Độ chuẩn xác cao</span></div><div className="grid gap-2 sm:grid-cols-2"><div className="flex gap-3 rounded-lg bg-emerald-50 p-2.5"><span className="text-xl">🥬</span><div><p className="text-xs font-bold text-emerald-900">Đủ sáng + Tách biệt</p><p className="mt-1 text-[10px] leading-4 text-emerald-800">Mở tủ sáng rõ, rau củ không bị che khuất giúp AI nhận diện chính xác hơn.</p></div></div><div className="flex gap-3 rounded-lg bg-emerald-50 p-2.5"><span className="text-xl">🥗</span><div><p className="text-xs font-bold text-emerald-900">Đặt trên bàn bếp</p><p className="mt-1 text-[10px] leading-4 text-emerald-800">Nguyên liệu bày riêng, chụp toàn cảnh để ảnh rõ ràng và dễ phân tích.</p></div></div></div></section>
            </>}
          </div>

          {!result && <aside className="space-y-4">
            {busy ? <><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><ImagePlus size={16} /></span>Ảnh đang được phân tích</h2><div className="mt-4 space-y-2">{images.map((image, index) => <div key={image.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"><img src={image.preview} alt="" className="h-12 w-14 rounded object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-700">Ảnh {index + 1}: {image.file.name}</p><p className="text-[10px] text-slate-500">{index < completedImages ? 'Đã phân tích xong' : index === completedImages ? 'Đang nhận diện...' : 'Đang chờ'}</p></div>{index < completedImages ? <CheckCircle2 size={16} className="text-emerald-600" /> : index === completedImages ? <LoaderCircle size={16} className="animate-spin text-orange-500" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}</div>)}</div></section><section className="rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-900"><Sparkles size={15} className="mr-1.5 inline" />AI đang phân tích riêng từng ảnh và gộp các nguyên liệu trùng tên trong kết quả.</section></> : result ? <><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Snowflake size={16} /></span>Gợi ý khắc phục nhanh</h2><p className="mt-2 text-xs text-slate-500">Chỉnh sửa kết quả để phù hợp với nguyên liệu thực tế trong tủ.</p><div className="mt-4 space-y-3">{[['Bổ sung hoặc xóa nguyên liệu', 'Danh sách chưa chính xác? Bạn có thể thêm, sửa số lượng hoặc xóa mục không có.'], ['Kiểm tra độ tươi', 'Đối chiếu trạng thái AI đánh giá với thực phẩm thật.'], ['Chọn món phù hợp', 'Gửi danh sách nguyên liệu sang AI Bếp Trưởng để nhận gợi ý.']].map(([title, desc], index) => <div key={title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{index + 1}</span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{desc}</p></div></div>)}</div></section><section className="rounded-2xl bg-emerald-50 p-4"><h3 className="flex items-center gap-2 text-xs font-bold text-emerald-900"><ShieldCheck size={15} />Mẹo chuẩn bị nguyên liệu nhanh</h3><p className="mt-2 text-[11px] leading-5 text-emerald-800">Gợi ý: Bảo quản thực phẩm theo nhóm và chỉ lưu những món bạn đã kiểm tra trực tiếp.</p></section><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><CircleHelp size={15} className="text-emerald-700" />Kết quả chỉ mang tính tham khảo.</p><p className="mt-2 pl-6 text-[11px] leading-5 text-slate-500">Hãy kiểm tra trực tiếp chất lượng thực phẩm trước khi sử dụng.</p></section><button type="button" onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Trash2 size={16} /> Xóa ảnh và bắt đầu lại</button></> : <><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Sparkles size={16} /></span>Gợi ý khắc phục nhanh</h2><p className="mt-2 text-xs leading-5 text-slate-500">Chỉ tải từ 1 đến 5 ảnh để thuật toán máy học nhận diện đúng nguyên liệu.</p><div className="mt-4 space-y-3">{[['Bật đèn thanh hoặc đứng gần tủ', 'Giữ chắc điện thoại và bật đèn flash nếu ngăn tủ tối.'], ['Lấy nguyên liệu ra mặt phẳng', 'Tách riêng rau củ và thịt cá để AI nhận diện tốt hơn.'], ['Chuyển sang chế độ xem lưới', 'Chụp toàn cảnh, giữ cho thực phẩm không bị che khuất.']].map(([title, desc], index) => <div key={title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{index + 1}</span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{desc}</p></div></div>)}</div><div className="mt-4 rounded-lg bg-emerald-50 p-3 text-[10px] leading-4 text-emerald-900"><Sparkles size={14} className="mr-1 inline" />Độ chính xác sẽ tốt hơn khi chụp ảnh đủ sáng và thấy rõ từng loại thực phẩm.</div></section><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><CircleHelp size={15} className="text-emerald-700" />Dữ liệu tủ lạnh của bạn được bảo mật</p><p className="mt-2 pl-6 text-[11px] leading-5 text-slate-500">Ảnh chỉ dùng để phân tích trong lượt quét. Bạn có thể nhập nguyên liệu bằng tay nếu không muốn tải ảnh.</p></section></>}
          </aside>}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] text-slate-400"><ShieldCheck size={13} />Ảnh của bạn được xử lý an toàn và không chia sẻ công khai.</p>
      </div>
    </div>
  </MainLayout>;
}
