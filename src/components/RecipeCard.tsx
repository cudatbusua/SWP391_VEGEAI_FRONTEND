import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Flame, BadgeCheck, Sparkles } from 'lucide-react';
import { RecipeImage } from './RecipeImage';
import type { RecipeSummary } from '../types/recipe';

interface RecipeCardProps {
  recipe: RecipeSummary;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, className = '' }) => {
  const tags = recipe.tags ?? [];
  const label = tags.find(tag => tag.group === 'DIETARY_TYPE')?.name || 'Món chay';
  const difficulty = { EASY: 'Dễ nấu', MEDIUM: 'Vừa sức', HARD: 'Kỳ công' }[recipe.difficulty] || 'Dễ nấu';
  const goalTag = tags.find(tag => tag.group === 'NUTRITION_GOAL')?.name;

  return (
    <Link
      to={'/recipe/' + recipe.recipeId}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#131d27] border border-stone-200/80 dark:border-slate-800/80 hover:border-emerald-500/70 dark:hover:border-emerald-500/60 shadow-xs hover:shadow-lg transition-all duration-300 ${className}`}
    >
      {/* Food Photography Container */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-stone-100 dark:bg-slate-800">
        <div className="w-full h-full transform transition-transform duration-500 ease-out group-hover:scale-105">
          <RecipeImage src={recipe.imageUrl} title={recipe.title} />
        </div>

        {/* Dietary Label Pill */}
        <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/95 dark:bg-[#0c1219]/90 text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-xs border border-stone-200/50 dark:border-slate-700/50">
          {label}
        </span>

        {/* Verified Badge */}
        {recipe.isVerified && (
          <span
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/95 dark:bg-[#0c1219]/90 text-emerald-600 dark:text-emerald-400 backdrop-blur-md flex items-center justify-center shadow-xs border border-stone-200/50 dark:border-slate-700/50"
            title="Công thức đã kiểm duyệt chuẩn dinh dưỡng"
          >
            <BadgeCheck className="w-4 h-4" />
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-slate-400 mb-1.5">
            <span>{difficulty}</span>
            {recipe.cookTimeMinutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                {recipe.cookTimeMinutes} phút
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {recipe.title}
          </h3>

          {goalTag && (
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {goalTag}
            </p>
          )}
        </div>

        {/* Nutrition Footer Meta */}
        <div className="pt-3 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-stone-600 dark:text-slate-300 font-medium">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <strong className="font-bold text-stone-800 dark:text-slate-200">{recipe.calories ?? '--'}</strong> kcal
          </span>
          <span>·</span>
          <span>
            <strong className="font-bold text-stone-800 dark:text-slate-200">{recipe.proteinGrams ?? '--'}g</strong> đạm
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default RecipeCard;
