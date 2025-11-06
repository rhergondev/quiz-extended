import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { getQuiz } from '../../api/services/quizService';
import { getQuestionsByIds } from '../../api/services/questionService';
// 🔥 IMPORTAMOS LA NUEVA FUNCIÓN
import { startQuizAttempt, submitQuizAttempt, calculateCustomQuizResult } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import QuizResults from './QuizResults';
import DrawingCanvas from './DrawingCanvas';
import { PenTool } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useQuizAutosave from '../../hooks/useQuizAutosave';
import quizAutosaveService from '../../api/services/quizAutosaveService';
import QuizRecoveryModal from '../quizzes/QuizRecoveryModal';

const Quiz = ({ quizId, customQuiz = null }) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [startTime, setStartTime] = useState(null); // Para calcular la duración
  const [isDrawingMode, setIsDrawingMode] = useState(false); // Estado para el modo dibujo
  const [timeRemaining, setTimeRemaining] = useState(null); // Tiempo restante del timer
  const [autosaveData, setAutosaveData] = useState(null); // Datos de autoguardado recuperados
  const [showRecoveryModal, setShowRecoveryModal] = useState(false); // Modal de recuperación
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Índice de pregunta actual
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchAndStartQuiz = async () => {
      setStartTime(Date.now()); // Iniciar cronómetro al cargar
      if (customQuiz) {
        setQuizInfo(customQuiz);
        const questionIds = customQuiz.meta?._quiz_question_ids || [];
        
        // Cargar preguntas específicas del quiz personalizado
        if (questionIds.length > 0) {
          setQuestionsLoading(true);
          try {
            const questions = await getQuestionsByIds(questionIds, { batchSize: 30 });
            // Aplicar aleatorización si está configurada
            if (customQuiz.meta?._randomize_questions) {
              const shuffled = [...questions].sort(() => Math.random() - 0.5);
              setQuizQuestions(shuffled);
            } else {
              setQuizQuestions(questions);
            }
          } catch (error) {
            console.error('Error loading custom quiz questions:', error);
            setQuestionsError(error);
          } finally {
            setQuestionsLoading(false);
          }
        }
        setAttemptId('custom-attempt'); // ID de intento simulado
        return;
      }
      
      if (!quizId) return;

      try {
        // Verificar si hay autoguardado antes de iniciar nuevo intento
        const savedProgress = await quizAutosaveService.getQuizAutosave(quizId);
        
        if (savedProgress) {
          // Hay progreso guardado - mostrar modal de recuperación
          setAutosaveData(savedProgress);
          setShowRecoveryModal(true);
          setQuizState('awaiting-recovery'); // Estado especial esperando decisión del usuario
          return;
        }

        // No hay autoguardado - continuar con inicio normal
        const quizData = await getQuiz(quizId);
        setQuizInfo(quizData);
        
        const questionIds = quizData.meta?._quiz_question_ids || [];
        
        // 🔥 CORRECCIÓN: Cargar las preguntas específicas del quiz por sus IDs
        if (questionIds.length > 0) {
          setQuestionsLoading(true);
          try {
            const questions = await getQuestionsByIds(questionIds, { batchSize: 30 });
            // Aplicar aleatorización si está configurada
            if (quizData.meta?._randomize_questions) {
              const shuffled = [...questions].sort(() => Math.random() - 0.5);
              setQuizQuestions(shuffled);
            } else {
              setQuizQuestions(questions);
            }
          } catch (error) {
            console.error('Error loading quiz questions:', error);
            setQuestionsError(error);
          } finally {
            setQuestionsLoading(false);
          }
        }

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

  // Hook de autoguardado - se activa cuando cambian las respuestas
  const { clearAutosave } = useQuizAutosave({
    quizId: quizId,
    quizData: quizInfo,
    currentQuestionIndex,
    answers: userAnswers,
    timeRemaining,
    attemptId,
    enabled: quizState === 'in-progress' && !customQuiz, // Solo autosave para quizzes normales
  });

  useEffect(() => {
      if (quizInfo && attemptId && !questionsLoading) {
          setQuizState('in-progress');
      }
  }, [quizInfo, attemptId, questionsLoading]);

  // Handler para resumir quiz desde autoguardado
  const handleResumeQuiz = async () => {
    if (!autosaveData) return;

    try {
      // Restaurar el estado guardado
      const savedQuizData = typeof autosaveData.quiz_data === 'string' 
        ? JSON.parse(autosaveData.quiz_data) 
        : autosaveData.quiz_data;
      
      const savedAnswers = typeof autosaveData.answers === 'string'
        ? JSON.parse(autosaveData.answers)
        : autosaveData.answers;

      setQuizInfo(savedQuizData);
      
      const questionIds = savedQuizData.meta?._quiz_question_ids || [];
      
      // Cargar preguntas específicas del quiz guardado
      if (questionIds.length > 0) {
        setQuestionsLoading(true);
        try {
          const questions = await getQuestionsByIds(questionIds, { batchSize: 30 });
          setQuizQuestions(questions);
        } catch (error) {
          console.error('Error loading quiz questions on resume:', error);
          setQuestionsError(error);
        } finally {
          setQuestionsLoading(false);
        }
      }
      
      setUserAnswers(savedAnswers);
      setCurrentQuestionIndex(autosaveData.current_question_index || 0);
      setTimeRemaining(autosaveData.time_remaining);
      setAttemptId(autosaveData.attempt_id);
      
      setShowRecoveryModal(false);
      setQuizState('in-progress');
    } catch (error) {
      console.error('Error resuming quiz:', error);
      setQuizState('error');
    }
  };

  // Handler para reiniciar quiz (eliminar autoguardado)
  const handleRestartQuiz = async () => {
    if (!quizId) return;

    try {
      // Eliminar autoguardado
      await quizAutosaveService.deleteAutosave(quizId);
      
      // Iniciar quiz normalmente
      const quizData = await getQuiz(quizId);
      setQuizInfo(quizData);
      
      const questionIds = quizData.meta?._quiz_question_ids || [];
      
      // Cargar preguntas específicas del quiz
      if (questionIds.length > 0) {
        setQuestionsLoading(true);
        try {
          const questions = await getQuestionsByIds(questionIds, { batchSize: 30 });
          // Aplicar aleatorización si está configurada
          if (quizData.meta?._randomize_questions) {
            const shuffled = [...questions].sort(() => Math.random() - 0.5);
            setQuizQuestions(shuffled);
          } else {
            setQuizQuestions(questions);
          }
        } catch (error) {
          console.error('Error loading quiz questions on restart:', error);
          setQuestionsError(error);
        } finally {
          setQuestionsLoading(false);
        }
      }

      const attemptResponse = await startQuizAttempt(quizId);
      if (attemptResponse.attempt_id) {
        setAttemptId(attemptResponse.attempt_id);
      }

      setShowRecoveryModal(false);
      setAutosaveData(null);
    } catch (error) {
      console.error('Error restarting quiz:', error);
      setQuizState('error');
    }
  };

  const handleSelectAnswer = (questionId, answerId) => {
    console.log('🎯 Seleccionando respuesta:', { questionId, answerId, tipo: typeof answerId });
    setUserAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: answerId };
      console.log('📝 Estado actualizado de respuestas:', newAnswers);
      return newAnswers;
    });
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

      console.log('📊 Estado de respuestas antes de formatear:', userAnswers);
      console.log('📋 Preguntas del cuestionario:', quizQuestions.map(q => ({ id: q.id, title: q.title })));

      const formattedAnswers = quizQuestions.map(q => {
        const hasAnswer = userAnswers.hasOwnProperty(q.id);
        const answerGiven = hasAnswer ? userAnswers[q.id] : null;
        console.log(`❓ Pregunta ${q.id}:`, { hasAnswer, answerGiven, isRisked: riskedAnswers.includes(q.id) });
        return {
          question_id: q.id,
          answer_given: answerGiven,
          is_risked: riskedAnswers.includes(q.id)
        };
      });

      console.log('📤 Respuestas formateadas para enviar:', formattedAnswers);

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
          
          console.log('✅ Resultado recibido:', result);
          
          // Limpiar autoguardado después de completar exitosamente
          if (quizId && !customQuiz) {
            await clearAutosave();
          }

          setQuizResult(result);
          setQuizState('submitted');
      } catch (error) {
          console.error("Error al enviar el cuestionario:", error);
          setQuizState('error');
      }
  };

  if (quizState === 'loading' || questionsLoading) {
    return <div className="text-center p-8">Cargando cuestionario...</div>;
  }
  if (quizState === 'awaiting-recovery') {
    return (
      <>
        <div className="text-center p-8">Cargando cuestionario...</div>
        <QuizRecoveryModal
          autosaveData={autosaveData}
          onResume={handleResumeQuiz}
          onRestart={handleRestartQuiz}
          isOpen={showRecoveryModal}
        />
      </>
    );
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
            showRiskSelector={true}
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
                initialTimeRemaining={timeRemaining}
                onTick={(remainingSeconds) => setTimeRemaining(remainingSeconds)}
            />
        </div>
      </aside>
    </div>
  );
};

export default Quiz;