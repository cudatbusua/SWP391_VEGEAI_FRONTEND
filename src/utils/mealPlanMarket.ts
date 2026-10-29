import { fridgeService } from '../services/fridgeService';
import type { PlannedMeal } from '../types/mealPlan';

export interface MarketImportItem {
  id: string;
  name: string;
  amount: string;
  category: string;
  categoryLabel: string;
  mealNote: string;
  checked: boolean;
}

/**
 * Collects the distinct recipe ingredients of the given meals and drops those already in the
 * active fridge, producing items for the Smart Market page (`navigate('/smart-market', { state })`).
 */
export async function missingMarketItems(meals: PlannedMeal[], note: string): Promise<MarketImportItem[]> {
  const ingredientMap = new Map<string, { name: string; amount?: number; unit?: string }>();
  for (const meal of meals) {
    for (const ing of meal.recipe.ingredients) {
      const key = ing.name.trim().toLowerCase();
      if (!ingredientMap.has(key)) ingredientMap.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit });
    }
  }

  let stockedNames = new Set<string>();
  try {
    const fridgeItems = await fridgeService.list('ACTIVE');
    stockedNames = new Set(fridgeItems.map(f => f.name.trim().toLowerCase()));
  } catch {
    // ignore network errors for fridge check
  }

  const missingItems: MarketImportItem[] = [];
  ingredientMap.forEach(({ name, amount, unit }, key) => {
    const isStocked = Array.from(stockedNames).some(st => key.includes(st) || st.includes(key));
    if (!isStocked) {
      missingItems.push({
        id: 'plan-' + Math.random().toString(36).substring(2, 9),
        name,
        amount: amount ? `${amount} ${unit || ''}`.trim() : 'Theo định lượng',
        category: 'produce',
        categoryLabel: 'Rau củ & Quả tươi',
        mealNote: note,
        checked: false,
      });
    }
  });
  return missingItems;
}
