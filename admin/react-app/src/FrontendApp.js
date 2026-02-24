import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ScoreFormatProvider } from './contexts/ScoreFormatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MessagesProvider } from './contexts/MessagesContext';

// Layout y Páginas del Frontend
import FrontendLayout from './components/layout/FrontendLayout';
import DashboardPage from './pages/frontend/DashboardPage';
import QuizAttemptDetailsPage from './pages/frontend/QuizAttemptDetailsPage';
import CoursesPage from './pages/frontend/CoursesPage';
import BooksPage from './pages/frontend/BooksPage';
import CourseDashboardPage from './pages/frontend/CourseDashboardPage';
import CourseLessonsPage from './pages/frontend/CourseLessonsPage';
import QuizGeneratorPage from './pages/frontend/QuizGeneratorPage';
import QuizDetailPage from './pages/frontend/QuizDetailPage';
import QuizLibraryPage from './pages/frontend/QuizLibraryPage';
import PracticeModePage from './pages/frontend/PracticeModePage';
import TestHistoryPage from './pages/frontend/TestHistoryPage';
import StatisticsPage from './pages/frontend/StatisticsPage';

// Course-specific pages
import StudyPlannerPage from './pages/frontend/course/StudyPlannerPage';
import SupportMaterialPage from './pages/frontend/course/SupportMaterialPage';
import VideosPage from './pages/frontend/course/VideosPage';
import TestsPage from './pages/frontend/course/TestsPage';
import CourseStatisticsPage from './pages/frontend/course/CourseStatisticsPage';
import CourseStudentsPage from './pages/frontend/course/CourseStudentsPage';
import SelfPacedTestsPage from './pages/frontend/course/SelfPacedTestsPage';
import LiveClassesPage from './pages/frontend/course/LiveClassesPage';
import MessagesPage from './pages/frontend/course/MessagesPage';
import NotificationsPage from './pages/frontend/NotificationsPage';

// MessagesManager - Available for admins in frontend
import MessagesManager from './components/messages/MessagesManager';

// Admin Pages - Lazy loaded (only loaded when admin navigates to /admin)
const AdminDashboardPage = lazy(() => import('./pages/DashboardPage'));
const CoursesManager = lazy(() => import('./components/courses/CoursesManager'));
const LessonsManager = lazy(() => import('./components/lessons/LessonsManager'));
const QuizzesManager = lazy(() => import('./components/quizzes/QuizzesManager'));
const UsersManager = lazy(() => import('./components/users/UsersManager'));
const QuestionsManager = lazy(() => import('./components/questions/QuestionsManager'));
const AdminBooksManager = lazy(() => import('./components/books/BooksManager'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Loading Spinner for lazy components
const LazyLoadSpinner = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
  </div>
);

// Component to restore pending hash after login redirect
// This handles the case when user clicks email link, logs in, and needs to be redirected to messages
const PendingHashRestorer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const pendingHash = sessionStorage.getItem('qe_pending_hash');
    if (pendingHash && location.pathname === '/') {
      sessionStorage.removeItem('qe_pending_hash');
      // Parse the hash to get the path (e.g., "#/messages?messageId=123" -> "/messages?messageId=123")
      const hashPath = pendingHash.startsWith('#') ? pendingHash.substring(1) : pendingHash;
      if (hashPath && hashPath !== '/' && !hashPath.startsWith('/login')) {
        navigate(hashPath, { replace: true });
      }
    }
  }, [navigate, location.pathname]);
  
  return null;
};

// Handles the /login hash route — redirects to WooCommerce instead of rendering
// the old React LoginPage. If the user is already logged in, sends them home.
const LoginRouteHandler = () => {
  const isLoggedIn = window.qe_data?.user?.id > 0;
  if (isLoggedIn) return <Navigate to="/" replace />;
  // Not logged in: redirect to WooCommerce login (same as ProtectedRoute)
  redirectToLogin('');
  return null;
};

