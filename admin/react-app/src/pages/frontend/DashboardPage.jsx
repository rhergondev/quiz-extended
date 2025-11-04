// admin/react-app/src/pages/frontend/DashboardPage.jsx

import React from 'react';
import QuizResultsSummary from '../../components/frontend/dashboard/QuizResultsSummary';
import SimpleUserInbox from '../../components/frontend/dashboard/SimpleUserInbox';
import CourseProgressWidget from '../../components/frontend/dashboard/CourseProgressWidget';
import QuestionStatsWidget from '../../components/frontend/dashboard/QuestionStatsWidget';
import PendingQuizAlert from '../../components/frontend/dashboard/PendingQuizAlert';

const DashboardPage = () => {
  const userName = window.qe_data?.user?.name || "Estudiante";

  return (
    <div className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold qe-text-primary">
          ¡Bienvenido de nuevo, {userName}!
        </h1>
        <p className="mt-2 text-lg qe-text-secondary">
          Aquí tienes un resumen de tu progreso y mensajes.
        </p>
      </header>

      <main className="space-y-8">
        {/* Pending Quiz Alert - Shows if user has incomplete quiz */}
        <PendingQuizAlert />

        {/* Grid layout for widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Progress Widget */}
          <div className="lg:col-span-1 h-full min-h-[400px]">
            <CourseProgressWidget />
          </div>

          {/* Question Stats Widget */}
          <div className="lg:col-span-1 h-full min-h-[400px]">
            <QuestionStatsWidget />
          </div>

          {/* User Messages Inbox (simplified) */}
          <div className="lg:col-span-1 h-full min-h-[400px]">
            <SimpleUserInbox />
          </div>
        </div>
        
        {/* Quiz Results Summary - Limited to 5 most recent - Full width */}
        <QuizResultsSummary limitedView={true} />
      </main>
    </div>
  );
};

export default DashboardPage;