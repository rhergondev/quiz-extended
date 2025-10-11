// src/pages/QuizAttemptDetailsPage.jsx

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useQuizAttemptDetails from '../../hooks/useQuizAttemptDetails';
import QuizResultsRecover from '../../components/frontend/dashboard/QuizResultsRecover'; // Tu componente existente
import { ArrowLeft } from 'lucide-react';

const QuizAttemptDetailsPage = () => {
  const { attemptId } = useParams();
  const { details, loading, error } = useQuizAttemptDetails(attemptId);

  if (error) {
    return <div className="p-8 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  if (!details) {
    return <div className="p-8">No se encontraron detalles para este intento.</div>;
  }

  // 🔥 AQUÍ ESTÁ LA MAGIA: Adaptamos la respuesta de la API a las props de tu componente
  const resultProp = {
    ...details.attempt,
    detailed_results: details.detailed_results
  };

  const quizTitleProp = details.attempt.quizTitle;
  const questionsProp = details.questions;

  return (
    <div className="container mx-auto p-6">
      <Link to="/dashboard" className="inline-flex items-center text-indigo-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al Dashboard
      </Link>
      
      <QuizResultsRecover
        result={resultProp}
        quizTitle={quizTitleProp}
        questions={questionsProp}
      />
    </div>
  );
};

export default QuizAttemptDetailsPage;