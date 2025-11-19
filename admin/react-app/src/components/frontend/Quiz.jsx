import React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getQuiz } from '../../api/services/quizService';
import useQuizQuestions from '../../hooks/useQuizQuestions';
import { getQuestionsByIds } from '../../api/services/questionService';
import { startQuizAttempt, submitQuizAttempt, calculateCustomQuizResult } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import DrawingCanvas from './DrawingCanvas';
import { Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useQuizAutosave from '../../hooks/useQuizAutosave';
import quizAutosaveService from '../../api/services/quizAutosaveService';
import QuizRecoveryModal from '../quizzes/QuizRecoveryModal';

const Quiz = ({ 
  quizId, 
  lessonId = null,
  customQuiz = null, 
  onQuizComplete,
  isDrawingMode, 
  setIsDrawingMode, 
  isDrawingEnabled, 
  setIsDrawingEnabled, 
  showDrawingToolbar, 
  setShowDrawingToolbar,
  drawingTool,
  drawingColor,
  drawingLineWidth,
  onClearCanvas
}) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [questionIds, setQuestionIds] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [finalQuestions, setFinalQuestions] = useState([]); // Full question list used for results
  const [startTime, setStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [autosaveData, setAutosaveData] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { getColor } = useTheme();
  const { t } = useTranslation();
  const questionsContainerRef = useRef(null);

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
    if (quizState === 'in-progress' && Object.keys(userAnswers).length > 0) {
      const answeredCount = Object.keys(userAnswers).length;
      const remainingLoaded = loadedCount - answeredCount;
      
      if (remainingLoaded <= 10 && hasMoreQuestions && !questionsLoading) {
        checkPrefetch(answeredCount);
      }
    }
  }, [userAnswers, quizState, checkPrefetch, loadedCount, hasMoreQuestions, questionsLoading]);

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

      console.log('🚀 Starting Quiz Attempt:', { quizId, lessonId });

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
        setQuizInfo(quizData);
        
        const ids = quizData.meta?._quiz_question_ids || [];
        
        // Set question IDs - useQuizQuestions hook will handle lazy loading
        setQuestionIds(ids);

        // Start attempt
        const attemptResponse = await startQuizAttempt(quizId, lessonId);
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
  }, [quizId, customQuiz, lessonId]);

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
      if (quizInfo && attemptId && quizState === 'loading') {
          // Cambiar a in-progress cuando las preguntas estén cargadas
          // o cuando el quiz no tenga preguntas
          if (loadedCount > 0 || (!questionsLoading && questionIds.length === 0)) {
            setQuizState('in-progress');
          }
      }
  }, [quizInfo, attemptId, questionsLoading, loadedCount, totalQuestions, questionIds.length, quizState]);

  // Asegurar que el hook de preguntas se active correctamente
  useEffect(() => {
    if (quizState === 'loading' && questionIds.length > 0 && quizInfo && attemptId && loadedCount === 0 && !questionsLoading) {
      const timeoutId = setTimeout(() => {
        // Si después de 2 segundos no se han cargado preguntas, puede haber un problema
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [quizState, questionIds.length, quizInfo, attemptId, loadedCount, questionsLoading]);

  // Timeout de seguridad: forzar in-progress después de 10 segundos
  useEffect(() => {
    if (quizState === 'loading' && quizInfo && attemptId) {
      const timeoutId = setTimeout(() => {
        if (loadedCount === 0 && !questionsLoading) {
          setQuizState('in-progress');
        }
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [quizState, quizInfo, attemptId, loadedCount, questionsLoading]);

  // Handler para resumir quiz desde autoguardado
  const handleResumeQuiz = async () => {
    if (!autosaveData) return;

    try {
      // Cambiar a loading temporalmente
      setQuizState('loading');
      
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
      
      // Esperar a que el hook cargue las preguntas
      // El useEffect cambiará el estado a 'in-progress' cuando estén cargadas
    } catch (error) {
      console.error('Error resuming quiz:', error);
      setQuizState('error');
    }
  };

  // Handler para reiniciar quiz (eliminar autoguardado)
  const handleRestartQuiz = async () => {
    if (!quizId) return;

    try {
      // Cambiar a loading mientras se reinicia
      setQuizState('loading');
      
      await quizAutosaveService.deleteAutosave(quizId);
      
      const quizData = await getQuiz(quizId);
      setQuizInfo(quizData);
      
      const ids = quizData.meta?._quiz_question_ids || [];
      setQuestionIds(ids); // Let hook handle loading

      const attemptResponse = await startQuizAttempt(quizId, lessonId);
      if (attemptResponse.attempt_id) {
        setAttemptId(attemptResponse.attempt_id);
      } else {
        throw new Error("Failed to get a valid attempt ID.");
      }

      setShowRecoveryModal(false);
      setAutosaveData(null);
      
      // El estado cambiará a 'in-progress' cuando las preguntas se carguen
      // gracias al useEffect que monitorea quizInfo y attemptId
    } catch (error) {
      console.error('Error restarting quiz:', error);
      setQuizState('error');
    }
  };

  const handleSelectAnswer = (questionId, answerId) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
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
          setQuizState('error');
          return;
      }
      setQuizState('submitting');

      // Ensure we submit answers for ALL questions in the quiz
      let questionsForSubmission = quizQuestions;
      if (questionIds && questionIds.length > quizQuestions.length) {
        try {
          questionsForSubmission = await getQuestionsByIds(questionIds, { batchSize: 50 });
        } catch (err) {
          questionsForSubmission = quizQuestions;
        }
      }

      const formattedAnswers = questionsForSubmission.map(q => ({
        question_id: q.id,
        answer_given: userAnswers.hasOwnProperty(q.id) ? userAnswers[q.id] : null,
        is_risked: riskedAnswers.includes(q.id)
      }));

      try {
          let result;
          if (attemptId === 'custom-attempt' && customQuiz) {
              const questionIds = customQuiz.meta._quiz_question_ids;
              const endTime = Date.now();
              const durationInSeconds = Math.round((endTime - startTime) / 1000);
              
              result = await calculateCustomQuizResult(questionIds, formattedAnswers);
              result.duration_seconds = durationInSeconds;
          } else {
              result = await submitQuizAttempt(attemptId, formattedAnswers);
          }
          
          // Limpiar autoguardado después de completar exitosamente
          if (quizId && !customQuiz) {
            await clearAutosave();
          }

          // Save the full question list we used for results display
          const fullQuestions = questionsForSubmission || quizQuestions;
          setFinalQuestions(fullQuestions);

          setQuizResult(result);
          setQuizState('submitted');
          
          // Pasar los resultados al callback para que el padre los maneje
          if (onQuizComplete && typeof onQuizComplete === 'function') {
            onQuizComplete(result, fullQuestions, quizInfo);
          }
      } catch (error) {
          setQuizState('error');
      }
  };

  if (quizState === 'loading' || questionsLoading) {
    return <div className="text-center p-8">{t('quizzes.quiz.loadingQuiz')}</div>;
  }
  if (quizState === 'awaiting-recovery') {
    return (
      <>
        <div className="text-center p-8">{t('quizzes.quiz.loadingQuiz')}</div>
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
      const errorMessage = questionsError?.message || t('quizzes.quiz.errorLoadingQuiz');
      return (
        <div className="text-center p-8 text-red-600">
          <p className="font-semibold mb-2">{t('quizzes.quiz.errorTitle')}</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      );
  }
  if (quizState === 'submitting') {
      return <div className="text-center p-8">{t('quizzes.quiz.submittingAnswers')}</div>
  }
  if (quizState === 'submitted') {
    // El quiz ha sido enviado, el padre debería manejar los resultados
    // Mostrar un mensaje mientras se procesa
    return <div className="text-center p-8">{t('quizzes.quiz.submittingAnswers')}</div>
  }
  
  if (quizInfo && quizQuestions.length === 0 && !questionsLoading && questionIds.length === 0) {
      return <div className="text-center p-8 text-gray-600">{t('quizzes.quiz.noQuestionsAssigned')}</div>
  }

  const timeLimit = quizInfo?.meta?._time_limit || 0;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
      <div className="flex-1 overflow-hidden">
        <div className="w-full max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-8 h-full px-6">
          {/* Columna de Preguntas (con scroll interno y canvas de dibujo) */}
          <main ref={questionsContainerRef} className="w-full lg:w-2/3 lg:overflow-y-auto lg:pr-4 relative pt-6 pb-6">
            {/* Canvas de dibujo relativo al contenedor */}
            {isDrawingMode && (
              <DrawingCanvas 
                isActive={isDrawingMode}
                isDrawingEnabled={isDrawingEnabled}
                tool={drawingTool}
                color={drawingColor}
                lineWidth={drawingLineWidth}
                onClose={() => {
                  setIsDrawingMode(false);
                  setIsDrawingEnabled(false);
                  setShowDrawingToolbar(false);
                }}
                onClear={onClearCanvas}
                containerRef={questionsContainerRef}
                showToolbar={false}
              />
            )}
            
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
        
        {/* Botón cargar más preguntas al final del quiz */}
        {hasMoreQuestions && (
          <div className="mt-8 mb-4 flex flex-col items-center gap-4">
            {questionsLoading ? (
              // Loading state
              <div className="flex flex-col items-center justify-center p-8 gap-3">
                <Loader className="w-8 h-8 animate-spin" style={{ color: getColor('primary', '#3b82f6') }} />
                <div className="text-center">
                  <p className="font-medium" style={{ color: getColor('primary', '#3b82f6') }}>
                    {t('quizzes.quiz.loadingMoreQuestions')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('quizzes.quiz.questionsLoadedCount', { loaded: loadedCount, total: totalQuestions })}
                  </p>
                </div>
              </div>
            ) : (
              // Load more button
              <button
                onClick={() => {
                  if (typeof loadMore === 'function') {
                    loadMore();
                  } else {
                    checkPrefetch(loadedCount);
                  }
                }}
                className="px-8 py-3.5 rounded-lg font-semibold transition-all duration-200 border-2 shadow-sm hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                style={{
                  backgroundColor: getColor('primary', '#3b82f6') + '10',
                  borderColor: getColor('primary', '#3b82f6'),
                  color: getColor('primary', '#3b82f6')
                }}
              >
                {t('quizzes.sidebar.loadMore')}
              </button>
            )}
            <p className="text-sm text-gray-500">
              {t('quizzes.quiz.questionsLoadedCount', { loaded: loadedCount, total: totalQuestions })}
            </p>
          </div>
        )}
        
      </main>

      {/* Columna de la Barra Lateral y Reloj */}
      <aside className="w-full lg:w-1/3 flex-shrink-0 pt-6 pb-6">
        <div className="space-y-4">
            <QuizSidebar
              questions={quizQuestions}
              questionIds={questionIds}
              totalCount={totalQuestions}
              userAnswers={userAnswers}
              riskedAnswers={riskedAnswers}
              onSubmit={handleSubmit}
              loadedCount={loadedCount}
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
      </div>
    </div>
  );
};

export default Quiz;