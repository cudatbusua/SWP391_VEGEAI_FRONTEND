import { apiRequest } from './apiClient';
import type { PageResponse } from '../types/api';

export interface CookbookRecipe {
  id: string;
  title: string;
  description?: string;
  cookTimeMinutes?: number;
  difficulty?: string;
  estimatedCalories?: number;
  dietaryType?: string;
  ingredients?: string[];
  instructions?: string[];
  safetyNotes?: string[];
  aiGenerated?: boolean;
  sourceImage?: string;
  userNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveCookbookRecipeInput {
  title: string;
  description?: string;
  cookTimeMinutes?: number;
  difficulty?: string;
  estimatedCalories?: number;
  dietaryType?: string;
  ingredients?: string[];
  instructions?: string[];
  safetyNotes?: string[];
  aiGenerated?: boolean;
  sourceImage?: string;
  userNotes?: string;
}

export const cookbookService = {
  async save(input: SaveCookbookRecipeInput): Promise<CookbookRecipe> {
    const response = await apiRequest<CookbookRecipe>('/recipes/cookbook', {
      method: 'POST',
      body: input,
    });
    if (!response.data) throw new Error('Không thể lưu công thức vào sổ tay.');
    return response.data;
  },

  async list(page = 0, size = 12, keyword?: string): Promise<PageResponse<CookbookRecipe>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (keyword?.trim()) params.set('keyword', keyword.trim());
    const response = await apiRequest<PageResponse<CookbookRecipe>>(`/recipes/cookbook?${params}`);
    if (!response.data) throw new Error('Không thể tải sổ tay món ăn.');
    return response.data;
  },

  async detail(id: string): Promise<CookbookRecipe> {
    const response = await apiRequest<CookbookRecipe>(`/recipes/cookbook/${encodeURIComponent(id)}`);
    if (!response.data) throw new Error('Không tìm thấy công thức trong sổ tay.');
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiRequest(`/recipes/cookbook/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
