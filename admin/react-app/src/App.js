import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CoursesManager from './components/courses/CoursesManager';
import LessonsManager from './components/lessons/LessonsManager';
import QuizzesManager from './components/quizzes/QuizzesManager';
import UsersPage from './pages/UsersPage';
import QuestionsManager from './components/questions/QuestionsManager';

import i18n from './i18n/config';

/**
 * El componente raíz de la aplicación.
 * Configura el enrutador y define las rutas principales.
 * ACTUALIZADO: Ahora incluye las páginas de Questions y Quizzes
 */
function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <div className="qe-lms-admin-app">
          <Routes>
            <Route path="/" element={<h1>Página de prueba</h1>} />
            <Route path="/courses" element={<CoursesManager />} />
            <Route path="/lessons" element={<LessonsManager  />} />
            <Route path="/quizzes" element={<QuizzesManager />} />
            <Route path="/questions" element={<QuestionsManager />} />
            <Route path="/students" element={<UsersPage />} />
            <Route path="/settings" element={<h1>Página de Ajustes (Próximamente)</h1>} />
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
    </I18nextProvider>
  );
}

export default App;