import { apiRequest } from './apiClient';
import type { PageResponse } from '../types/api';
import type { FridgeRecipeMatches, RecipeDetail, RecipeFilter, RecipeInput, RecipeSummary, RecipeTag } from '../types/recipe';

export const recipeService = {
  async adminDetail(id: string): Promise<RecipeDetail> {
    const response = await apiRequest<RecipeDetail>(`/admin/recipes/${encodeURIComponent(id)}`);
    if (!response.data) throw new Error('Không tìm thấy công thức.');
    return response.data;
  },
  async adminTags(): Promise<RecipeTag[]> {
    const response = await apiRequest<RecipeTag[]>('/admin/tags');
    if (!response.data) throw new Error('Không thể tải thẻ phân loại.');
    return response.data;
  },
  async createTag(input: { code: string; name: string; group: string; description: string }): Promise<void> {
    await apiRequest('/admin/tags', { method: 'POST', body: input });
  },
  async removeTag(id: string): Promise<void> {
    await apiRequest(`/admin/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async matchFridge(): Promise<FridgeRecipeMatches> {
    const response = await apiRequest<FridgeRecipeMatches>('/recipes/fridge-match?minMatchPercentage=50&limit=20');
    if (!response.data) throw new Error('Không thể gợi ý món từ tủ lạnh.');
    return response.data;
  },
  async save(input: RecipeInput, id?: string): Promise<RecipeDetail> {
    const response = await apiRequest<RecipeDetail>(id ? `/admin/recipes/${encodeURIComponent(id)}` : '/admin/recipes', {
      method: id ? 'PUT' : 'POST', body: input,
    });
    if (!response.data) throw new Error('Không thể lưu công thức.');
    return response.data;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/admin/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async filter(filter: RecipeFilter, signal?: AbortSignal): Promise<PageResponse<RecipeSummary>> {
    const response = await apiRequest<PageResponse<RecipeSummary>>('/recipes/filter', {
      method: 'POST', auth: 'none', body: filter, signal,
    });
    if (!response.data) throw new Error('Không thể tải công thức.');
    return response.data;
  },
  async tags(signal?: AbortSignal): Promise<Record<string, RecipeTag[]>> {
    const response = await apiRequest<Record<string, RecipeTag[]>>('/recipes/tags', { auth: 'none', signal });
    if (!response.data) throw new Error('Không thể tải bộ lọc.');
    return response.data;
  },
  async detail(id: string, signal?: AbortSignal): Promise<RecipeDetail> {
    const response = await apiRequest<RecipeDetail>(`/recipes/${encodeURIComponent(id)}`, { auth: 'none', signal });
    if (!response.data) throw new Error('Không tìm thấy công thức.');
    return response.data;
  },
};
