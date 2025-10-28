// admin/react-app/src/pages/frontend/DashboardPage.jsx

import React from 'react';
import QuizResultsSummary from '../../components/frontend/dashboard/QuizResultsSummary';
import UserInbox from '../../components/frontend/dashboard/UserInbox';
import PendingQuizAlert from '../../components/frontend/dashboard/PendingQuizAlert';

const DashboardPage = () => {
  const userName = window.qe_data?.user?.name || "Estudiante";

  return (
    <div className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Bienvenido de nuevo, {userName}!
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Aquí tienes un resumen de tu progreso y mensajes.
        </p>
      </header>

      <main className="space-y-8">
        {/* Pending Quiz Alert - Shows if user has incomplete quiz */}
        <PendingQuizAlert />

        {/* User Messages Inbox */}
        <UserInbox />

        {/* Quiz Results Summary */}
        <QuizResultsSummary />
      </main>
    </div>
  );
};

export default DashboardPage;