import { apiRequest } from './apiClient';
import type { PageResponse } from '../types/api';
import type { AdminRecipeSummary, FridgeRecipeMatchDto, FridgeRecipeMatches, RecipeDetail, RecipeFilter, RecipeInput, RecipeSummary, RecipeTag } from '../types/recipe';

export const recipeService = {
  async adminList(params: { keyword?: string; status?: string; page: number; size?: number }, signal?: AbortSignal): Promise<PageResponse<AdminRecipeSummary>> {
    const query = new URLSearchParams({ page: String(params.page), size: String(params.size ?? 10) });
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.status) query.set('status', params.status);
    const response = await apiRequest<PageResponse<AdminRecipeSummary>>(`/admin/recipes?${query}`, { signal });
    if (!response.data) throw new Error('Không thể tải danh sách công thức.');
    return response.data;
  },
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
  async matchSingle(id: string): Promise<FridgeRecipeMatchDto> {
    const response = await apiRequest<FridgeRecipeMatchDto>(`/recipes/${encodeURIComponent(id)}/fridge-match`);
    if (!response.data) throw new Error('Không thể kiểm tra độ khả thi.');
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
    // Send the token when a session exists so members also receive linked cooking videos.
    // Guests still use the same public endpoint without being forced to sign in.
    const response = await apiRequest<RecipeDetail>(`/recipes/${encodeURIComponent(id)}`, { auth: 'optional', signal });
    if (!response.data) throw new Error('Không tìm thấy công thức.');
    return response.data;
  },
};
