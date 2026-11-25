import type { FridgeScanResponse } from '../../types/api';
import type { StorageLike } from './chatSessionStore';
import { safeChatImageUrl } from './fridgeChatBridge';

export const FRIDGE_SCAN_DRAFT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface PersistedFridgeScanImage {
  id: string;
  name: string;
  size?: number;
  preview: string;
}

export interface FridgeScanDraft {
  result: FridgeScanResponse;
  imageResults: FridgeScanResponse[];
  images: PersistedFridgeScanImage[];
  ingredients: FridgeScanResponse['ingredients'];
  activeImageIndex: number;
  savedAt: number;
}

export function fridgeScanDraftKey(userId?: string | null): string | null {
  const id = typeof userId === 'string' ? userId.trim() : '';
  return id ? `vegeai:fridge-scan:draft:v1:${id}` : null;
}

export function sanitizePersistedScanPreview(candidate?: string | null): string {
  const safe = safeChatImageUrl(candidate);
  if (!safe || safe.startsWith('data:')) {
    return '';
  }
  return safe;
}

export function clearFridgeScanDraft(
  storage: StorageLike | null | undefined,
  userId?: string | null
): void {
  const key = fridgeScanDraftKey(userId);
  if (!storage || !key) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage errors in restricted environments
  }
}

export function writeFridgeScanDraft(
  storage: StorageLike | null | undefined,
  userId: string | null | undefined,
  draft: Omit<FridgeScanDraft, 'savedAt'>,
  now = Date.now()
): void {
  const key = fridgeScanDraftKey(userId);
  if (!storage || !key) return;

  if (!draft.result || !Array.isArray(draft.ingredients) || draft.ingredients.length === 0) {
    clearFridgeScanDraft(storage, userId);
    return;
  }

  const safeImageResults = Array.isArray(draft.imageResults) ? draft.imageResults : [];
  const safeImages: PersistedFridgeScanImage[] = (Array.isArray(draft.images) ? draft.images : []).map(
    (img, index) => ({
      id: typeof img.id === 'string' && img.id.trim() ? img.id : `restored-img-${index}`,
      name: typeof img.name === 'string' && img.name.trim() ? img.name.trim() : `Ảnh ${index + 1}`,
      ...(typeof img.size === 'number' && Number.isFinite(img.size) && img.size > 0
        ? { size: img.size }
        : {}),
      preview:
        sanitizePersistedScanPreview(img.preview) ||
        sanitizePersistedScanPreview(safeImageResults[index]?.scanImageUrl),
    })
  );

  const clampedIndex =
    safeImages.length > 0
      ? Math.max(0, Math.min(Math.trunc(draft.activeImageIndex || 0), safeImages.length - 1))
      : 0;

  const payload: FridgeScanDraft = {
    result: draft.result,
    imageResults: safeImageResults,
    images: safeImages,
    ingredients: draft.ingredients,
    activeImageIndex: clampedIndex,
    savedAt: now,
  };

  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    // Storage quota or private browsing must never interrupt scanning
  }
}

export function readFridgeScanDraft(
  storage: StorageLike | null | undefined,
  userId: string | null | undefined,
  now = Date.now()
): FridgeScanDraft | null {
  const key = fridgeScanDraftKey(userId);
  if (!storage || !key) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FridgeScanDraft> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.savedAt !== 'number' ||
      !Number.isFinite(parsed.savedAt) ||
      now - parsed.savedAt > FRIDGE_SCAN_DRAFT_TTL_MS ||
      parsed.savedAt - now > 60_000
    ) {
      clearFridgeScanDraft(storage, userId);
      return null;
    }

    if (
      !parsed.result ||
      typeof parsed.result !== 'object' ||
      typeof parsed.result.scannedAt !== 'string' ||
      !Array.isArray(parsed.ingredients) ||
      parsed.ingredients.length === 0
    ) {
      clearFridgeScanDraft(storage, userId);
      return null;
    }

    const imageResults = Array.isArray(parsed.imageResults)
      ? parsed.imageResults.filter((item): item is FridgeScanResponse => Boolean(item && typeof item === 'object'))
      : [];

    const images: PersistedFridgeScanImage[] = (Array.isArray(parsed.images) ? parsed.images : [])
      .filter((item): item is PersistedFridgeScanImage => Boolean(item && typeof item === 'object'))
      .map((img, index) => ({
        id: typeof img.id === 'string' && img.id.trim() ? img.id : `restored-img-${index}`,
        name: typeof img.name === 'string' && img.name.trim() ? img.name.trim() : `Ảnh ${index + 1}`,
        ...(typeof img.size === 'number' && Number.isFinite(img.size) && img.size > 0
          ? { size: img.size }
          : {}),
        preview:
          sanitizePersistedScanPreview(img.preview) ||
          sanitizePersistedScanPreview(imageResults[index]?.scanImageUrl),
      }));

    const activeImageIndex =
      images.length > 0
        ? Math.max(0, Math.min(Math.trunc(parsed.activeImageIndex ?? 0), images.length - 1))
        : 0;

    return {
      result: parsed.result as FridgeScanResponse,
      imageResults,
      images,
      ingredients: parsed.ingredients,
      activeImageIndex,
      savedAt: parsed.savedAt,
    };
  } catch {
    clearFridgeScanDraft(storage, userId);
    return null;
  }
}
