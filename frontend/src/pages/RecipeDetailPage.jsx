// src/pages/RecipeDetailPage.jsx — Full recipe view with scaling, timers, unit conversion

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/client';
import {
  ArrowLeft, Clock, Users, ChefHat, Heart, ExternalLink, Edit2, Trash2,
  Timer, Plus, Minus, Scale, Repeat, Globe
} from 'lucide-react';
import clsx from 'clsx';

// ── Timer component (per step) ─────────────────────────────────────────────────
function StepTimer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); setDone(true); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function reset() { setRemaining(seconds); setRunning(false); setDone(false); }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className="inline-flex items-center gap-1.5 ml-2">
      <span className={clsx(
        'text-xs font-mono px-2 py-0.5 rounded-lg font-medium',
        done ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
             : running ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                       : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      )}>
        <Timer className="w-3 h-3 inline mr-0.5" />
        {done ? '✓ Done' : `${mins}:${String(secs).padStart(2, '0')}`}
      </span>
      {!done && (
        <button onClick={() => setRunning(r => !r)} className="text-xs text-brand-500 hover:text-brand-700 font-medium">
          {running ? 'Pause' : 'Start'}
        </button>
      )}
      {(done || remaining < seconds) && (
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
          Reset
        </button>
      )}
    </span>
  );
}

// ── Unit conversion helper ─────────────────────────────────────────────────────
const METRIC_TO_IMPERIAL = {
  g: { unit: 'oz', factor: 0.035274 },
  kg: { unit: 'lb', factor: 2.20462 },
  ml: { unit: 'fl oz', factor: 0.033814 },
  l: { unit: 'cup', factor: 4.22675 },
};
const IMPERIAL_TO_METRIC = {
  oz: { unit: 'g', factor: 28.3495 },
  lb: { unit: 'kg', factor: 0.453592 },
  'fl oz': { unit: 'ml', factor: 29.5735 },
  cup: { unit: 'l', factor: 0.236588 },
};

function convertAmount(amount, unit, toImperial) {
  if (!amount || !unit) return { amount, unit };
  const map = toImperial ? METRIC_TO_IMPERIAL : IMPERIAL_TO_METRIC;
  const conv = map[unit?.toLowerCase()];
  if (!conv) return { amount, unit };
  return { amount: +(amount * conv.factor).toFixed(2), unit: conv.unit };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [servings, setServings] = useState(null);
  const [imperial, setImperial] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id).then(r => r.data.recipe),
  });

  const recipe = data;
  const baseServings = recipe?.servings || 4;
  const currentServings = servings ?? baseServings;
  const scale = currentServings / baseServings;

  const favMutation = useMutation({
    mutationFn: () => recipesApi.favorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipe', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => recipesApi.delete(id),
    onSuccess: () => navigate('/recipes'),
  });

  if (isLoading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );

  if (!recipe) return (
    <div className="p-6 text-center py-24">
      <p className="text-gray-500">Recipe not found.</p>
      <Link to="/recipes" className="btn-primary mt-4 inline-flex">Back to Recipes</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16">
      {/* Back */}
      <Link to="/recipes" className="btn-ghost mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Recipes
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm">
        {recipe.photo_path ? (
          <img src={recipe.photo_path} alt={recipe.title}
            className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-brand-100 to-amber-100 dark:from-gray-800 dark:to-gray-700 
                          flex items-center justify-center">
            <span className="text-8xl opacity-40">🍽️</span>
          </div>
        )}

        {/* Actions overlay */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => favMutation.mutate()}
            className="p-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow">
            <Heart className={clsx('w-5 h-5', recipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-500')} />
          </button>
          <Link to={`/recipes/${id}/edit`}
            className="p-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow">
            <Edit2 className="w-5 h-5 text-gray-500" />
          </Link>
          <button
            onClick={() => { if (confirm('Delete this recipe?')) deleteMutation.mutate(); }}
            className="p-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow">
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Title & Meta */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{recipe.title}</h1>
        {recipe.description && <p className="text-gray-600 dark:text-gray-400 mb-4">{recipe.description}</p>}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {recipe.prep_time_minutes > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Prep: <strong className="text-gray-900 dark:text-white">{recipe.prep_time_minutes} min</strong></span>
            </div>
          )}
          {recipe.cook_time_minutes > 0 && (
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-brand-500" />
              <span>Cook: <strong className="text-gray-900 dark:text-white">{recipe.cook_time_minutes} min</strong></span>
            </div>
          )}
          {recipe.difficulty && (
            <div className="flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-brand-500" />
              <span className="capitalize"><strong className="text-gray-900 dark:text-white">{recipe.difficulty}</strong></span>
            </div>
          )}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-brand-500 hover:text-brand-700">
              <ExternalLink className="w-4 h-4" /> Original Source
            </a>
          )}
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {recipe.tags.map(tag => (
              <span key={tag.id} className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}>
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 dark:text-white">Ingredients</h2>
            </div>

            {/* Servings scaler */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
              <Scale className="w-4 h-4 text-brand-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Servings</span>
              <button onClick={() => setServings(s => Math.max(1, (s ?? baseServings) - 1))}
                className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 
                           dark:border-gray-700 rounded-lg hover:bg-brand-50 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{currentServings}</span>
              <button onClick={() => setServings(s => (s ?? baseServings) + 1)}
                className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 
                           dark:border-gray-700 rounded-lg hover:bg-brand-50 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
              {servings !== null && (
                <button onClick={() => setServings(null)} className="text-xs text-brand-500 hover:text-brand-700">
                  Reset
                </button>
              )}
            </div>

            {/* Unit toggle */}
            <button onClick={() => setImperial(v => !v)}
              className="w-full flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 
                         hover:text-brand-500 transition-colors mb-4">
              <Globe className="w-4 h-4" />
              {imperial ? 'Switch to Metric' : 'Switch to Imperial'}
              <Repeat className="w-3.5 h-3.5 ml-auto" />
            </button>

            {/* Ingredient list */}
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, i) => {
                const scaledAmount = ing.amount ? +(ing.amount * scale).toFixed(2) : null;
                const converted = convertAmount(scaledAmount, ing.unit, imperial);
                return (
                  <li key={i} className="flex items-start gap-2 text-sm py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    <span className="flex-1 text-gray-700 dark:text-gray-300">
                      {converted.amount && (
                        <strong className="text-gray-900 dark:text-white">
                          {converted.amount}{converted.unit ? ` ${converted.unit}` : ''}
                        </strong>
                      )}{' '}
                      {ing.name}
                      {ing.notes && <span className="text-gray-400 text-xs"> ({ing.notes})</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Steps */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.steps?.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white 
                                  flex items-center justify-center text-sm font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.instruction}</p>
                    {step.timer_seconds > 0 && (
                      <div className="mt-2">
                        <StepTimer seconds={step.timer_seconds} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="card p-5 mt-4 bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
              <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">📝 Notes</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm whitespace-pre-wrap">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
