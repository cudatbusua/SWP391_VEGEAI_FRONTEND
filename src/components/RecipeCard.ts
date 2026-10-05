import type { Recipe } from '../types';
import { icons } from '../icons';

export function renderRecipeCard(recipe: Recipe, isSaved: boolean, userRole: 'guest' | 'authorized'): string {
  return `
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition group flex flex-col">
      
      <!-- Card Image with Badges & Bookmark -->
      <div class="relative aspect-[16/11] overflow-hidden bg-gray-100">
        <img 
          src="${recipe.image}" 
          alt="${recipe.title}" 
          class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
        
        <!-- Category Badge -->
        <div class="absolute bottom-3 left-3">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white shadow-xs">
            ${recipe.badge}
          </span>
        </div>

        <!-- Bookmark button (triggers auth modal for guest) -->
        <button 
          data-recipe-id="${recipe.id}"
          class="btn-bookmark absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm transition cursor-pointer ${isSaved ? 'text-emerald-600 fill-emerald-600' : ''}"
          title="${userRole === 'guest' ? 'Đăng nhập để lưu món' : 'Lưu món ăn'}"
        >
          ${icons.bookmark}
        </button>
      </div>

      <!-- Card Body -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            data-recipe-id="${recipe.id}"
            class="recipe-title-link font-bold text-gray-900 text-base hover:text-emerald-600 transition cursor-pointer line-clamp-1 mb-1.5"
          >
            ${recipe.title}
          </h3>
          <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
            ${recipe.description}
          </p>
        </div>

        <!-- Specs Footer -->
        <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-600 font-medium">
          <div class="flex items-center">
            ${icons.flame}
            <span>${recipe.calories} kcal</span>
          </div>
          <div class="flex items-center">
            ${icons.scale}
            <span>${recipe.protein}g Protein</span>
          </div>
          <div class="flex items-center">
            ${icons.clock}
            <span>${recipe.cookTime} phút</span>
          </div>
        </div>

      </div>

    </div>
  `;
}
