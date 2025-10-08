// src/components/frontend/Quiz.jsx
import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useQuestions } from '../../hooks/useQuestions';
import { getQuiz } from '../../api/services/quizService';
import { startQuizAttempt, submitQuizAttempt } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import QuizResults from './QuizResults'; // Importado

const Quiz = ({ quizId }) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [questionIds, setQuestionIds] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null); // <-- NUEVO: Estado para el resultado

  const {
    questions: allQuestions,
    loading: questionsLoading,
    error: questionsError
  } = useQuestions({ perPage: 100, autoFetch: true });

  useEffect(() => {
    const fetchAndStartQuiz = async () => {
      if (!quizId) return;
      try {
        const quizData = await getQuiz(quizId);
        setQuizInfo(quizData);
        setQuestionIds(quizData.meta?._quiz_question_ids || []);

        const attemptResponse = await startQuizAttempt(quizId);
        if (attemptResponse.attempt_id) {
          setAttemptId(attemptResponse.attempt_id);
        } else {
          throw new Error("Failed to get a valid attempt ID.");
        }
      } catch (error) {
        console.error("Error fetching or starting quiz:", error);
        setQuizState('error');
      }
    };
    fetchAndStartQuiz();
  }, [quizId]);

  const quizQuestions = useMemo(() => {
    if (questionsLoading || questionIds.length === 0) return [];
    return questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
  }, [questionIds, allQuestions, questionsLoading]);

  useEffect(() => {
      if (quizInfo && attemptId && !questionsLoading && (quizQuestions.length > 0 || questionIds.length === 0)) {
          setQuizState('in-progress');
      }
  }, [quizInfo, attemptId, questionsLoading, quizQuestions, questionIds]);

  const handleSelectAnswer = (questionId, answerId) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerId }));
  };

  const handleToggleRisk = (questionId) => {
    setRiskedAnswers(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleClearAnswer = (questionId) => {
    setUserAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
    setRiskedAnswers(prev => prev.filter(id => id !== questionId));
  };

  const handleSubmit = async () => {
      if (!attemptId) {
          console.error("Cannot submit without an attempt ID.");
          setQuizState('error');
          return;
      }
      setQuizState('submitting');

      const formattedAnswers = quizQuestions.map(q => ({
          question_id: q.id,
          answer_given: userAnswers.hasOwnProperty(q.id) ? userAnswers[q.id] : null,
          is_risked: riskedAnswers.includes(q.id)
      }));

      try {
          const result = await submitQuizAttempt(attemptId, formattedAnswers);
          setQuizResult(result); // <-- NUEVO: Guardar el resultado
          setQuizState('submitted');
      } catch (error) {
          console.error("Error al enviar el cuestionario:", error);
          setQuizState('error');
      }
  };

  // --- LÓGICA DE RENDERIZADO (ACTUALIZADA) ---

  if (quizState === 'loading' || (questionIds.length > 0 && questionsLoading)) {
    return <div className="text-center p-8">Cargando cuestionario...</div>;
  }
  if (quizState === 'error' || questionsError) {
      return <div className="text-center p-8 text-red-600">No se pudo cargar el cuestionario.</div>
  }
  if (quizState === 'submitting') {
      return <div className="text-center p-8">Enviando respuestas...</div>
  }
  // --- NUEVA VISTA DE RESULTADOS ---
  if (quizState === 'submitted') {
      return <QuizResults result={quizResult} quizTitle={quizInfo?.title?.rendered} />;
  }
  if (quizQuestions.length === 0 && !questionsLoading) {
      return <div className="text-center p-8 text-gray-600">Este cuestionario no tiene preguntas.</div>
  }

  const timeLimit = quizInfo?.meta?._time_limit || 0;

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 flex flex-col lg:flex-row gap-8">
      {/* Columna de Preguntas */}
      <div className="w-full lg:w-2/3">
        {quizQuestions.map((question, index) => (
          <Question
            key={question.id}
            question={question}
            index={index}
            selectedAnswer={userAnswers[question.id]}
            isRisked={riskedAnswers.includes(question.id)}
            onSelectAnswer={handleSelectAnswer}
            onToggleRisk={handleToggleRisk}
            onClearAnswer={handleClearAnswer}
            isSubmitted={quizState === 'submitted' || quizState === 'submitting'}
          />
        ))}
      </div>

      {/* Columna de la Barra Lateral y Reloj */}
      <div className="w-full lg:w-1/3">
        <div className="sticky top-4 space-y-4">
            <QuizSidebar
              questions={quizQuestions}
              userAnswers={userAnswers}
              riskedAnswers={riskedAnswers}
              onSubmit={handleSubmit}
            />
            <Timer
                durationMinutes={timeLimit}
                onTimeUp={handleSubmit}
                isPaused={quizState === 'submitted' || quizState === 'submitting'}
            />
        </div>
      </div>
    </div>
  );
};

export default Quiz;