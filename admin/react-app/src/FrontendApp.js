import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ScoreFormatProvider } from './contexts/ScoreFormatContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout y Páginas del Frontend
import FrontendLayout from './components/layout/FrontendLayout';
import DashboardPage from './pages/frontend/DashboardPage';
import QuizAttemptDetailsPage from './pages/frontend/QuizAttemptDetailsPage';
import CoursesPage from './pages/frontend/CoursesPage';
import CourseDashboardPage from './pages/frontend/CourseDashboardPage';
import CourseLessonsPage from './pages/frontend/CourseLessonsPage';
import QuizGeneratorPage from './pages/frontend/QuizGeneratorPage';
import QuizDetailPage from './pages/frontend/QuizDetailPage';
import QuizLibraryPage from './pages/frontend/QuizLibraryPage';
import PracticeModePage from './pages/frontend/PracticeModePage';
import TestPage from './pages/frontend/TestPage';
import TestHistoryPage from './pages/frontend/TestHistoryPage';
import StatisticsPage from './pages/frontend/StatisticsPage';

// Course-specific pages
import StudyPlannerPage from './pages/frontend/course/StudyPlannerPage';
import SupportMaterialPage from './pages/frontend/course/SupportMaterialPage';
import VideosPage from './pages/frontend/course/VideosPage';
import TestsPage from './pages/frontend/course/TestsPage';
import CourseStatisticsPage from './pages/frontend/course/CourseStatisticsPage';
import SelfPacedTestsPage from './pages/frontend/course/SelfPacedTestsPage';
import TestBrowserPage from './pages/frontend/course/TestBrowserPage';

function FrontendApp() {
  return (
    <ThemeProvider>
      <ScoreFormatProvider>
        <Router>
          <Routes>
            <Route path="/" element={<FrontendLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/dashboard/attempts/:attemptId" element={<QuizAttemptDetailsPage />} />
              <Route path="courses" element={<CoursesPage />} />
              
              {/* Course Dashboard Routes */}
              <Route path="courses/:courseId/dashboard" element={<CourseDashboardPage />} />
              <Route path="courses/:courseId/study-planner" element={<StudyPlannerPage />} />
              <Route path="courses/:courseId/lessons" element={<CourseLessonsPage />} />
              <Route path="courses/:courseId/material" element={<SupportMaterialPage />} />
              <Route path="courses/:courseId/videos" element={<VideosPage />} />
              <Route path="courses/:courseId/statistics" element={<CourseStatisticsPage />} />
              
              {/* Course Test Routes */}
              <Route path="courses/:courseId/test-generator" element={<QuizGeneratorPage />} />
              <Route path="courses/:courseId/self-paced-tests" element={<SelfPacedTestsPage />} />
              <Route path="courses/:courseId/test-browser" element={<TestsPage />} />
              <Route path="courses/:courseId/test-history" element={<TestHistoryPage />} />
              
              {/* Global Routes */}
              <Route path="test" element={<TestPage />} />
              <Route path="test/practice" element={<PracticeModePage />} />
              <Route path="test/library" element={<QuizLibraryPage />} />
              <Route path="test/history" element={<TestHistoryPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="quiz/:quizId" element={<QuizDetailPage />} />
              <Route path="quiz-generator" element={<QuizGeneratorPage />} />
            </Route>
          </Routes>
          <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar />
        </Router>
      </ScoreFormatProvider>
    </ThemeProvider>
  );
}

export default FrontendApp;