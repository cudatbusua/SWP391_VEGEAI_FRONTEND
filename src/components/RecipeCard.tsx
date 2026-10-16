import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Flame, BadgeCheck } from 'lucide-react';
import { RecipeImage } from './RecipeImage';
import type { RecipeSummary } from '../types/recipe';

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const tags = recipe.tags ?? [];
  const label = tags.find(tag => tag.group === 'DIETARY_TYPE')?.name || 'Món chay';
  const difficulty = { EASY: 'Dễ thực hiện', MEDIUM: 'Vừa sức', HARD: 'Thử thách' }[recipe.difficulty];
  return <Link to={'/recipe/' + recipe.recipeId} className="recipe-card">
    <div className="recipe-card-photo"><RecipeImage src={recipe.imageUrl} title={recipe.title} /><span className="recipe-card-badge">{label}</span>{recipe.isVerified && <span className="recipe-card-verified" title="Đã kiểm duyệt"><BadgeCheck size={18} /></span>}</div>
    <div className="recipe-card-body"><div className="recipe-card-kicker"><span>{difficulty || 'Công thức chay'}</span><span>{recipe.cookTimeMinutes != null ? recipe.cookTimeMinutes + ' phút' : ''}</span></div><h3>{recipe.title}<ArrowUpRight size={20} /></h3><p className="recipe-card-tags">{tags.filter(tag => tag.group === 'NUTRITION_GOAL' || tag.group === 'COOKING_METHOD').slice(0, 2).map(tag => tag.name).join(' · ') || 'Hương vị từ thực vật'}</p><div className="recipe-card-meta"><span><Flame size={15} />{recipe.calories ?? '--'} kcal</span><span>{recipe.proteinGrams ?? '--'} g đạm</span><span><Clock size={15} />{recipe.cookTimeMinutes ?? '--'} phút</span></div></div>
  </Link>;
}
