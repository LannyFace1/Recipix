// src/components/Recipes/RecipeCard.jsx

import { Link } from 'react-router-dom';
import { Heart, Clock, ChefHat, Edit2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const DIFFICULTY_COLORS = {
  easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard:   'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
};

export default function RecipeCard({ recipe, onFavorite, onEdit }) {
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="card group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
      {/* Photo */}
      <div className="relative h-44 bg-gradient-to-br from-brand-100 to-amber-100 dark:from-gray-800 dark:to-gray-700">
        {recipe.photo_path ? (
          <img
            src={recipe.photo_path}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-40">🍽️</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={e => { e.preventDefault(); onFavorite(); }}
          className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
                     rounded-full shadow-sm hover:scale-110 transition-transform"
        >
          <Heart className={clsx('w-4 h-4 transition-colors',
            recipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'
          )} />
        </button>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
            {recipe.tags.slice(0, 2).map(tag => (
              <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: tag.color }}>
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <Link to={`/recipes/${recipe.id}`} className="block p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {recipe.title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" />
              {recipe.servings}
            </span>
          )}
          {recipe.difficulty && (
            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', DIFFICULTY_COLORS[recipe.difficulty])}>
              {recipe.difficulty}
            </span>
          )}
        </div>
      </Link>

      {/* Hover actions */}
      <div className="px-4 pb-4 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="btn-ghost text-xs py-1.5">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Source
          </a>
        )}
      </div>
    </div>
  );
}
