import type { FridgeScanResponse } from '../../types/api';

export type ChatFridgeScanItem = FridgeScanResponse['ingredients'][number];

export interface ChatFridgeScanCardData {
  images: string[];
  items: ChatFridgeScanItem[];
  warnings?: string[];
  suggestedRecipes?: string[];
  savedToFridge?: boolean;
  savedSummary?: string;
}

export interface FridgeChatHandoffState {
  source: 'fridge-scan';
  title: string;
  ingredients: string[];
  scanItems: ChatFridgeScanItem[];
  scanImageUrls: string[];
  warnings?: string[];
  suggestedRecipes?: string[];
  alreadySavedToFridge?: boolean;
  initialPrompt: string;
}

export function safeChatImageUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^(\/api\/public\/fridge-scans\/[a-f0-9-]{36}\.(jpg|png|webp)|https?:\/\/.+)$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

export function collectScanImageUrls(
  imageResults?: FridgeScanResponse[],
  items?: ChatFridgeScanItem[],
  fallbackUrl?: string | null
): string[] {
  const seen = new Set<string>();
  const add = (candidate?: string | null) => {
    const safe = safeChatImageUrl(candidate);
    if (safe && !safe.startsWith('data:')) {
      seen.add(safe);
    }
  };
  (imageResults ?? []).forEach((res) => add(res?.scanImageUrl));
  (items ?? []).forEach((item) => add(item?.imageUrl));
  add(fallbackUrl);
  return [...seen];
}

export function isIngredientAllowedForDiet(
  item: { category?: string; isVegetarian?: boolean; isEdible?: boolean; freshness?: string },
  dietaryPreferences?: string | null
): boolean {
  if (!item || item.isEdible === false || item.category === 'NON_FOOD') return false;
  if (item.category === 'NON_VEG' || item.isVegetarian === false || item.freshness === 'SPOILED') {
    return false;
  }
  const cat = (item.category || 'VEGAN').trim().toUpperCase();
  const diet = (dietaryPreferences || 'VEGAN').trim().toUpperCase();

  if (cat === 'LACTO') {
    return !['VEGAN', 'RAW_VEGAN', 'OVO'].includes(diet);
  }
  if (cat === 'OVO') {
    return !['VEGAN', 'RAW_VEGAN', 'LACTO'].includes(diet);
  }
  if (cat === 'LACTO_OVO' || cat === 'OVO_LACTO') {
    return !['VEGAN', 'RAW_VEGAN', 'LACTO', 'OVO'].includes(diet);
  }
  return true;
}

export function buildFridgeContextData(items: ChatFridgeScanItem[], warnings?: string[]): string {
  if (!items.length) return '';
  const itemLines = items.map((item) => {
    const qty = item.quantity != null ? `${item.quantity} ${item.unit || 'phần'}` : '1 phần';
    const freshnessTag = item.freshness === 'USABLE' ? 'Dùng sớm (ưu tiên nấu trước)' : 'Còn tươi';
    const tracked = item.isPreviouslyTracked
      ? `, đã trong tủ ${item.previousDaysInFridge ?? 0} ngày`
      : '';
    const markers = [
      item.needsLabelVerification ? 'cần kiểm tra nhãn' : '',
      item.containsFivePungent ? 'ngũ vị tân' : '',
    ].filter(Boolean);
    const markerText = markers.length > 0 ? `, ${markers.join(', ')}` : '';
    return `${item.name} (${qty}, ${freshnessTag}${tracked}${markerText})`;
  });
  const warningNote = (warnings ?? [])
    .filter((w) => w && !w.includes('ước tính từ ảnh'))
    .slice(0, 3)
    .join(' | ');
  const combined = warningNote
    ? `${itemLines.join('; ')}. Lưu ý: ${warningNote}`
    : itemLines.join('; ');
  return combined.slice(0, 1800);
}

export function buildFridgeChefInitialPrompt(items: ChatFridgeScanItem[]): string {
  if (!items.length) {
    return 'Tôi vừa quét tủ lạnh xong, Bếp trưởng hãy gợi ý giúp tôi món chay ngon phù hợp nhé!';
  }
  const visible = items.slice(0, 18);
  const summaryParts = visible.map(
    (item) => `${item.name} (${item.quantity ?? 1} ${item.unit ?? 'phần'})`
  );
  const extraCount = items.length - visible.length;
  const extraNote = extraCount > 0 ? ` và ${extraCount} nguyên liệu khác` : '';
  const priorityNames = items
    .filter((item) => item.freshness === 'USABLE' || item.isPreviouslyTracked)
    .slice(0, 8)
    .map((item) => item.name);
  const prioritySentence = priorityNames.length > 0
    ? ` Đặc biệt ưu tiên giải quyết các món cần dùng sớm/đã lưu lâu: ${priorityNames.join(', ')}.`
    : '';
  const raw = `Tôi vừa quét tủ lạnh và có các nguyên liệu: ${summaryParts.join(', ')}${extraNote}.${prioritySentence} Bếp trưởng hãy gợi ý 3 món chay ngon nhất, cân đối dinh dưỡng và hướng dẫn cách nấu chi tiết nhé!`;
  return raw.length > 1900 ? `${raw.slice(0, 1897)}...` : raw;
}

