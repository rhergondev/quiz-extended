import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importa tus componentes de página de admin
import DashboardPage from './pages/DashboardPage';
import CoursesManager from './components/courses/CoursesManager';
import LessonsManager from './components/lessons/LessonsManager';
import QuizzesManager from './components/quizzes/QuizzesManager';
import UsersPage from './pages/UsersPage';
import QuestionsManager from './components/questions/QuestionsManager';
import MessagesManager from './components/messages/MessagesManager';

/**
 * Root component for the admin panel.
 * Contains the router and routes for the wp-admin panel.
 */
function AdminApp() {
  return (
    <Router>
      {/* CORRECCIÓN: Añadido 'h-screen' para que la app ocupe toda la altura de la ventana */}
      <div className="qe-lms-admin-app h-screen flex flex-col">
        <Routes>
          {/* Admin specific routes */}
          <Route path="/courses" element={<CoursesManager />} />
          <Route path="/lessons" element={<LessonsManager />} />
          <Route path="/quizzes" element={<QuizzesManager />} />
          <Route path="/questions" element={<QuestionsManager />} />
          <Route path="/students" element={<UsersPage />} />
          <Route path="/messages" element={<MessagesManager />} />
          <Route path="/settings" element={<h1>Settings Page (Coming Soon)</h1>} />

          {/* Default redirect for admin */}
          <Route path="*" element={<DashboardPage />} />
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
  );
}

export default AdminApp;
