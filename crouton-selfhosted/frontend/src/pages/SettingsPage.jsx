// src/pages/SettingsPage.jsx — Tags management, AI configuration info

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi, aiApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Sparkles, Tag, Moon, Sun, User, Check, Lock } from 'lucide-react';

const TAG_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#84cc16', '#eab308', '#f59e0b', '#78716c',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const qc = useQueryClient();
  const [newTag, setNewTag] = useState({ name: '', color: '#f97316' });
  const [tagError, setTagError] = useState('');

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list().then(r => r.data) });
  const { data: aiStatus } = useQuery({ queryKey: ['ai-status'], queryFn: () => aiApi.status().then(r => r.data) });
  const tags = tagsData?.tags || [];

  const createTagMutation = useMutation({
    mutationFn: () => tagsApi.create(newTag),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewTag({ name: '', color: '#f97316' }); setTagError(''); },
    onError: (err) => setTagError(err.response?.data?.error || 'Failed to create tag'),
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id) => tagsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* Profile */}
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {dark ? <Moon className="w-5 h-5 text-brand-500" /> : <Sun className="w-5 h-5 text-brand-500" />}
          <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${dark ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* Tags */}
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Tags</h2>
        </div>

        {/* Existing tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <div key={tag.id} className="group flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: tag.color }}>
              {tag.name}
              <button onClick={() => deleteTagMutation.mutate(tag.id)}
                className="opacity-0 group-hover:opacity-100 hover:bg-black/20 rounded-full p-0.5 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No tags yet</p>
          )}
        </div>

        {/* Add tag */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" placeholder="Tag name..." value={newTag.name}
              onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
              className="input flex-1 text-sm" />
            <button onClick={() => createTagMutation.mutate()} disabled={!newTag.name || createTagMutation.isPending}
              className="btn-primary px-3">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Color picker */}
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewTag(t => ({ ...t, color: c }))}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: c }}>
                {newTag.color === c && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>

          {tagError && <p className="text-xs text-red-500">{tagError}</p>}
        </div>
      </section>

      {/* AI Configuration */}
      <section className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className={`w-5 h-5 ${aiStatus?.enabled ? 'text-purple-500' : 'text-gray-400'}`} />
          <h2 className="font-semibold text-gray-900 dark:text-white">AI Meal Planner</h2>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            aiStatus?.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {aiStatus?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {aiStatus?.enabled ? (
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Claude API Connected</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                AI meal plan generation is ready to use in the Meal Planner.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key not configured</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  To enable AI meal planning, add your Claude API key to the server's <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> file:
                </p>
                <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded-lg mt-2 overflow-x-auto">
{`CLAUDE_API_KEY=sk-ant-...`}
                </pre>
                <p className="text-xs text-gray-400 mt-2">
                  Get your API key at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                    className="text-brand-500 hover:text-brand-700 underline">
                    console.anthropic.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
