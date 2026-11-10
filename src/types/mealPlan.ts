import type { NutritionTargets } from './api';
import type { RecipeDetail } from './recipe';
export interface PlanNutrients { calories: number; protein: number; carbs: number; fat: number; fiber: number; }
export interface PlannedMeal { slot: number; recipeId: string; title: string; imageUrl?: string; portions: number; nutrition: PlanNutrients; recipe: RecipeDetail; }
export interface PlanDay { date: string; meals: PlannedMeal[]; totals: PlanNutrients; }
export type MealPlanPeriod = 'WEEK' | 'MONTH' | 'CUSTOM';
export interface PlanSnapshot { period: MealPlanPeriod; startDate: string; endDate: string; mealsPerDay: number; targets: NutritionTargets; days: PlanDay[]; warnings: string[]; }
export interface MealPlan { id: string; status: 'DRAFT' | 'SAVED'; createdAt: string; savedAt?: string; plan: PlanSnapshot; needsReview: boolean; }
export interface MealPlanSummary { id: string; period: MealPlanPeriod; startDate: string; endDate: string; mealsPerDay: number; savedAt: string; totalDays: number; visibleDays: number; firstVisibleDate: string; lastVisibleDate: string; needsReview: boolean; }
export interface MealCalendarDay { date: string; planId: string; period: MealPlanPeriod; targets: NutritionTargets; meals: PlannedMeal[]; totals: PlanNutrients; needsReview: boolean; }
export interface RecordedMeal { id: string; date: string; slot: number; planId: string; recipeId: string; title: string; portions: number; nutrition: PlanNutrients; recordedAt: string; }
export interface DailyIntake { date: string; meals: RecordedMeal[]; totals: PlanNutrients; }
export interface GenerateMealPlan { period: MealPlanPeriod; startDate: string; mealsPerDay: number; days?: number; }
export type Season = 'XUAN' | 'HA' | 'THU' | 'DONG';
export type Region = 'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM';
export interface SeasonalMealSuggestion { mealType: string; dishName: string; seasonalIngredients: string; healthBenefits: string; regionalHighlights: string; estimatedCalories: number; cookingTip: string; recipeId?: string | null; }
export interface SeasonalRegionalResponse { season: Season; seasonNameVi: string; region: Region; regionNameVi: string; climateSummary: string; highlightedProduce: string[]; nutritionAdvice: string; suggestions: SeasonalMealSuggestion[]; source: 'AI' | 'CURATED'; notice?: string | null; }
