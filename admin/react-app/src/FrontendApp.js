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
import QuizDetailPage from './pages/frontend/QuizDetailPage';
import QuizLibraryPage from './pages/frontend/QuizLibraryPage';
import PracticeModePage from './pages/frontend/PracticeModePage';
import MaterialsPage from './pages/frontend/MaterialsPage';
import VideosPage from './pages/frontend/VideosPage';
import TestPage from './pages/frontend/TestPage';

function FrontendApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FrontendLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/dashboard/attempts/:attemptId" element={<QuizAttemptDetailsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseLessonsPage />} />
          <Route path="test" element={<TestPage />} />
          <Route path="test/practice" element={<PracticeModePage />} />
          <Route path="test/library" element={<QuizLibraryPage />} />
          <Route path="quiz/:quizId" element={<QuizDetailPage />} />
          <Route path="quiz-generator" element={<QuizGeneratorPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar />
    </Router>
  );
}

export default FrontendApp;