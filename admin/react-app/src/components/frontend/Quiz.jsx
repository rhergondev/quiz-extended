import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useQuestions } from '../../hooks/useQuestions';
import { getQuiz } from '../../api/services/quizService';
// 🔥 IMPORTAMOS LA NUEVA FUNCIÓN
import { startQuizAttempt, submitQuizAttempt, calculateCustomQuizResult } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import QuizResults from './QuizResults';
import DrawingCanvas from './DrawingCanvas';
import { PenTool } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Quiz = ({ quizId, customQuiz = null }) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [questionIds, setQuestionIds] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [startTime, setStartTime] = useState(null); // Para calcular la duración
  const [isDrawingMode, setIsDrawingMode] = useState(false); // Estado para el modo dibujo
  const { theme } = useTheme();

  const {
    questions: allQuestions,
    loading: questionsLoading,
    error: questionsError
  } = useQuestions({ perPage: 100, autoFetch: true });

  useEffect(() => {
    const fetchAndStartQuiz = async () => {
      setStartTime(Date.now()); // Iniciar cronómetro al cargar
      if (customQuiz) {
        setQuizInfo(customQuiz);
        setQuestionIds(customQuiz.meta?._quiz_question_ids || []);
        setAttemptId('custom-attempt'); // ID de intento simulado
        return;
      }
      
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
  }, [quizId, customQuiz]);

  const quizQuestions = useMemo(() => {
    if (questionsLoading || questionIds.length === 0) return [];
    const orderedQuestions = questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
    
    // Shuffle questions randomly for display only
    const shuffled = [...orderedQuestions].sort(() => Math.random() - 0.5);
    return shuffled;
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
          let result;
          // 🔥 CORRECCIÓN: Se reemplaza la simulación por la llamada real a la API.
          if (attemptId === 'custom-attempt' && customQuiz) {
              const questionIds = customQuiz.meta._quiz_question_ids;
              const endTime = Date.now();
              const durationInSeconds = Math.round((endTime - startTime) / 1000);
              
              result = await calculateCustomQuizResult(questionIds, formattedAnswers);
              result.duration_seconds = durationInSeconds; // Añadimos la duración calculada
          } else {
              result = await submitQuizAttempt(attemptId, formattedAnswers);
          }
          
          setQuizResult(result);
          setQuizState('submitted');
      } catch (error) {
          console.error("Error al enviar el cuestionario:", error);
          setQuizState('error');
      }
  };

  if (quizState === 'loading' || (questionIds.length > 0 && questionsLoading)) {
    return <div className="text-center p-8">Cargando cuestionario...</div>;
  }
  if (quizState === 'error' || questionsError) {
      return <div className="text-center p-8 text-red-600">No se pudo cargar el cuestionario.</div>
  }
  if (quizState === 'submitting') {
      return <div className="text-center p-8">Enviando respuestas...</div>
  }
  if (quizState === 'submitted') {
      return <QuizResults result={quizResult} quizTitle={quizInfo?.title?.rendered} questions={quizQuestions} />;
  }
  if (quizQuestions.length === 0 && !questionsLoading) {
      return <div className="text-center p-8 text-gray-600">Este cuestionario no tiene preguntas.</div>
  }

  const timeLimit = quizInfo?.meta?._time_limit || 0;

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 flex flex-col lg:flex-row gap-8 h-[100%] relative">
      {/* Botón flotante para activar modo dibujo - Arriba a la derecha */}
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        className="fixed top-6 right-6 z-40 p-3 rounded-full shadow-lg transition-all duration-300 text-white"
        style={{
          backgroundColor: isDrawingMode ? '#dc2626' : theme.primary,
          transform: isDrawingMode ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
        onMouseEnter={(e) => {
          if (!isDrawingMode) e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          if (!isDrawingMode) e.currentTarget.style.transform = 'scale(1)';
        }}
        title={isDrawingMode ? 'Desactivar herramientas de dibujo' : 'Activar herramientas de dibujo'}
      >
        <PenTool 
          className="w-6 h-6 transition-transform duration-300" 
          style={{ transform: isDrawingMode ? 'rotate(-45deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Canvas de dibujo */}
      <DrawingCanvas 
        isActive={isDrawingMode} 
        onClose={() => setIsDrawingMode(false)} 
      />

      {/* Columna de Preguntas (con scroll interno) */}
      <main className="w-full lg:w-2/3 lg:overflow-y-auto lg:pr-4">
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
      </main>

      {/* Columna de la Barra Lateral y Reloj */}
      <aside className="w-full lg:w-1/3">
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
      </aside>
    </div>
  );
};

export default Quiz;