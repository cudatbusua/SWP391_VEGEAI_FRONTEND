import type { CommunityVideo } from './community';
export interface RecipeTag { tagId: string; code: string; name: string; group: string; description?: string; }
export interface RecipeSummary {
  recipeId: string; title: string; slug: string; imageUrl?: string;
  cookTimeMinutes?: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  calories?: number; proteinGrams?: number; isVerified: boolean; tags: RecipeTag[];
}
export interface AdminRecipeSummary extends Omit<RecipeSummary, 'isVerified'> {
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
}
export interface RecipeDetail extends RecipeSummary {
  description?: string; prepTimeMinutes?: number; servings?: number;
  carbsGrams?: number; fatGrams?: number; fiberGrams?: number;
  ingredients: { ingredientId?: string; name: string; amount?: number; unit?: string; allergenType?: string; }[];
  instructions: string[]; status: string; videos?: CommunityVideo[];
}
export interface RecipeFilter {
  keyword?: string; includeTagCodes?: string[]; excludeTagCodes?: string[];
  inclusionMode?: 'AND' | 'OR'; maxCookTime?: number; maxCalories?: number;
  minProtein?: number; difficulty?: string; sortBy?: string; sortDirection?: string;
  page: number; size: number;
}
export interface FridgeRecipeMatches {
  totalRecipesEvaluated: number; canCookNowCount: number; missingFewCount: number;
  matchedRecipes: { recipe: RecipeSummary; matchPercentage: number; matchGroup: string;
    availableInFridge: string[]; missingIngredients: string[]; recommendation: string; }[];
}
export interface RecipeInput {
  title: string; description: string; imageUrl: string; difficulty: RecipeSummary['difficulty'];
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'; prepTimeMinutes?: number; cookTimeMinutes?: number;
  servings?: number; calories?: number; proteinGrams?: number; carbsGrams?: number; fatGrams?: number; fiberGrams?: number;
  ingredients: RecipeDetail['ingredients']; instructions: string[]; tagCodes: string[]; videoIds?: string[];
}
