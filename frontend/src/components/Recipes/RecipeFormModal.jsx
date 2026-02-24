// src/components/Recipes/RecipeFormModal.jsx — Create / Edit recipe

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesApi, tagsApi } from '../../api/client';
import { X, Plus, Trash2, GripVertical, Image, Timer } from 'lucide-react';

function IngredientRow({ ing, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center group">
      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
      <input placeholder="Amount" type="number" step="0.01" value={ing.amount || ''}
        onChange={e => onChange({ ...ing, amount: e.target.value })}
        className="input w-24 text-sm" />
      <input placeholder="Unit (g, ml...)" value={ing.unit || ''}
        onChange={e => onChange({ ...ing, unit: e.target.value })}
        className="input w-28 text-sm" />
      <input placeholder="Ingredient name *" value={ing.name}
        onChange={e => onChange({ ...ing, name: e.target.value })}
        className="input flex-1 text-sm" />
      <button type="button" onClick={onRemove}
        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start group">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 
                      dark:text-brand-400 flex items-center justify-center text-xs font-bold mt-2">
        {index + 1}
      </div>
      <div className="flex-1 space-y-1">
        <textarea placeholder="Step instruction..." value={step.instruction}
          onChange={e => onChange({ ...step, instruction: e.target.value })}
          className="input text-sm resize-none" rows={2} />
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-gray-400" />
          <input type="number" placeholder="Timer (seconds, optional)"
            value={step.timer_seconds || ''}
            onChange={e => onChange({ ...step, timer_seconds: e.target.value ? parseInt(e.target.value) : null })}
            className="input text-sm w-52" />
        </div>
      </div>
      <button type="button" onClick={onRemove}
        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 mt-2">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function RecipeFormModal({ recipe: initial, onClose, onSuccess }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_path || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    source_url: initial?.source_url || '',
    prep_time_minutes: initial?.prep_time_minutes || '',
    cook_time_minutes: initial?.cook_time_minutes || '',
    servings: initial?.servings || 4,
    difficulty: initial?.difficulty || '',
    notes: initial?.notes || '',
    unit_system: initial?.unit_system || 'metric',
    ingredients: initial?.ingredients?.length ? initial.ingredients : [{ name: '', amount: '', unit: '' }],
    steps: initial?.steps?.length ? initial.steps : [{ instruction: '', timer_seconds: null }],
    tags: initial?.tags?.map(t => t.id) || [],
  });

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list().then(r => r.data) });
  const tags = tagsData?.tags || [];

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'ingredients' || k === 'steps' || k === 'tags') {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, v ?? '');
        }
      });
      if (photoFile) fd.append('photo', photoFile);
      return initial?.id ? recipesApi.update(initial.id, fd) : recipesApi.create(fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); onSuccess(); },
  });

  const update = k => v => setForm(f => ({ ...f, [k]: v }));
  const updateField = k => e => update(k)(e.target.value);

  function addIngredient() { update('ingredients')([...form.ingredients, { name: '', amount: '', unit: '' }]); }
  function updateIngredient(i, val) { const a = [...form.ingredients]; a[i] = val; update('ingredients')(a); }
  function removeIngredient(i) { update('ingredients')(form.ingredients.filter((_, idx) => idx !== i)); }

  function addStep() { update('steps')([...form.steps, { instruction: '', timer_seconds: null }]); }
  function updateStep(i, val) { const a = [...form.steps]; a[i] = val; update('steps')(a); }
  function removeStep(i) { update('steps')(form.steps.filter((_, idx) => idx !== i)); }

  function toggleTag(id) {
    update('tags')(form.tags.includes(id) ? form.tags.filter(t => t !== id) : [...form.tags, id]);
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await mutation.mutateAsync();
  }

  const TABS = ['basic', 'ingredients', 'steps', 'notes'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial?.id ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === t
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic */}
          {activeTab === 'basic' && (
            <>
              {/* Photo */}
              <div>
                <label className="label">Photo</label>
                <div
                  onClick={() => fileRef.current.click()}
                  className="relative w-full h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700
                             hover:border-brand-400 transition-colors cursor-pointer overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Image className="w-8 h-8 mb-2" />
                      <span className="text-sm">Click to upload photo</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>

              <div>
                <label className="label">Title *</label>
                <input type="text" required value={form.title} onChange={updateField('title')} className="input" placeholder="Recipe name" />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={updateField('description')} className="input resize-none" rows={2} placeholder="Brief description..." />
              </div>

              <div>
                <label className="label">Source URL</label>
                <input type="url" value={form.source_url} onChange={updateField('source_url')} className="input" placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prep Time (min)</label>
                  <input type="number" min="0" value={form.prep_time_minutes} onChange={updateField('prep_time_minutes')} className="input" />
                </div>
                <div>
                  <label className="label">Cook Time (min)</label>
                  <input type="number" min="0" value={form.cook_time_minutes} onChange={updateField('cook_time_minutes')} className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Servings</label>
                  <input type="number" min="1" value={form.servings} onChange={updateField('servings')} className="input" />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select value={form.difficulty} onChange={updateField('difficulty')} className="input">
                    <option value="">— select —</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Unit System</label>
                <div className="flex gap-2">
                  {['metric', 'imperial'].map(u => (
                    <button key={u} type="button"
                      onClick={() => update('unit_system')(u)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                        form.unit_system === u
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="label">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          form.tags.includes(tag.id)
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 opacity-50 hover:opacity-100'
                        }`}
                        style={form.tags.includes(tag.id) ? { backgroundColor: tag.color } : {}}>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ingredients */}
          {activeTab === 'ingredients' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add each ingredient with amount, unit and name.
              </p>
              {form.ingredients.map((ing, i) => (
                <IngredientRow key={i} ing={ing}
                  onChange={v => updateIngredient(i, v)}
                  onRemove={() => removeIngredient(i)} />
              ))}
              <button type="button" onClick={addIngredient} className="btn-ghost text-sm">
                <Plus className="w-4 h-4" /> Add Ingredient
              </button>
            </div>
          )}

          {/* Steps */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tap a step's timer field to add a countdown timer.
              </p>
              {form.steps.map((step, i) => (
                <StepRow key={i} step={step} index={i}
                  onChange={v => updateStep(i, v)}
                  onRemove={() => removeStep(i)} />
              ))}
              <button type="button" onClick={addStep} className="btn-ghost text-sm">
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div>
              <label className="label">Notes & Tips</label>
              <textarea value={form.notes} onChange={updateField('notes')}
                className="input resize-none" rows={10}
                placeholder="Personal notes, substitutions, tips for next time..." />
            </div>
          )}

          {mutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              {mutation.error?.response?.data?.error || 'Failed to save recipe'}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : initial?.id ? 'Save Changes' : 'Create Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
