import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { VideoPlayer } from './CommunityUi';
import type { PlannedMeal } from '../types/mealPlan';
import '../styles/meal-plan.css';

/** Collapsible ingredients (scaled to the planned portions), steps and linked videos of a planned meal. */
export function PlannedMealDetails({ meal }: { meal: PlannedMeal }) {
  const [open, setOpen] = useState(false);
  const factor = meal.portions / Math.max(1, meal.recipe.servings || 1);
  return (
    <div className="planned-details">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Nguyên liệu & cách nấu
        <ChevronDown size={16} className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div>
          <ul>
            {meal.recipe.ingredients.map((item, index) => (
              <li key={index}>
                <span>{item.name}</span>
                <strong>
                  {item.amount == null ? '--' : Math.round(item.amount * factor * 10) / 10} {item.unit}
                </strong>
              </li>
            ))}
          </ul>
          <ol>
            {meal.recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          {meal.recipe.videos?.map(video => (
            <div key={video.id} className="planned-video">
              <h4>{video.title}</h4>
              <VideoPlayer video={video} />
            </div>
          ))}
          <Link to={'/recipe/' + meal.recipeId}>
            Công thức gốc
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
