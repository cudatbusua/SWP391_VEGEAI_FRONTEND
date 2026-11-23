import { apiRequest } from './apiClient';
import type {
  ConfirmFridgeScanResponse,
  FreshnessStatus,
  FridgeItem,
  FridgeItemInput,
  FridgeItemStatus,
  FridgeScanResponse,
} from '../types/api';

export function parseShelfLifeDays(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  const match = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return undefined;
  const num = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) return undefined;
  if (/(tháng|month)/.test(normalized)) return Math.max(1, Math.round(num * 30));
  if (/(tuần|tuan|week)/.test(normalized)) return Math.max(1, Math.round(num * 7));
  if (/(giờ|gio|hour|\bh\b)/.test(normalized)) return Math.max(1, Math.round(num / 24));
  return Math.max(1, Math.round(num));
}

export const fridgeService = {
  async list(status?: FridgeItemStatus): Promise<FridgeItem[]> {
    const query = status ? `?status=${status}` : '';
    const response = await apiRequest<FridgeItem[]>(`/fridge/items${query}`);
    return response.data ?? [];
  },
  async expiringSoon(days = 2): Promise<FridgeItem[]> {
    const response = await apiRequest<FridgeItem[]>(`/fridge/expiring-soon?days=${days}`);
    return response.data ?? [];
  },
  async summary() {
    const response = await apiRequest<import('../types/api').FridgeSummary>('/fridge/summary');
    if (!response.data) throw new Error('Không thể tải tổng quan tủ lạnh.');
    return response.data;
  },
  async add(input: FridgeItemInput): Promise<FridgeItem> {
    const response = await apiRequest<FridgeItem>('/fridge/items', { method: 'POST', body: input });
    if (!response.data) throw new Error('Không thể thêm nguyên liệu.');
    return response.data;
  },
  async update(id: string, input: FridgeItemInput): Promise<FridgeItem> {
    const response = await apiRequest<FridgeItem>(`/fridge/items/${id}`, { method: 'PUT', body: input });
    if (!response.data) throw new Error('Không thể cập nhật nguyên liệu.');
    return response.data;
  },
  async updateStatus(id: string, status: FridgeItemStatus): Promise<FridgeItem> {
    const response = await apiRequest<FridgeItem>(`/fridge/items/${id}/status`, { method: 'PATCH', body: { status } });
    if (!response.data) throw new Error('Không thể cập nhật trạng thái.');
    return response.data;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/fridge/items/${id}`, { method: 'DELETE' });
  },
  async confirmScan(scan: FridgeScanResponse): Promise<ConfirmFridgeScanResponse> {
    const response = await apiRequest<ConfirmFridgeScanResponse>('/fridge/confirm-items', {
      method: 'POST',
      body: {
        items: scan.ingredients.map(item => ({
          name: item.name,
          category: item.category || 'VEGAN',
          isVegetarian: item.isVegetarian,
          quantity: item.quantity ?? 1,
          unit: item.unit || 'phần',
          freshnessStatus: (item.freshness || 'FRESH') as FreshnessStatus,
          freshnessScore: item.freshnessScore,
          estimatedShelfLifeDays: parseShelfLifeDays(item.shelfLifeEstimate),
          storageTip: item.storageTip,
          notes: item.visualSigns,
          confidence: item.confidence,
          imageUrl: item.imageUrl || scan.scanImageUrl,
          ...(item.matchedExistingFridgeItemId
            ? { matchedExistingFridgeItemId: item.matchedExistingFridgeItemId }
            : {}),
        })),
      },
    });
    if (!response.data) throw new Error('Không thể lưu kết quả quét vào tủ lạnh.');
    return response.data;
  },
};