export function buildFridgeScanHandoffState(params: {
  items: ChatFridgeScanItem[];
  imageResults?: FridgeScanResponse[];
  result?: FridgeScanResponse | null;
  alreadySavedToFridge?: boolean;
}): FridgeChatHandoffState {
  const { items, imageResults, result, alreadySavedToFridge } = params;
  return {
    source: 'fridge-scan',
    title: `Quét tủ lạnh (${items.length} món)`,
    ingredients: items.map((item) => item.name),
    scanItems: items,
    scanImageUrls: collectScanImageUrls(imageResults, items, result?.scanImageUrl),
    warnings: result?.warnings ?? [],
    suggestedRecipes: result?.suggestedRecipes ?? [],
    alreadySavedToFridge: Boolean(alreadySavedToFridge),
    initialPrompt: buildFridgeChefInitialPrompt(items),
  };
}

export function mergeFridgeItems(
  existing: ChatFridgeScanItem[],
  incoming: ChatFridgeScanItem[]
): ChatFridgeScanItem[] {
  const merged = new Map<string, ChatFridgeScanItem>();
  const upsert = (item: ChatFridgeScanItem, overwrite = false) => {
    const key = item.name?.trim().toLocaleLowerCase('vi');
    if (!key) return;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...item, name: item.name.trim() });
      return;
    }
    if (overwrite) {
      merged.set(key, {
        ...prev,
        ...item,
        name: item.name.trim(),
        imageUrl: item.imageUrl || prev.imageUrl,
        matchedExistingFridgeItemId: item.matchedExistingFridgeItemId || prev.matchedExistingFridgeItemId,
      });
    }
  };
  existing.forEach((item) => upsert(item, false));
  incoming.forEach((item) => upsert(item, true));
  return [...merged.values()];
}

export const FRIDGE_UNIT_OPTIONS = [
  'phần',
  'quả',
  'củ',
  'bó',
  'cái',
  'hộp',
  'chai',
  'gói',
  'kg',
  'g',
  'ml',
] as const;

export interface QuantityInputRule {
  min: number;
  step: number;
  integerOnly: boolean;
}

export function getQuantityInputRule(unit?: string | null): QuantityInputRule {
  const normalized = (unit || 'phần').trim().toLowerCase();
  if (normalized === 'kg' || normalized === 'l' || normalized === 'lít') {
    return { min: 0.5, step: 0.5, integerOnly: false };
  }
  if (normalized === 'g' || normalized === 'gram' || normalized === 'gr' || normalized === 'ml') {
    return { min: 50, step: 50, integerOnly: true };
  }
  return { min: 1, step: 1, integerOnly: true };
}

export function normalizeQuantityForUnit(value: number, unit?: string | null): number {
  const rule = getQuantityInputRule(unit);
  if (!Number.isFinite(value) || value <= 0) {
    return rule.integerOnly ? (rule.step >= 50 ? 100 : 1) : 1;
  }
  if (rule.integerOnly) {
    return Math.max(1, Math.round(value));
  }
  return Math.max(0.1, Number(value.toFixed(1)));
}

export function adjustQuantityForUnitChange(currentQty: number | undefined, prevUnit: string | undefined, nextUnit: string): number {
  const prevRule = getQuantityInputRule(prevUnit);
  const nextRule = getQuantityInputRule(nextUnit);
  const qty = currentQty != null && Number.isFinite(currentQty) && currentQty > 0 ? currentQty : 1;

  if (nextRule.step >= 50 && prevRule.step < 50 && qty < 20) {
    return 100;
  }
  if (prevRule.step >= 50 && nextRule.step < 50 && qty >= 20) {
    return 1;
  }
  return normalizeQuantityForUnit(qty, nextUnit);
}

export function inferIngredientUnit(name: string): string {
  const lower = name.trim().toLowerCase();
  if (!lower) return 'phần';
  if (/(nước tương|xì dầu|tương ớt|tương đen|dầu ăn|dầu mè|dầu oliu|giấm|nước sốt|mắm)/.test(lower)) return 'chai';
  if (/(đậu phụ|đậu hũ|sữa chua|phô mai|bơ thực vật|tàu hũ|sữa)/.test(lower)) return 'hộp';
  if (/(nấm|miến|bún khô|mì|hạt nêm|rong biển)/.test(lower)) return 'gói';
  if (/(cà rốt|khoai|hành tây|hành tím|tỏi|gừng|nghệ|củ cải|su hào|củ dền|củ sen|\bcủ\b)/.test(lower)) return 'củ';
  if (/(cải|rau\s|xà lách|hành lá|ngò|thì là|tía tô|kinh giới|mồng tơi|\bhẹ\b)/.test(lower)) return 'bó';
  if (/(cà chua|trứng|chanh|cam|táo|chuối|dưa|\bbí\s|bơ|mướp|cà tím|ớt|xoài|thanh long)/.test(lower)) return 'quả';
  return 'phần';
}
