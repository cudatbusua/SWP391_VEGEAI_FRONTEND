import type { NutritionTargets } from './api';
import type { RecipeDetail } from './recipe';
export interface PlanNutrients { calories: number; protein: number; carbs: number; fat: number; fiber: number; }
export interface PlannedMeal { slot: number; recipeId: string; title: string; imageUrl?: string; portions: number; nutrition: PlanNutrients; recipe: RecipeDetail; }
export interface PlanDay { date: string; meals: PlannedMeal[]; totals: PlanNutrients; }
export interface PlanSnapshot { period: 'WEEK' | 'MONTH'; startDate: string; endDate: string; mealsPerDay: number; targets: NutritionTargets; days: PlanDay[]; warnings: string[]; }
export interface MealPlan { id: string; status: 'DRAFT' | 'SAVED'; createdAt: string; savedAt?: string; plan: PlanSnapshot; }
export interface MealPlanSummary { id: string; period: 'WEEK' | 'MONTH'; startDate: string; endDate: string; mealsPerDay: number; savedAt: string; totalDays: number; visibleDays: number; firstVisibleDate: string; lastVisibleDate: string; }
export interface MealCalendarDay { date: string; planId: string; period: 'WEEK' | 'MONTH'; targets: NutritionTargets; meals: PlannedMeal[]; totals: PlanNutrients; }
export interface GenerateMealPlan { period: 'WEEK' | 'MONTH'; startDate: string; mealsPerDay: number; }
export type Season = 'XUAN' | 'HA' | 'THU' | 'DONG';
export type Region = 'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM' | 'MIEN_TAY';
export interface SeasonalMealSuggestion { mealType: string; dishName: string; seasonalIngredients: string; healthBenefits: string; regionalHighlights: string; estimatedCalories: number; cookingTip: string; recipeId?: string | null; }
export interface SeasonalRegionalResponse { season: Season; seasonNameVi: string; region: Region; regionNameVi: string; climateSummary: string; highlightedProduce: string[]; nutritionAdvice: string; suggestions: SeasonalMealSuggestion[]; source: 'AI' | 'CURATED'; notice?: string | null; }
