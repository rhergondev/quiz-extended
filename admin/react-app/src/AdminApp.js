import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout
import AdminLayout from './components/layout/AdminLayout';

// Importa tus componentes de página de admin
import DashboardPage from './pages/DashboardPage';
import CoursesManager from './components/courses/CoursesManager';
import LessonsManager from './components/lessons/LessonsManager';
import QuizzesManager from './components/quizzes/QuizzesManager';
import UsersManager from './components/users/UsersManager';
import QuestionsManager from './components/questions/QuestionsManager';
import MessagesManager from './components/messages/MessagesManager';
import BooksManager from './components/books/BooksManager';
import MigrationPage from './pages/admin/MigrationPage';
import SettingsPage from './pages/SettingsPage';
import ThemeSettingsPage from './pages/ThemeSettingsPage';

/**
 * Root component for the admin panel.
 * Contains the router and routes for the wp-admin panel.
 * Uses AdminLayout with Topbar for unified navigation.
 */
function AdminApp() {
  return (
    <ThemeProvider>
      <Router>
        <div className="qe-lms-admin-app h-full flex flex-col overflow-hidden">
          <Routes>
            {/* All routes wrapped in AdminLayout with Topbar */}
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/courses" element={<CoursesManager />} />
              <Route path="/lessons" element={<LessonsManager />} />
              <Route path="/quizzes" element={<QuizzesManager />} />
              <Route path="/questions" element={<QuestionsManager />} />
              <Route path="/students" element={<UsersManager />} />
              <Route path="/messages" element={<MessagesManager />} />
              <Route path="/books" element={<BooksManager />} />
              <Route path="/migrations" element={<MigrationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/theme" element={<ThemeSettingsPage />} />
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default AdminApp;
