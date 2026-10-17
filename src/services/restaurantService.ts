import { apiRequest } from './apiClient';

export type PlaceCategory = 'ALL' | 'RESTAURANT' | 'SUPERMARKET' | 'GROCERY_STORE' | 'DIEN_MAY_XANH';
export interface Coordinates { lat: number; lon: number; }
export interface Place {
  id: string; name: string; lat: number; lon: number; distance: number; address: string;
  category: PlaceCategory; rating?: number; openNow?: boolean; photoUrl?: string; googleMapsUrl?: string;
  phoneNumber?: string; isVerified?: boolean; isSample: boolean;
}
export interface PlaceInput {
  name: string;
  category: PlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  isOpenNow?: boolean;
  photoUrl?: string;
  phoneNumber?: string;
  isVerified?: boolean;
}
interface BackendPlace {
  placeId: string; name: string; latitude: number; longitude: number; distanceKm?: number;
  address?: string; category: PlaceCategory; rating?: number; isOpenNow?: boolean; openNow?: boolean;
  photoUrl?: string; googleMapsUrl?: string; phoneNumber?: string; isVerified?: boolean;
}
function mapPlaces(values: BackendPlace[]): Place[] {
  return values.filter(value => Number.isFinite(value.latitude) && Number.isFinite(value.longitude)).map(value => ({
    id: value.placeId, name: value.name, lat: value.latitude, lon: value.longitude,
    distance: value.distanceKm ?? 0, address: value.address || '', category: value.category,
    rating: value.rating, openNow: value.isOpenNow ?? value.openNow, photoUrl: value.photoUrl, googleMapsUrl: value.googleMapsUrl,
    phoneNumber: value.phoneNumber, isVerified: value.isVerified,
    isSample: value.placeId.startsWith('mock_'),
  })).sort((a, b) => a.distance - b.distance);
}
export const restaurantService = {
  async categories(): Promise<{ category: PlaceCategory; displayName: string }[]> {
    const response = await apiRequest<{ category: PlaceCategory; displayName: string }[]>('/places/categories', { auth: 'none' });
    if (!response.data) throw new Error('Không thể tải danh mục địa điểm.');
    return response.data;
  },
  async listAll(category: PlaceCategory = 'ALL', keyword?: string, center?: Coordinates): Promise<Place[]> {
    const params = new URLSearchParams({ category });
    if (keyword?.trim()) params.set('keyword', keyword.trim());
    if (center) { params.set('lat', String(center.lat)); params.set('lng', String(center.lon)); }
    const response = await apiRequest<BackendPlace[]>('/places?' + params, { auth: 'none', timeoutMs: 45000 });
    if (!response.data) throw new Error('Không thể tải danh sách địa điểm trên bản đồ.');
    return mapPlaces(response.data);
  },
  async search(query: string, center?: Coordinates, radius = 10): Promise<Place[]> {
    const params = new URLSearchParams({ query: query.trim(), radius: String(radius * 1000) });
    if (center) { params.set('lat', String(center.lat)); params.set('lng', String(center.lon)); }
    const response = await apiRequest<BackendPlace[]>('/places/search?' + params, { auth: 'none', timeoutMs: 45000 });
    if (!response.data) throw new Error('Không thể tìm địa điểm.');
    return mapPlaces(response.data);
  },
  async nearby(center: Coordinates, radius: number, category: PlaceCategory = 'ALL'): Promise<Place[]> {
    const params = new URLSearchParams({ lat: String(center.lat), lng: String(center.lon), radius: String(radius * 1000), category });
    const response = await apiRequest<BackendPlace[]>('/places/nearby?' + params, { auth: 'none', timeoutMs: 45000 });
    if (!response.data) throw new Error('Không thể tìm địa điểm quanh bạn.');
    return mapPlaces(response.data);
  },
  async createPlace(input: PlaceInput): Promise<Place> {
    const response = await apiRequest<BackendPlace>('/admin/places', { method: 'POST', body: input });
    if (!response.data) throw new Error('Không thể thêm địa điểm mới.');
    return mapPlaces([response.data])[0];
  },
  async updatePlace(placeId: string, input: PlaceInput): Promise<Place> {
    const response = await apiRequest<BackendPlace>('/admin/places/' + encodeURIComponent(placeId), { method: 'PUT', body: input });
    if (!response.data) throw new Error('Không thể cập nhật địa điểm.');
    return mapPlaces([response.data])[0];
  },
  async deletePlace(placeId: string): Promise<void> {
    await apiRequest('/admin/places/' + encodeURIComponent(placeId), { method: 'DELETE' });
  },
};
