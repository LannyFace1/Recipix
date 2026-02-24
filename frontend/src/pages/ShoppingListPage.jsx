// src/pages/ShoppingListPage.jsx — Shopping list manager

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { shoppingApi } from '../api/client';
import {
  ShoppingCart, Plus, Trash2, Check, ChevronRight, X, Loader2, PackagePlus
} from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'beverages', 'other'];

function CreateListModal({ onClose, fromPlanId }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: () => shoppingApi.create({ name, meal_plan_id: fromPlanId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping-lists'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
          {fromPlanId ? 'Create Shopping List from Meal Plan' : 'New Shopping List'}
        </h3>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="List name..." className="input mb-4" autoFocus />
        {fromPlanId && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ingredients will be auto-populated from your current meal plan.
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}
            className="btn-primary flex-1 justify-center">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddItemRow({ listId }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');

  const mutation = useMutation({
    mutationFn: () => shoppingApi.addItem(listId, { name, amount: amount || undefined, unit: unit || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping-list', listId] }); setName(''); setAmount(''); setUnit(''); },
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
      className="flex gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <input type="number" step="0.1" value={amount} onChange={e => setAmount(e.target.value)}
        placeholder="Qty" className="input w-20 text-sm" />
      <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
        placeholder="Unit" className="input w-20 text-sm" />
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Item name..." className="input flex-1 text-sm" />
      <button type="submit" disabled={!name || mutation.isPending} className="btn-primary py-2 px-3">
        <Plus className="w-4 h-4" />
      </button>
    </form>
  );
}

export default function ShoppingListPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const fromPlanId = location.state?.createFromPlan;

  useEffect(() => {
    if (fromPlanId) setShowCreate(true);
  }, [fromPlanId]);

  const { data: listsData } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => shoppingApi.list().then(r => r.data),
  });

  const { data: listData } = useQuery({
    queryKey: ['shopping-list', selectedId],
    queryFn: () => shoppingApi.get(selectedId).then(r => r.data),
    enabled: !!selectedId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, checked }) => shoppingApi.toggleItem(selectedId, itemId, checked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-list', selectedId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => shoppingApi.deleteList(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping-lists'] }); setSelectedId(null); },
  });

  const lists = listsData?.lists || [];
  const activeList = listData?.list;
  const items = activeList?.items || [];

  const checkedCount = items.filter(i => i.is_checked).length;

  // Group items by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => (i.category || 'other') === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Lists</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New List
        </button>
      </div>

      <div className="flex gap-6">
        {/* List sidebar */}
        <div className="w-64 flex-shrink-0 space-y-2">
          {lists.length === 0 ? (
            <div className="card p-6 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No shopping lists yet</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-3 text-sm">
                <Plus className="w-4 h-4" /> Create one
              </button>
            </div>
          ) : (
            lists.map(list => (
              <button key={list.id}
                onClick={() => setSelectedId(list.id)}
                className={clsx(
                  'w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all',
                  selectedId === list.id
                    ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                    : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-brand-200'
                )}
              >
                <ShoppingCart className={clsx('w-4 h-4 flex-shrink-0', selectedId === list.id ? 'text-brand-500' : 'text-gray-400')} />
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{list.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))
          )}
        </div>

        {/* Active list */}
        {selectedId && activeList ? (
          <div className="flex-1">
            <div className="card overflow-visible">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{activeList.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {checkedCount} of {items.length} checked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Progress */}
                  <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${items.length ? (checkedCount / items.length) * 100 : 0}%` }} />
                  </div>
                  <button onClick={() => deleteMutation.mutate(selectedId)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <AddItemRow listId={selectedId} />

                <div className="mt-4 space-y-4">
                  {Object.entries(grouped).map(([cat, catItems]) => (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 capitalize">
                        {cat}
                      </h3>
                      <div className="space-y-1">
                        {catItems.map(item => (
                          <div key={item.id}
                            className={clsx(
                              'flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                              item.is_checked && 'opacity-50'
                            )}
                            onClick={() => toggleMutation.mutate({ itemId: item.id, checked: !item.is_checked })}
                          >
                            <div className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                              item.is_checked
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}>
                              {item.is_checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={clsx(
                              'flex-1 text-sm text-gray-900 dark:text-gray-100',
                              item.is_checked && 'line-through'
                            )}>
                              {item.amount && `${item.amount}${item.unit ? ' ' + item.unit : ''} `}{item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                      <PackagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Add items above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 dark:text-gray-500">Select a list to view</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListModal
          fromPlanId={fromPlanId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
