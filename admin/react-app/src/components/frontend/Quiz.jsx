import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { getQuiz } from '../../api/services/quizService';
import useQuizQuestions from '../../hooks/useQuizQuestions';
import { getQuestionsByIds } from '../../api/services/questionService';
// 🔥 IMPORTAMOS LA NUEVA FUNCIÓN
import { startQuizAttempt, submitQuizAttempt, calculateCustomQuizResult } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import QuizResults from './QuizResults';
import DrawingCanvas from './DrawingCanvas';
import { PenTool, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useQuizAutosave from '../../hooks/useQuizAutosave';
import quizAutosaveService from '../../api/services/quizAutosaveService';
import QuizRecoveryModal from '../quizzes/QuizRecoveryModal';

const Quiz = ({ quizId, customQuiz = null, onQuizComplete }) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [questionIds, setQuestionIds] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [finalQuestions, setFinalQuestions] = useState([]); // Full question list used for results
  const [startTime, setStartTime] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [autosaveData, setAutosaveData] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { getColor } = useTheme();

  // Use paginated hook for loading questions
  const { 
    questions: quizQuestions, 
    loading: questionsLoading, 
    error: questionsError,
    checkPrefetch,
    loadMore,
    hasMore: hasMoreQuestions,
    loadedCount,
    totalCount: totalQuestions,
    currentPage
  } = useQuizQuestions(questionIds, {
    enabled: quizState === 'in-progress' || quizState === 'loading',
    questionsPerPage: 50, // 🔥 PAGINATION: 50 questions per page
    prefetchThreshold: 5, // 🔥 PAGINATION: Prefetch when 5 questions from end of current page
    randomize: quizInfo?.meta?._randomize_questions || false
  });

  // Auto-prefetch questions as user progresses
  useEffect(() => {
    if (quizState === 'in-progress' && currentQuestionIndex >= 0) {
      checkPrefetch(currentQuestionIndex);
    }
  }, [currentQuestionIndex, quizState, checkPrefetch]);

  // 🔥 NEW: Auto-prefetch based on answered questions count
  useEffect(() => {
    if (quizState === 'in-progress' && Object.keys(userAnswers).length > 0) {
      const answeredCount = Object.keys(userAnswers).length;
      // Trigger prefetch when user has answered enough questions
      checkPrefetch(answeredCount);
    }
  }, [userAnswers, quizState, checkPrefetch]);

  useEffect(() => {
    const fetchAndStartQuiz = async () => {
      setStartTime(Date.now());
      
      if (customQuiz) {
        setQuizInfo(customQuiz);
        const ids = customQuiz.meta?._quiz_question_ids || [];
        setQuestionIds(ids); // Set IDs, let hook handle loading
        setAttemptId('custom-attempt');
        return;
      }
      
      if (!quizId) return;

      try {
        // Check for autosave
        const savedProgress = await quizAutosaveService.getQuizAutosave(quizId);
        
        if (savedProgress) {
          setAutosaveData(savedProgress);
          setShowRecoveryModal(true);
          setQuizState('awaiting-recovery');
          return;
        }

        // Load quiz data
        const quizData = await getQuiz(quizId);
        console.log('✅ Quiz data loaded:', quizData);
        setQuizInfo(quizData);
        
        const ids = quizData.meta?._quiz_question_ids || [];
        console.log('📋 Question IDs from quiz:', ids);
        
        // Set question IDs - useQuizQuestions hook will handle lazy loading
        setQuestionIds(ids);

        // Start attempt
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
      if (quizInfo && attemptId) {
          // Si tenemos quiz info y attempt ID, podemos mostrar el quiz
          // Incluso si loadedCount es 0, el mensaje apropiado se mostrará más abajo
          console.log('🎯 Changing quiz state to in-progress', {
            quizInfo: !!quizInfo,
            attemptId,
            questionsLoading,
            loadedCount,
            totalQuestions
          });
          
          // Solo cambiar a in-progress si:
          // 1. Ya tenemos preguntas cargadas (loadedCount > 0), o
          // 2. No estamos cargando y el quiz no tiene preguntas (questionIds.length === 0)
          if (loadedCount > 0 || (!questionsLoading && questionIds.length === 0)) {
            setQuizState('in-progress');
          }
      }
  }, [quizInfo, attemptId, questionsLoading, loadedCount, totalQuestions, questionIds.length]);

  // 🔥 Timeout de seguridad: si después de 10 segundos aún está en loading, mostrar error
  useEffect(() => {
    if (quizState === 'loading' && quizInfo && attemptId) {
      const timeoutId = setTimeout(() => {
        if (loadedCount === 0 && !questionsLoading) {
          console.warn('⚠️ Quiz loading timeout - forcing in-progress state');
          setQuizState('in-progress');
        }
      }, 10000); // 10 segundos
      
      return () => clearTimeout(timeoutId);
    }
  }, [quizState, quizInfo, attemptId, loadedCount, questionsLoading]);

  // Handler para resumir quiz desde autoguardado
  const handleResumeQuiz = async () => {
    if (!autosaveData) return;

    try {
      const savedQuizData = typeof autosaveData.quiz_data === 'string' 
        ? JSON.parse(autosaveData.quiz_data) 
        : autosaveData.quiz_data;
      
      const savedAnswers = typeof autosaveData.answers === 'string'
        ? JSON.parse(autosaveData.answers)
        : autosaveData.answers;

      setQuizInfo(savedQuizData);
      
      const ids = savedQuizData.meta?._quiz_question_ids || [];
      setQuestionIds(ids); // Let hook handle loading
      
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
      await quizAutosaveService.deleteAutosave(quizId);
      
      const quizData = await getQuiz(quizId);
      setQuizInfo(quizData);
      
      const ids = quizData.meta?._quiz_question_ids || [];
      setQuestionIds(ids); // Let hook handle loading

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
      // Ensure we submit answers for ALL questions in the quiz (not only the ones already loaded)
      let questionsForSubmission = quizQuestions;
      if (questionIds && questionIds.length > quizQuestions.length) {
        try {
          // Fetch missing questions in batches
          questionsForSubmission = await getQuestionsByIds(questionIds, { batchSize: 50 });
          console.log(`📥 Fetched ${questionsForSubmission.length} questions for submission`);
        } catch (err) {
          console.warn('⚠️ Failed to fetch all questions before submit, falling back to loaded questions', err);
          questionsForSubmission = quizQuestions;
        }
      }

      const formattedAnswers = questionsForSubmission.map(q => {
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

          // Save the full question list we used for results display
          setFinalQuestions(questionsForSubmission || quizQuestions);

          setQuizResult(result);
          setQuizState('submitted');
          
          // 🎯 Llamar al callback de completado si existe
          if (onQuizComplete && typeof onQuizComplete === 'function') {
            console.log('🎯 Calling onQuizComplete callback');
            onQuizComplete();
          }
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
      const errorMessage = questionsError?.message || 'No se pudo cargar el cuestionario.';
      return (
        <div className="text-center p-8 text-red-600">
          <p className="font-semibold mb-2">Error al cargar el cuestionario</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      );
  }
  if (quizState === 'submitting') {
      return <div className="text-center p-8">Enviando respuestas...</div>
  }
  if (quizState === 'submitted') {
    const resultsQuestions = finalQuestions && finalQuestions.length > 0 ? finalQuestions : quizQuestions;
    return <QuizResults result={quizResult} quizTitle={quizInfo?.title?.rendered || quizInfo?.title} questions={resultsQuestions} />;
  }
  
  // Solo mostrar este mensaje si el quiz está cargado pero no tiene IDs de preguntas
  if (quizInfo && quizQuestions.length === 0 && !questionsLoading && questionIds.length === 0) {
      return <div className="text-center p-8 text-gray-600">Este cuestionario no tiene preguntas asignadas.</div>
  }

  const timeLimit = quizInfo?.meta?._time_limit || 0;

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 flex flex-col lg:flex-row gap-8 h-[100%] relative">
      {/* Botón flotante para activar modo dibujo - Arriba a la derecha */}
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        className="fixed top-6 right-6 z-40 p-3 rounded-full shadow-lg transition-all duration-300 text-white"
        style={{
          backgroundColor: isDrawingMode ? '#dc2626' : getColor('primary', '#3b82f6'),
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
        
        {/* Loading indicator for lazy loading */}
        {questionsLoading && hasMoreQuestions && (
          <div className="flex items-center justify-center p-8 text-gray-500">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando más preguntas... ({loadedCount}/{totalQuestions})</span>
          </div>
        )}
      </main>

      {/* Columna de la Barra Lateral y Reloj */}
      <aside className="w-full lg:w-1/3">
        <div className="sticky top-4 space-y-4">
            <QuizSidebar
              questions={quizQuestions}
              questionIds={questionIds}
              totalCount={totalQuestions}
              userAnswers={userAnswers}
              riskedAnswers={riskedAnswers}
                onSubmit={handleSubmit}
                loadingMore={questionsLoading}
                loadedCount={loadedCount}
                hasMore={hasMoreQuestions}
                onLoadMore={() => {
                  // Manual fallback to trigger loading the next batch
                  console.log('🖱️ Manual load more requested');
                  // call loadMore from hook if available via checkPrefetch fallback
                  // useQuizQuestions exposes loadMore via its return; call via checkPrefetch with a negative index to force
                  // But we have loadMore directly available from the hook; call checkPrefetch with large index to prompt loadMore
                  // Simpler: call checkPrefetch with loadedCount to let hook decide
                  try {
                    if (typeof loadMore === 'function') {
                      loadMore();
                    } else {
                      // fallback to checkPrefetch if loadMore isn't available
                      checkPrefetch(loadedCount);
                    }
                  } catch (e) {
                    console.warn('Manual loadMore fallback triggered', e);
                  }
                }}
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