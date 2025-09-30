import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CoursesManager from './components/courses/CoursesManager';
import LessonsManager from './components/lessons/LessonsManager';
import QuizzesManager from './components/quizzes/QuizzesManager';
import UsersPage from './pages/UsersPage';
import QuestionsManager from './components/questions/QuestionsManager';

/**
 * El componente raíz de la aplicación.
 * Configura el enrutador y define las rutas principales.
 * ACTUALIZADO: Ahora incluye las páginas de Questions y Quizzes
 */
function App() {
  return (
    <Router>
      <div className="qe-lms-admin-app">
        <Routes>
          {/* --- RUTAS PRINCIPALES --- */}

          {/* Ruta para la página de Cursos */}
          <Route path="/courses" element={<CoursesManager />} />
          
          {/* Ruta para la página de Lecciones */}
          <Route path="/lessons" element={<LessonsManager  />} />
          
          {/* Ruta para la página de Quizzes */}
          <Route path="/quizzes" element={<QuizzesManager />} />
          
          {/* Ruta para la página de Preguntas */}
          <Route path="/questions" element={<QuestionsManager />} />

          {/* Rutas de marcador de posición para futuras páginas */}
          <Route path="/students" element={<UsersPage />} />
          <Route path="/settings" element={<h1>Página de Ajustes (Próximamente)</h1>} />

          {/* --- RUTA POR DEFECTO --- */}
          {/* Si la URL no coincide con ninguna ruta (ej. la raíz),
              redirigimos a la página de Cursos como vista por defecto. */}
          <Route path="*" element={<Navigate to="/courses" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;