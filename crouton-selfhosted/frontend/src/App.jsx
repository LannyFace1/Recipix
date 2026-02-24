// src/App.jsx — Router + auth guard

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import MealPlannerPage from './pages/MealPlannerPage';
import ShoppingListPage from './pages/ShoppingListPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/recipes" replace />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:id" element={<RecipeDetailPage />} />
        <Route path="meal-planner" element={<MealPlannerPage />} />
        <Route path="shopping" element={<ShoppingListPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
