import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CoursesPage from './pages/CoursesPage';
import LessonsPage from './pages/LessonsPage';

/**
 * El componente raíz de la aplicación.
 * Configura el enrutador y define las rutas principales.
 */
function App() {
  return (
    <Router>
      <div className="qe-lms-admin-app">
        <Routes>
          {/* --- RUTAS PRINCIPALES --- */}

          {/* Ruta para la página de Cursos */}
          <Route path="/courses" element={<CoursesPage />} />
         <Route path="/lessons" element={<LessonsPage />} />
          {/* Rutas de marcador de posición para futuras páginas */}
          <Route path="/quizzes" element={<h1>Página de Quizzes (Próximamente)</h1>} />
          <Route path="/questions" element={<h1>Página de Preguntas (Próximamente)</h1>} />
          <Route path="/students" element={<h1>Página de Estudiantes (Próximamente)</h1>} />
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