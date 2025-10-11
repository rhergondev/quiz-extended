import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout y Páginas del Frontend
import FrontendLayout from './components/layout/FrontendLayout';
import DashboardPage from './pages/frontend/DashboardPage';
import QuizAttemptDetailsPage from './pages/frontend/QuizAttemptDetailsPage';
import CoursesPage from './pages/frontend/CoursesPage';
import BooksPage from './pages/frontend/BooksPage';
import ProfilePage from './pages/frontend/ProfilePage';
import CourseLessonsPage from './pages/frontend/CourseLessonsPage';
import QuizGeneratorPage from './pages/frontend/QuizGeneratorPage';

function FrontendApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FrontendLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/dashboard/attempts/:attemptId" element={<QuizAttemptDetailsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseLessonsPage />} /> {/* <-- AÑADIDO */}
          <Route path="quiz-generator" element={<QuizGeneratorPage />} /> {/* <-- 2. Añadir la nueva ruta */}
          <Route path="books" element={<BooksPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar />
    </Router>
  );
}

export default FrontendApp;