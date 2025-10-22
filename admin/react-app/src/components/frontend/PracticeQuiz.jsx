import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, BookCheck } from 'lucide-react';

// Components
import Question from './Question';
import PracticeResults from './PracticeResults';

// Hooks
import useQuestions from '../../hooks/useQuestions';

const PracticeQuiz = ({ quizId, customQuiz = null, customQuestions = null }) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  const { questions: fetchedQuestions, loading } = useQuestions({
    quiz: quizId !== 'practice' ? quizId : null,
    autoFetch: quizId !== 'practice',
  });

  const quiz = customQuiz;
  
  // Use custom questions if provided, otherwise use fetched questions
  const availableQuestions = customQuestions || fetchedQuestions;

  // Obtener preguntas ordenadas del quiz
  const orderedQuestions = useMemo(() => {
    if (!quiz?.meta?._quiz_question_ids) return [];
    
    const questionIds = quiz.meta._quiz_question_ids;

    return questionIds
      .map(id => availableQuestions.find(q => q.id === parseInt(id)))
      .filter(Boolean);
  }, [quiz, availableQuestions]);

  // Randomizar preguntas para el modo práctica
  const quizQuestions = useMemo(() => {
    if (!orderedQuestions.length) return [];
    const shuffled = [...orderedQuestions].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [orderedQuestions]);

  const currentQuestion = quizQuestions[currentQuestionIndex];

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, quizQuestions.length]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleComplete = useCallback(() => {
    setIsCompleted(true);
  }, []);

  const handleBackToConfig = useCallback(() => {
    navigate('/test/practice');
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando práctica...</p>
        </div>
      </div>
    );
  }

  if (!quiz || quizQuestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <BookCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          No hay preguntas disponibles
        </h2>
        <p className="text-gray-600 mb-4">
          No se encontraron preguntas con los filtros seleccionados.
        </p>
        <button
          onClick={handleBackToConfig}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver a configurar
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <PracticeResults
        questions={quizQuestions}
        answers={answers}
        onBackToConfig={handleBackToConfig}
      />
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Barra de progreso */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <BookCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Pregunta {currentQuestionIndex + 1} de {quizQuestions.length}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            {answeredCount} / {quizQuestions.length} respondidas
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pregunta actual */}
      {currentQuestion && (
        <div className="mb-6">
          <Question
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            selectedAnswer={answers[currentQuestion.id]}
            onAnswerChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            disabled={false}
            showCorrectAnswer={false}
            isPracticeMode={true}
          />
        </div>
      )}

      {/* Navegación */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </button>

          <div className="flex items-center space-x-2">
            {quizQuestions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[quizQuestions[index].id]
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === quizQuestions.length - 1 ? (
            <button
              onClick={handleComplete}
              className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalizar
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          💡 <strong>Modo práctica:</strong> Tómate tu tiempo. No hay límite de tiempo ni penalizaciones. 
          Podrás ver las respuestas correctas al finalizar.
        </p>
      </div>
    </div>
  );
};

export default PracticeQuiz;
