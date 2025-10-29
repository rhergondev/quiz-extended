// src/pages/frontend/TestHistoryPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import QuizResultsSummary from '../../components/frontend/dashboard/QuizResultsSummary';

const TestHistoryPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/test')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Volver a Test"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Historial de Tests
          </h1>
          <p className="mt-1 text-gray-600">
            Revisa todos tus intentos anteriores y consulta tus resultados
          </p>
        </div>
      </div>

      {/* Full Quiz Results Component */}
      <QuizResultsSummary limitedView={false} />
    </div>
  );
};

export default TestHistoryPage;
