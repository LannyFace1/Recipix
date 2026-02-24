// src/pages/MealPlannerPage.jsx — Weekly drag-drop meal planner

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealPlanApi, recipesApi, aiApi } from '../api/client';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, X, ShoppingCart,
  Sparkles, Loader2, Lock, ChefHat
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AIPlannerModal from '../components/AI/AIPlannerModal';
import clsx from 'clsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

const SLOT_COLORS = {
  breakfast: 'from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-100 dark:border-amber-900/30',
  lunch:     'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900/30',
  dinner:    'from-brand-50 to-orange-50 dark:from-brand-950/30 dark:to-orange-950/30 border-brand-100 dark:border-brand-900/30',
  snack:     'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-100 dark:border-purple-900/30',
};

function RecipePickerModal({ onPick, onClose }) {
  const [search, setSearch] = useState('');
  const { data } = useQuery({
    queryKey: ['recipes', search],
    queryFn: () => recipesApi.list({ search: search || undefined }).then(r => r.data),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..." className="input flex-1" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-2">
          {data?.recipes?.length === 0 && (
            <p className="text-center text-gray-500 py-8">No recipes found</p>
          )}
          {data?.recipes?.map(r => (
            <button key={r.id} onClick={() => onPick(r)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 
                         transition-colors text-left">
              {r.photo_path ? (
                <img src={r.photo_path} alt={r.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🍽️</span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{r.title}</p>
                {r.cook_time_minutes > 0 && (
                  <p className="text-xs text-gray-400">{r.cook_time_minutes} min</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MealPlannerPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [picker, setPicker] = useState(null); // { day, slot }
  const [mobileDay, setMobileDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1;
  });
  const [showAI, setShowAI] = useState(false);

  const weekStart = format(currentWeek, 'yyyy-MM-dd');

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['meal-plan', weekStart],
    queryFn: () => mealPlanApi.get(weekStart).then(r => r.data),
  });

  const plan = data?.plan;
  const entries = data?.entries || [];

  // Ensure plan exists for this week before adding entries
  const createPlanMutation = useMutation({
    mutationFn: () => mealPlanApi.create(weekStart),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan', weekStart] }),
  });

  const upsertMutation = useMutation({
    mutationFn: ({ planId, data }) => mealPlanApi.upsertEntry(planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan', weekStart] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ planId, day, slot }) => mealPlanApi.deleteEntry(planId, day, slot),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan', weekStart] }),
  });

  function getEntry(day, slot) {
    return entries.find(e => e.day_of_week === day && e.meal_slot === slot);
  }

  async function openPicker(day, slot) {
    if (!plan) await createPlanMutation.mutateAsync();
    setPicker({ day, slot });
  }

  async function pickRecipe(recipe) {
    const planId = plan?.id || data?.plan?.id;
    await upsertMutation.mutateAsync({
      planId,
      data: { recipe_id: recipe.id, day_of_week: picker.day, meal_slot: picker.slot },
    });
    setPicker(null);
  }

  function generateShoppingList() {
    if (!plan) return;
    navigate('/shopping', { state: { createFromPlan: plan.id } });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Week of {format(currentWeek, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          {plan && (
            <button onClick={generateShoppingList} className="btn-secondary flex-1 sm:flex-none justify-center">
              <ShoppingCart className="w-4 h-4" /> Shopping List
            </button>
          )}
          <button
            onClick={() => setShowAI(true)}
            disabled={!aiStatus?.enabled}
            title={!aiStatus?.enabled ? 'Set CLAUDE_API_KEY in .env to enable AI' : 'Generate meal plan with AI'}
            className={clsx('btn-secondary flex-1 sm:flex-none justify-center gap-2', !aiStatus?.enabled && 'opacity-60 cursor-not-allowed')}
          >
            {aiStatus?.enabled ? <Sparkles className="w-4 h-4 text-purple-500" /> : <Lock className="w-4 h-4" />}
            AI Generate
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="text-sm font-medium text-brand-500 hover:text-brand-700"
        >
          This Week
        </button>
        <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="btn-ghost p-2">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile: Day tabs */}
      <div className="md:hidden">
        {/* Day selector */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {DAYS.map((day, i) => {
            const date = addDays(currentWeek, i);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <button key={i} onClick={() => setMobileDay(i)}
                className={clsx(
                  'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  mobileDay === i
                    ? 'bg-brand-500 text-white shadow-md'
                    : isToday
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                )}>
                <span>{day}</span>
                <span className="text-xs opacity-70">{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>

        {/* Slots for selected day */}
        <div className="space-y-3">
          {SLOTS.map(slot => {
            const entry = getEntry(mobileDay, slot);
            return (
              <div key={slot} className={clsx('card p-3 bg-gradient-to-br border', SLOT_COLORS[slot])}>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide capitalize mb-2">
                  {slot}
                </p>
                {entry?.recipe_id ? (
                  <div className="flex items-center gap-3">
                    {entry.photo_path ? (
                      <img src={entry.photo_path} alt={entry.title}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/50 dark:bg-gray-800/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{entry.title}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate({ planId: plan.id, day: mobileDay, slot })}
                      className="p-1.5 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => openPicker(mobileDay, slot)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 dark:text-gray-500 
                               hover:text-brand-500 transition-colors border-2 border-dashed border-gray-200 
                               dark:border-gray-700 rounded-xl">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add recipe</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Full week grid */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="min-w-[900px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="col-span-1" />
            {DAYS.map((day, i) => {
              const date = addDays(currentWeek, i);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={day} className={clsx(
                  'text-center py-2 rounded-xl text-sm font-medium',
                  isToday ? 'bg-brand-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400'
                )}>
                  <div>{day}</div>
                  <div className={clsx('text-xs mt-0.5', isToday ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500')}>
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rows per slot */}
          {SLOTS.map(slot => (
            <div key={slot} className="grid grid-cols-8 gap-2 mb-2">
              {/* Slot label */}
              <div className="flex items-center">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide capitalize">
                  {slot}
                </span>
              </div>

              {/* Day cells */}
              {DAYS.map((_, dayIdx) => {
                const entry = getEntry(dayIdx, slot);
                return (
                  <div key={dayIdx}
                    className={clsx(
                      'min-h-24 rounded-xl border bg-gradient-to-br p-2 transition-all',
                      SLOT_COLORS[slot]
                    )}
                  >
                    {entry?.recipe_id ? (
                      <div className="relative h-full group">
                        {entry.photo_path && (
                          <img src={entry.photo_path} alt={entry.title}
                            className="w-full h-12 object-cover rounded-lg mb-1" />
                        )}
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                          {entry.title}
                        </p>
                        <button
                          onClick={() => deleteMutation.mutate({ planId: plan.id, day: dayIdx, slot })}
                          className="absolute top-0 right-0 p-0.5 bg-white/80 dark:bg-gray-900/80 rounded-full 
                                     text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openPicker(dayIdx, slot)}
                        className="w-full h-full flex items-center justify-center gap-1 text-gray-300 dark:text-gray-600 
                                   hover:text-brand-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {picker && (
        <RecipePickerModal
          onPick={pickRecipe}
          onClose={() => setPicker(null)}
        />
      )}

      {showAI && (
        <AIPlannerModal
          weekStart={weekStart}
          onClose={() => setShowAI(false)}
          onSuccess={() => { setShowAI(false); qc.invalidateQueries({ queryKey: ['meal-plan', weekStart] }); }}
        />
      )}
    </div>
  );
}
