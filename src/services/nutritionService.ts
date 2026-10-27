import { apiRequest } from './apiClient';
import type { NutritionCalculateInput, NutritionOptions, NutritionProfile, NutritionProfileInput, NutritionTargets } from '../types/api';

export const nutritionService = {
  async getProfile(signal?: AbortSignal): Promise<NutritionProfile> {
    const response = await apiRequest<NutritionProfile>('/nutrition/profile', { signal });
    if (!response.data) throw new Error('Bạn chưa thiết lập hồ sơ dinh dưỡng.');
    return response.data;
  },
  async saveProfile(input: NutritionProfileInput): Promise<NutritionProfile> {
    const response = await apiRequest<NutritionProfile>('/nutrition/profile', { method: 'PUT', body: input });
    if (!response.data) throw new Error('Không thể lưu hồ sơ dinh dưỡng.');
    return response.data;
  },
  async deleteProfile(): Promise<void> {
    await apiRequest('/nutrition/profile', { method: 'DELETE' });
  },
  async calculate(input: NutritionCalculateInput): Promise<NutritionTargets> {
    const response = await apiRequest<NutritionTargets>('/nutrition/calculate', { method: 'POST', body: input });
    if (!response.data) throw new Error('Không thể tính mục tiêu dinh dưỡng.');
    return response.data;
  },
  async options(): Promise<NutritionOptions> {
    const response = await apiRequest<NutritionOptions>('/nutrition/options');
    if (!response.data) throw new Error('Không thể tải lựa chọn dinh dưỡng.');
    return response.data;
  },
};
