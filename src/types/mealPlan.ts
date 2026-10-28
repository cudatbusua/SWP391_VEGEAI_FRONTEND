import type { NutritionTargets } from './api';
import type { RecipeDetail } from './recipe';

export interface PlanNutrients { calories: number; protein: number; carbs: number; fat: number; fiber: number; }
export interface PlannedMeal { slot: number; recipeId: string; title: string; imageUrl?: string; portions: number; nutrition: PlanNutrients; recipe: RecipeDetail; }
export interface PlanDay { date: string; meals: PlannedMeal[]; totals: PlanNutrients; }
export interface PlanSnapshot { period: 'WEEK' | 'MONTH'; startDate: string; endDate: string; mealsPerDay: number; targets: NutritionTargets; days: PlanDay[]; warnings: string[]; }
export interface MealPlan { id: string; status: 'DRAFT' | 'SAVED'; createdAt: string; savedAt?: string; plan: PlanSnapshot; }
export interface MealPlanSummary { id: string; period: 'WEEK' | 'MONTH'; startDate: string; endDate: string; mealsPerDay: number; savedAt: string; }
export interface GenerateMealPlan { period: 'WEEK' | 'MONTH'; startDate: string; mealsPerDay: number; }

export interface SeasonalMealSuggestion {
  mealType: string;
  dishName: string;
  seasonalIngredients: string;
  healthBenefits: string;
  regionalHighlights: string;
  estimatedCalories: number;
  cookingTip: string;
  matchedRecipeId?: string;
}

export interface SeasonalRegionalResponse {
  season: 'XUAN' | 'HA' | 'THU' | 'DONG';
  seasonNameVi: string;
  region: 'MIEN_BAC' | 'MIEN_TRUNG' | 'MIEN_NAM' | 'MIEN_TAY';
  regionNameVi: string;
  climateSummary: string;
  highlightedProduce: string[];
  nutritionAdvice: string;
  suggestions: SeasonalMealSuggestion[];
  disclaimer?: string;
}
