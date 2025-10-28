// src/pages/frontend/QuizAttemptDetailsPage.jsx
import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import useQuizAttemptDetails from '../../hooks/useQuizAttemptDetails';
import QuizResults from '../../components/frontend/QuizResults'; // ¡Reutilizamos el componente!
import { ArrowLeft, Loader } from 'lucide-react';
import QEButton from '../../components/common/QEButton';

const QuizAttemptDetailsPage = () => {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { details, loading, error } = useQuizAttemptDetails(attemptId);
  
  // Obtener la ruta de retorno del state o usar dashboard por defecto
  const returnPath = location.state?.returnTo || '/';

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
      <QEButton
        onClick={() => {
          // Si hay una ruta de retorno y un quizId, navegar con ese estado
          if (returnPath && returnPath !== '/' && location.state?.returnToQuiz) {
            navigate(returnPath, {
              state: { 
                selectedQuizId: location.state.returnToQuiz,
                scrollToQuiz: true 
              }
            });
          } else if (returnPath && returnPath !== '/') {
            navigate(returnPath);
          } else {
            navigate('/');
          }
        }}
        variant="primary"
        className="inline-flex items-center px-4 py-2 mb-6 text-sm font-medium rounded-lg shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {location.state?.fromQuizConfirmation ? 'Volver al Cuestionario' : 'Volver al Dashboard'}
      </QEButton>

      <QuizResults
        result={resultProp}
        quizTitle={quizTitleProp}
        questions={questionsProp}
      />
    </div>
  );
};

export default QuizAttemptDetailsPage;