// Redirects unauthenticated users to the WooCommerce login page.
// Saves the intended hash to sessionStorage so PendingHashRestorer can
// navigate back after the user logs in and lands on /campus/.
const redirectToLogin = (intendedHash) => {
  if (intendedHash && intendedHash !== '#/' && intendedHash !== '#/login') {
    sessionStorage.setItem('qe_pending_hash', intendedHash);
  }
  const lmsUrl = window.qe_data?.lms_url || (window.location.origin + window.location.pathname);
  const loginBase = window.qe_data?.login_url || (window.location.origin + '/mi-cuenta/');
  const loginUrl = loginBase + '?redirect_to=' + encodeURIComponent(lmsUrl);
  window.location.replace(loginUrl);
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = window.qe_data?.user?.id > 0;
  const location = useLocation();

  if (!isLoggedIn) {
    const intended = '#' + location.pathname + (location.search || '');
    redirectToLogin(intended);
    return null;
  }

  return children;
};

// Admin Route Component - Only allows admins
const AdminRoute = ({ children }) => {
  const isLoggedIn = window.qe_data?.user?.id > 0;
  const isAdmin = window.qe_data?.user?.capabilities?.manage_options === true ||
                  window.qe_data?.user?.is_admin === true;
  const location = useLocation();

  if (!isLoggedIn) {
    const intended = '#' + location.pathname + (location.search || '');
    redirectToLogin(intended);
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Lazy load admin layout
const FrontendAdminLayout = lazy(() => import('./components/layout/FrontendAdminLayout'));

function FrontendApp() {
  return (
    <ThemeProvider>
      <ScoreFormatProvider>
        <MessagesProvider enablePolling={true} pollingInterval={30000}>
          <Router>
            <PendingHashRestorer />
            <Suspense fallback={<LazyLoadSpinner />}>
              <Routes>
                {/* /login route — always redirect to WooCommerce, never render old React LoginPage */}
                <Route path="/login" element={<LoginRouteHandler />} />
                
                {/* Admin Routes - Only for admins, lazy loaded */}
                <Route path="/admin" element={<AdminRoute><FrontendLayout /></AdminRoute>}>
                  <Route element={<FrontendAdminLayout />}>
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="courses" element={<CoursesManager />} />
                    <Route path="lessons" element={<LessonsManager />} />
                    <Route path="quizzes" element={<QuizzesManager />} />
                    <Route path="questions" element={<QuestionsManager />} />
                    <Route path="students" element={<UsersManager />} />
                    <Route path="books" element={<AdminBooksManager />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Route>
                
                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><FrontendLayout /></ProtectedRoute>}>
                  <Route index element={<CoursesPage />} />
                  <Route path="messages" element={<MessagesManager />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/attempts/:attemptId" element={<QuizAttemptDetailsPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="books" element={<BooksPage />} />
                  
                  {/* Course Dashboard Routes */}
                  <Route path="courses/:courseId/dashboard" element={<CourseDashboardPage />} />
                  <Route path="courses/:courseId/study-planner" element={<StudyPlannerPage />} />
                  <Route path="courses/:courseId/lessons" element={<CourseLessonsPage />} />
                  <Route path="courses/:courseId/material" element={<SupportMaterialPage />} />
                  <Route path="courses/:courseId/videos" element={<VideosPage />} />
                  <Route path="courses/:courseId/live-classes" element={<LiveClassesPage />} />
                  <Route path="courses/:courseId/statistics" element={<CourseStatisticsPage />} />
                  <Route path="courses/:courseId/students" element={<CourseStudentsPage />} />
                  <Route path="courses/:courseId/messages" element={<MessagesPage />} />
                  <Route path="courses/:courseId/notifications" element={<NotificationsPage />} />
                  
                  {/* Course Test Routes */}
                  <Route path="courses/:courseId/test-generator" element={<QuizGeneratorPage />} />
                  <Route path="courses/:courseId/self-paced-tests" element={<SelfPacedTestsPage />} />
                  <Route path="courses/:courseId/tests" element={<TestsPage />} />
                  <Route path="courses/:courseId/test-history" element={<TestHistoryPage />} />
                  
                  {/* Global Routes */}
                  <Route path="test/practice" element={<PracticeModePage />} />
                  <Route path="test/library" element={<QuizLibraryPage />} />
                  <Route path="test/history" element={<TestHistoryPage />} />
                  <Route path="statistics" element={<StatisticsPage />} />
                  <Route path="quiz/:quizId" element={<QuizDetailPage />} />
                  <Route path="quiz-generator" element={<QuizGeneratorPage />} />
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar />
          </Router>
        </MessagesProvider>
      </ScoreFormatProvider>
    </ThemeProvider>
  );
}

export default FrontendApp;