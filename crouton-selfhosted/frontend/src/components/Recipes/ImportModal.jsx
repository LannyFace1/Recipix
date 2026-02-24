// src/components/Recipes/ImportModal.jsx — Import recipe from URL

import { useState } from 'react';
import { importApi } from '../../api/client';
import { Link2, X, Loader2, CheckCircle } from 'lucide-react';

export default function ImportModal({ onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleImport(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await importApi.fromUrl(url);
      onImported(data.recipe);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not import recipe from this URL. Try another site.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Import from URL</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Paste a recipe URL to import</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="label">Recipe URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.allrecipes.com/recipe/..."
              className="input"
              autoFocus
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Works with AllRecipes, BBC Good Food, Epicurious, NYT Cooking, and many more.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                            rounded-xl text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !url} className="btn-primary flex-1 justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : 'Import Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
