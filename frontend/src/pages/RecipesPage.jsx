// src/pages/RecipesPage.jsx — Recipe library with search, filters, import

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Link, Heart, Filter, Star } from 'lucide-react';
import { recipesApi } from '../api/client';
import RecipeCard from '../components/Recipes/RecipeCard';
import RecipeFormModal from '../components/Recipes/RecipeFormModal';
import ImportModal from '../components/Recipes/ImportModal';

export default function RecipesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ favorite: false, difficulty: '' });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editRecipe, setEditRecipe] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['recipes', search, filter],
    queryFn: () => recipesApi.list({
      search: search || undefined,
      favorite: filter.favorite ? 'true' : undefined,
      difficulty: filter.difficulty || undefined,
    }).then(r => r.data),
  });

  const favMutation = useMutation({
    mutationFn: (id) => recipesApi.favorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const recipes = data?.recipes || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Recipes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary flex-1 sm:flex-none justify-center">
            <Link className="w-4 h-4" /> Import URL
          </button>
          <button onClick={() => { setEditRecipe(null); setShowForm(true); }} className="btn-primary flex-1 sm:flex-none justify-center">
            <Plus className="w-4 h-4" /> New Recipe
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={filter.difficulty}
          onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}
          className="input w-auto"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button
          onClick={() => setFilter(f => ({ ...f, favorite: !f.favorite }))}
          className={`btn-secondary gap-2 ${filter.favorite ? 'border-brand-400 text-brand-600 bg-brand-50 dark:bg-brand-900/20' : ''}`}
        >
          <Heart className={`w-4 h-4 ${filter.favorite ? 'fill-brand-500 text-brand-500' : ''}`} />
          Favorites
        </button>
      </div>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-64 animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-brand-100 dark:bg-brand-900/20 rounded-3xl flex items-center justify-center mb-4">
            <span className="text-5xl">🥘</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search || filter.favorite || filter.difficulty ? 'No recipes found' : 'No recipes yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            {search ? 'Try a different search term.' : 'Add your first recipe manually or import from a URL.'}
          </p>
          {!search && (
            <div className="flex gap-3">
              <button onClick={() => setShowImport(true)} className="btn-secondary">
                <Link className="w-4 h-4" /> Import from URL
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Recipe
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavorite={() => favMutation.mutate(recipe.id)}
              onEdit={() => { setEditRecipe(recipe); setShowForm(true); }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <RecipeFormModal
          recipe={editRecipe}
          onClose={() => { setShowForm(false); setEditRecipe(null); }}
          onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['recipes'] }); }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(recipe) => {
            setShowImport(false);
            setEditRecipe(recipe);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
