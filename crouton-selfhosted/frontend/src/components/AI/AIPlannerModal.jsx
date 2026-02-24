// src/components/AI/AIPlannerModal.jsx — AI-powered meal plan generator modal
// Feature is enabled only when CLAUDE_API_KEY is set in backend .env

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../../api/client';
import { Sparkles, X, Loader2, Info } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function AIPlannerModal({ weekStart, onClose, onSuccess }) {
  const [preferences, setPreferences] = useState({
    days: [0, 1, 2, 3, 4, 5, 6],
    slots: ['lunch', 'dinner'],
    note: '',
  });

  const mutation = useMutation({
    mutationFn: () => aiApi.generatePlan({
      week_start: weekStart,
      days: preferences.days,
      slots: preferences.slots,
      note: preferences.note,
    }),
    onSuccess: () => onSuccess(),
  });

  function toggleDay(i) {
    setPreferences(p => ({
      ...p,
      days: p.days.includes(i) ? p.days.filter(d => d !== i) : [...p.days, i].sort(),
    }));
  }

  function toggleSlot(s) {
    setPreferences(p => ({
      ...p,
      slots: p.slots.includes(s) ? p.slots.filter(x => x !== s) : [...p.slots, s],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">AI Meal Planner</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Claude</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info box */}
          <div className="flex gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Claude will pick recipes from your library and create a balanced, varied meal plan.
              Existing plan entries for this week will be replaced.
            </p>
          </div>

          {/* Days */}
          <div>
            <label className="label">Days to plan</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((day, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preferences.days.includes(i)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div>
            <label className="label">Meal slots to fill</label>
            <div className="flex gap-1.5 flex-wrap">
              {SLOTS.map(s => (
                <button key={s} type="button" onClick={() => toggleSlot(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    preferences.slots.includes(s)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Preferences (optional)</label>
            <textarea
              value={preferences.note}
              onChange={e => setPreferences(p => ({ ...p, note: e.target.value }))}
              placeholder="e.g. vegetarian, quick weekday meals, no fish..."
              className="input resize-none" rows={2}
            />
          </div>

          {mutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                            rounded-xl text-red-700 dark:text-red-400 text-sm">
              {mutation.error?.response?.data?.error || 'AI generation failed. Check your API key.'}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || preferences.days.length === 0 || preferences.slots.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 
                         text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {mutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Sparkles className="w-4 h-4" /> Generate Plan</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
