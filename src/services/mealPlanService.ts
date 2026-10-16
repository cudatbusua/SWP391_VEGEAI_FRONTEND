import { apiRequest } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/api';
import type { GenerateMealPlan, MealPlan, MealPlanSummary } from '../types/mealPlan';
import type { RecipeSummary } from '../types/recipe';
function data<T>(response: ApiResponse<T>): T {
  if (response.data == null) throw new Error('Máy chủ chưa trả về dữ liệu kế hoạch.');
  return response.data;
}
const id = encodeURIComponent;
export const mealPlanService = {
  async generate(input: GenerateMealPlan) { return data(await apiRequest<MealPlan>('/meal-plans/generate', { method: 'POST', body: input, timeoutMs: 90000 })); },
  async get(planId: string, signal?: AbortSignal) { return data(await apiRequest<MealPlan>('/meal-plans/' + id(planId), { signal })); },
  async list(page = 0, signal?: AbortSignal) { return data(await apiRequest<PageResponse<MealPlanSummary>>('/meal-plans?page=' + page + '&size=5', { signal })); },
  async options(planId: string, signal?: AbortSignal) { return data(await apiRequest<RecipeSummary[]>('/meal-plans/' + id(planId) + '/options', { signal })); },
  async swap(planId: string, day: number, slot: number, recipeId: string) { return data(await apiRequest<MealPlan>('/meal-plans/' + id(planId) + '/days/' + day + '/meals/' + slot, { method: 'PUT', body: { recipeId } })); },
  async save(planId: string) { return data(await apiRequest<MealPlan>('/meal-plans/' + id(planId) + '/save', { method: 'POST' })); },
};
