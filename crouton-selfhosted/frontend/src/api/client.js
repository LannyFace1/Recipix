// src/api/client.js — Axios instance with JWT auto-refresh

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

// Attach access token from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let queue = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      refreshing = true;
      try {
        const rt = localStorage.getItem('refreshToken');
        if (!rt) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        queue.forEach(p => p.resolve(data.accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        queue.forEach(p => p.reject(err));
        queue = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Recipes ────────────────────────────────────────────────────────────────────
export const recipesApi = {
  list: (params) => api.get('/recipes', { params }),
  get: (id) => api.get(`/recipes/${id}`),
  create: (form) => api.post('/recipes', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, form) => api.put(`/recipes/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  favorite: (id) => api.patch(`/recipes/${id}/favorite`),
  delete: (id) => api.delete(`/recipes/${id}`),
};

// ── Import ─────────────────────────────────────────────────────────────────────
export const importApi = {
  fromUrl: (url) => api.post('/import/url', { url }),
};

// ── Meal Plan ──────────────────────────────────────────────────────────────────
export const mealPlanApi = {
  current: () => api.get('/meal-plans/current'),
  get: (week_start) => api.get('/meal-plans', { params: { week_start } }),
  create: (week_start) => api.post('/meal-plans', { week_start }),
  upsertEntry: (planId, data) => api.put(`/meal-plans/${planId}/entries`, data),
  deleteEntry: (planId, day, slot) => api.delete(`/meal-plans/${planId}/entries/${day}/${slot}`),
};

// ── Shopping ───────────────────────────────────────────────────────────────────
export const shoppingApi = {
  list: () => api.get('/shopping'),
  get: (id) => api.get(`/shopping/${id}`),
  create: (data) => api.post('/shopping', data),
  addItem: (id, data) => api.post(`/shopping/${id}/items`, data),
  toggleItem: (listId, itemId, is_checked) => api.patch(`/shopping/${listId}/items/${itemId}`, { is_checked }),
  deleteList: (id) => api.delete(`/shopping/${id}`),
};

// ── Tags ───────────────────────────────────────────────────────────────────────
export const tagsApi = {
  list: () => api.get('/tags'),
  create: (data) => api.post('/tags', data),
  delete: (id) => api.delete(`/tags/${id}`),
};

// ── AI ─────────────────────────────────────────────────────────────────────────
export const aiApi = {
  status: () => api.get('/ai/status'),
  generatePlan: (data) => api.post('/ai/generate-meal-plan', data),
};

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),
};
