import { apiRequest } from './apiClient';

export interface MarketCartItem {
  id: string;
  catalogItemId: string;
  name: string;
  price: number;
  priceFormatted: string;
  unit: string;
  imageEmoji: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeCategory: string;
  count: number;
}

interface CartResponse { items: MarketCartItem[] }

export const marketCartService = {
  async get(): Promise<MarketCartItem[]> {
    const response = await apiRequest<CartResponse>('/market/cart');
    return response.data?.items ?? [];
  },
  async replace(items: MarketCartItem[]): Promise<MarketCartItem[]> {
    const response = await apiRequest<CartResponse>('/market/cart', { method: 'PUT', body: { items } });
    return response.data?.items ?? [];
  },
};
