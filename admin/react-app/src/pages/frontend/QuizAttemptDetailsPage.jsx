// src/pages/frontend/QuizAttemptDetailsPage.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useQuizAttemptDetails from '../../hooks/useQuizAttemptDetails';
import QuizResults from '../../components/frontend/QuizResults'; // ¡Reutilizamos el componente!
import { ArrowLeft, Loader } from 'lucide-react';

const QuizAttemptDetailsPage = () => {
  const { attemptId } = useParams();
  const { details, loading, error } = useQuizAttemptDetails(attemptId);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader className="animate-spin" /></div>;
  }

  if (error) {
    return <div className="p-8 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  if (!details) {
    return <div className="p-8">No se encontraron detalles para este intento.</div>;
  }

  // Adaptamos la respuesta de la API a las props que espera QuizResults
  const resultProp = {
    ...details.attempt, // score, score_with_risk, duration_seconds, etc.
    detailed_results: details.detailed_results
  };

  const quizTitleProp = details.attempt.quizTitle;
  const questionsProp = details.questions;

  return (
    <div className="container mx-auto p-6">
      <Link to="/" className="inline-flex items-center text-indigo-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al Dashboard
      </Link>

      <QuizResults
        result={resultProp}
        quizTitle={quizTitleProp}
        questions={questionsProp}
      />
    </div>
  );
};

export default QuizAttemptDetailsPage;