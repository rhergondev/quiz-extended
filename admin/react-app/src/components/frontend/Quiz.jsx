import React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getQuiz } from '../../api/services/quizService';
import useQuizQuestions from '../../hooks/useQuizQuestions';
import { getQuestionsByIds } from '../../api/services/questionService';
import { startQuizAttempt, submitQuizAttempt, calculateCustomQuizResult } from '../../api/services/quizAttemptService';
import Question from './Question';
import QuizSidebar from './QuizSidebar';
import Timer from './Timer';
import DrawingCanvas from './DrawingCanvas';
import DrawingToolbar from './DrawingToolbar';
import { Loader, Menu, X, ChevronLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useQuizAutosave from '../../hooks/useQuizAutosave';
import quizAutosaveService from '../../api/services/quizAutosaveService';
import QuizRecoveryModal from '../quizzes/QuizRecoveryModal';

// 🔥 Module-level guards to prevent React Strict Mode double mounting issues
const activeQuizAttempts = new Map(); // Map<quizKey, attemptId>
const activeSubmissions = new Set(); // Set<attemptId>

const Quiz = ({
  quizId,
  lessonId = null,
  courseId = null,
  customQuiz = null,
  onQuizComplete,
  onQuizStateChange,
  onExit,
  hideDarkModeToggle = false,
  isDrawingMode, 
  setIsDrawingMode, 
  isDrawingEnabled, 
  setIsDrawingEnabled, 
  showDrawingToolbar, 
  setShowDrawingToolbar,
  drawingTool,
  drawingColor,
  drawingLineWidth,
  onDrawingToolChange,
  onDrawingColorChange,
  onDrawingLineWidthChange,
  onClearCanvas
}) => {
  const [quizInfo, setQuizInfo] = useState(null);
  const [questionIds, setQuestionIds] = useState([]);
  const [preservedQuestionOrder, setPreservedQuestionOrder] = useState(null); // 🔥 FIX: For recovery - preserve shuffle order
  const [userAnswers, setUserAnswers] = useState({});
  const [riskedAnswers, setRiskedAnswers] = useState([]);
  const [quizState, setQuizState] = useState('loading');
  const [quizErrorMessage, setQuizErrorMessage] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [finalQuestions, setFinalQuestions] = useState([]); // Full question list used for results
  const [startTime, setStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [autosaveData, setAutosaveData] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizSidebarOpen, setIsQuizSidebarOpen] = useState(false);
  const [clearCanvasCallback, setClearCanvasCallback] = useState(null);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Internal drawing states (fallback if not provided via props)
  const [internalDrawingMode, setInternalDrawingMode] = useState(false);
  const [internalDrawingEnabled, setInternalDrawingEnabled] = useState(false);
  const [internalShowToolbar, setInternalShowToolbar] = useState(false);
  const [internalDrawingTool, setInternalDrawingTool] = useState('highlighter');
  const [internalDrawingColor, setInternalDrawingColor] = useState('#ffff00');
  const [internalDrawingLineWidth, setInternalDrawingLineWidth] = useState(2);
  
  // Use props if provided, otherwise use internal state
  const currentDrawingMode = isDrawingMode !== undefined ? isDrawingMode : internalDrawingMode;
  const currentDrawingEnabled = isDrawingEnabled !== undefined ? isDrawingEnabled : internalDrawingEnabled;
  const currentShowToolbar = showDrawingToolbar !== undefined ? showDrawingToolbar : internalShowToolbar;
  const currentDrawingTool = drawingTool || internalDrawingTool;
  const currentDrawingColor = drawingColor || internalDrawingColor;
  const currentDrawingLineWidth = drawingLineWidth || internalDrawingLineWidth;
  
  const handleSetDrawingMode = (value) => setIsDrawingMode ? setIsDrawingMode(value) : setInternalDrawingMode(value);
  const handleSetDrawingEnabled = (value) => setIsDrawingEnabled ? setIsDrawingEnabled(value) : setInternalDrawingEnabled(value);
  const handleSetShowToolbar = (value) => setShowDrawingToolbar ? setShowDrawingToolbar(value) : setInternalShowToolbar(value);
  const handleSetDrawingTool = (value) => {
    console.log('🔧 Setting drawing tool:', value);
    if (onDrawingToolChange) {
      onDrawingToolChange(value);
    } else {
      setInternalDrawingTool(value);
    }
  };
  const handleSetDrawingColor = (value) => {
    console.log('🎨 Setting drawing color:', value);
    if (onDrawingColorChange) {
      onDrawingColorChange(value);
    } else {
      setInternalDrawingColor(value);
    }
  };
  const handleSetDrawingLineWidth = (value) => {
    console.log('📏 Setting line width:', value);
    if (onDrawingLineWidthChange) {
      onDrawingLineWidthChange(value);
    } else {
      setInternalDrawingLineWidth(value);
    }
  };
  
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();
  const questionsContainerRef = useRef(null);
  const pageScrollRef = useRef(null);

  // Dark mode aware colors
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c');
  const textMuted = isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280';

  // Notify parent of quiz state changes for Focus Mode
  useEffect(() => {
    if (onQuizStateChange && typeof onQuizStateChange === 'function') {
      onQuizStateChange(quizState);
    }
  }, [quizState, onQuizStateChange]);

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
    currentPage,
    orderedQuestionIds // 🔥 FIX: Get the actual order being used (for autosave)
  } = useQuizQuestions(questionIds, {
    enabled: quizState === 'in-progress' || quizState === 'loading',
    questionsPerPage: 50, // 🔥 PAGINATION: 50 questions per page
    prefetchThreshold: 5, // 🔥 PAGINATION: Prefetch when 5 questions from end of current page
    randomize: quizInfo?.meta?._randomize_questions || false,
    preservedOrder: preservedQuestionOrder // 🔥 FIX: Use preserved order if recovering
  });

  // 🔥 NUEVO: Intersection Observer para carga automática basada en scroll
  const loadMoreTriggerRef = useRef(null);
  
  useEffect(() => {
    // Solo activar cuando estamos en progreso y hay más preguntas por cargar
    if (quizState !== 'in-progress' || !hasMoreQuestions || questionsLoading) {
      return;
    }

    const triggerElement = loadMoreTriggerRef.current;
    if (!triggerElement) return;

    // Configurar Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        // Si el trigger es visible y hay más preguntas, cargar automáticamente
        if (entry.isIntersecting && hasMoreQuestions && !questionsLoading) {
          console.log('👁️ Trigger visible - Auto-loading more questions...');
          if (typeof loadMore === 'function') {
            loadMore();
          }
        }
      },
      {
        root: pageScrollRef.current,
        rootMargin: '200px', // Cargar cuando está a 200px de ser visible
        threshold: 0.1
      }
    );

    observer.observe(triggerElement);

    return () => {
      if (triggerElement) {
        observer.unobserve(triggerElement);
      }
    };
  }, [quizState, hasMoreQuestions, questionsLoading, loadMore]);

  // 🔥 Ref to prevent double quiz start in React Strict Mode
  const attemptStartedRef = useRef(false);

  useEffect(() => {
    const fetchAndStartQuiz = async () => {
      // 🔥 FIX: Simple ref-based guard for React Strict Mode
      if (attemptStartedRef.current) {
        console.log('⚠️ Quiz attempt already started by this component, skipping');
        return;
      }

      attemptStartedRef.current = true;
      const quizKey = `${quizId}-${lessonId || 'no-lesson'}`;

      setStartTime(Date.now());

      if (customQuiz) {
        setQuizInfo(customQuiz);
        const ids = customQuiz.meta?._quiz_question_ids || [];
        setQuestionIds(ids);
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
        setQuestionIds(ids);

        // Start attempt
        const attemptResponse = await startQuizAttempt(quizId, lessonId, courseId);
        if (attemptResponse.attempt_id) {
          setAttemptId(attemptResponse.attempt_id);
          activeQuizAttempts.set(quizKey, attemptResponse.attempt_id); // 🔥 Store for submission cleanup
          console.log('✅ Quiz attempt started:', attemptResponse.attempt_id);
        } else {
          throw new Error("Failed to get a valid attempt ID.");
        }
      } catch (error) {
        console.error("Error fetching or starting quiz:", error);
        activeQuizAttempts.delete(quizKey);
        setQuizErrorMessage(error.userMessage || 'No se pudo cargar el test. Por favor, recarga la página o contacta con soporte.');
        setQuizState('error');
      }
    };
    fetchAndStartQuiz();
  }, [quizId, customQuiz, lessonId]);

  // Hook de autoguardado - se activa cuando cambian las respuestas
  const { clearAutosave } = useQuizAutosave({
    quizId: quizId,
    quizData: quizInfo,
    shuffledQuestionIds: orderedQuestionIds, // 🔥 FIX: Save the current question order
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
      setQuestionIds(ids);
      
      // 🔥 FIX: Restore the preserved question order to maintain same shuffle
      // Check both autosaveData.shuffled_question_ids and savedQuizData._shuffled_question_ids
      const savedOrder = autosaveData.shuffled_question_ids || 
                         savedQuizData._shuffled_question_ids || 
                         null;
      if (savedOrder && savedOrder.length > 0) {
        console.log('📋 Restoring preserved question order from autosave');
        setPreservedQuestionOrder(savedOrder);
      }
      
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
      
      // 🔥 FIX: Clear preserved order so new shuffle happens
      setPreservedQuestionOrder(null);

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

  const handleSubmit = useCallback(async () => {
      console.log('🔥 handleSubmit called', { attemptId, timestamp: new Date().toISOString() });

      if (!attemptId) {
          setQuizState('error');
          return;
      }

      // 🔥 FIX: Guard against double submission
      if (activeSubmissions.has(attemptId)) {
          console.warn('⚠️ Submission already in progress, ignoring duplicate call');
          return;
      }

      activeSubmissions.add(attemptId); // Mark as submitting
      setQuizState('submitting');

      // 🔥 FIX: Use questionIds directly instead of trying to load all questions
      // The backend already has the quiz question IDs and will grade accordingly
      // We just need to send the answers the user has provided
      const idsToSubmit = questionIds && questionIds.length > 0 ? questionIds : quizQuestions.map(q => q.id);
      
      const formattedAnswers = idsToSubmit.map(qId => ({
        question_id: qId,
        answer_given: userAnswers.hasOwnProperty(qId) ? userAnswers[qId] : null,
        is_risked: riskedAnswers.includes(qId)
      }));

      console.log(`📤 Submitting ${formattedAnswers.length} answers (${Object.keys(userAnswers).length} answered)`);

      try {
          let result;
          if (attemptId === 'custom-attempt' && customQuiz) {
              const customQuestionIds = customQuiz.meta._quiz_question_ids;
              const endTime = Date.now();
              const durationInSeconds = Math.round((endTime - startTime) / 1000);
              
              result = await calculateCustomQuizResult(customQuestionIds, formattedAnswers);
              result.duration_seconds = durationInSeconds;
          } else {
              result = await submitQuizAttempt(attemptId, formattedAnswers);
          }
          
          // Limpiar autoguardado después de completar exitosamente
          if (quizId && !customQuiz) {
            await clearAutosave();
          }

          // 🔥 FIX: Load questions for the results view after successful submission
          // This is non-blocking - if it fails, we still have the result
          // Pre-sort loaded questions by original order as fallback (avoids showing shuffled order)
          const cachedMap = new Map(quizQuestions.map(q => [q.id, q]));
          let fullQuestions = idsToSubmit.map(id => cachedMap.get(id)).filter(Boolean);
          if (fullQuestions.length === 0) fullQuestions = quizQuestions;
          try {
            // Load all questions for the results display
            const allQuestionIds = idsToSubmit;
            const refreshedQuestions = await getQuestionsByIds(allQuestionIds, { batchSize: 50 });
            if (refreshedQuestions && refreshedQuestions.length > 0) {
              console.log(`✅ Loaded ${refreshedQuestions.length} questions for results display`);
              fullQuestions = refreshedQuestions;
            }
          } catch (refreshError) {
            console.warn('⚠️ Could not load all questions for results, using cached data:', refreshError);
            // fullQuestions already sorted by original order above
          }

          setFinalQuestions(fullQuestions);

          setQuizResult(result);
          setQuizState('submitted');

          // 🔥 Cleanup: Remove from active attempts and submissions
          const quizKey = `${quizId}-${lessonId || 'no-lesson'}`;
          activeQuizAttempts.delete(quizKey);
          activeSubmissions.delete(attemptId);
          console.log('✅ Quiz completed, cleaned up guards');

          // Pasar los resultados al callback para que el padre los maneje
          console.log('📞 Calling onQuizComplete callback', {
            hasCallback: !!onQuizComplete,
            callbackType: typeof onQuizComplete,
            resultScore: result?.score,
            questionsCount: fullQuestions?.length
          });

          if (onQuizComplete && typeof onQuizComplete === 'function') {
            onQuizComplete(result, fullQuestions, quizInfo);
            console.log('✅ onQuizComplete callback executed successfully');
          } else {
            console.warn('⚠️ onQuizComplete callback not available or not a function');
          }
      } catch (error) {
          console.error('❌ Error submitting quiz:', error);
          activeSubmissions.delete(attemptId);
          setQuizErrorMessage(error.userMessage || 'No se pudo enviar el test. Por favor, inténtalo de nuevo o contacta con soporte.');
          setQuizState('error');
      }
  }, [attemptId, quizQuestions, questionIds, userAnswers, riskedAnswers, customQuiz, startTime, quizId, lessonId, clearAutosave, onQuizComplete, quizInfo]);

  if (quizState === 'loading' || (questionsLoading && quizQuestions.length === 0)) {
    return <div className="text-center p-8" style={{ color: textPrimary }}>{t('quizzes.quiz.loadingQuiz')}</div>;
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
      const errorMessage = quizErrorMessage || questionsError || t('quizzes.quiz.errorLoadingQuiz');
      return (
        <div className="text-center p-8" style={{ color: '#ef4444' }}>
          <p className="font-semibold mb-2">{t('quizzes.quiz.errorTitle')}</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      );
  }
  if (quizState === 'submitting') {
      return <div className="text-center p-8" style={{ color: textPrimary }}>{t('quizzes.quiz.submittingAnswers')}</div>
  }
  if (quizState === 'submitted') {
    // El quiz ha sido enviado, el padre debería manejar los resultados
    // Mostrar un mensaje mientras se procesa
    return <div className="text-center p-8" style={{ color: textPrimary }}>{t('quizzes.quiz.submittingAnswers')}</div>
  }
  
  if (quizInfo && quizQuestions.length === 0 && !questionsLoading && questionIds.length === 0) {
      return <div className="text-center p-8" style={{ color: textMuted }}>{t('quizzes.quiz.noQuestionsAssigned')}</div>
  }

  // Calcular time_limit dinámicamente basado en el número de preguntas
  // Fórmula: mitad del número de preguntas (redondeado hacia arriba), mínimo 1
  const questionsCount = questionIds.length;
  const timeLimit = questionsCount > 0 ? Math.max(1, Math.ceil(questionsCount / 2)) : 0;

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
      {/* Modal de confirmación de salida */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div 
            className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: isDarkMode ? getColor('secondaryBackground') : '#ffffff' }}
          >
            {/* Header */}
            <div 
              className="px-6 py-4"
              style={{ backgroundColor: isDarkMode ? getColor('accent') : getColor('primary') }}
            >
              <h3 className="text-lg font-bold text-white">
                {t('quizzes.exitModal.title')}
              </h3>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p style={{ color: isDarkMode ? '#f9fafb' : '#374151' }}>
                {t('quizzes.exitModal.message')}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors text-center"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                  color: isDarkMode ? '#f9fafb' : '#374151'
                }}
              >
                {t('quizzes.exitModal.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  if (onExit) onExit();
                }}
                className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors text-center"
                style={{ backgroundColor: isDarkMode ? getColor('accent') : getColor('primary') }}
              >
                {t('quizzes.exitModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para móvil */}
      {isQuizSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsQuizSidebarOpen(false)}
        />
      )}

      {/* Barra superior con botón de salida y dark mode */}
      {onExit && (
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: isDarkMode ? getColor('secondaryBackground') : '#ffffff',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExitModal(true)}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c')
              }}
              aria-label={t('quizzes.exitModal.title')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span 
              className="font-medium text-sm truncate"
              style={{ color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c') }}
            >
              {quizInfo?.title?.rendered || quizInfo?.title || t('quizzes.quiz.inProgress')}
            </span>
          </div>
          
          {/* Timer y Botón Dark Mode */}
          <div className="flex items-center gap-3">
            {/* Timer toggle button */}
            <button
              onClick={() => setIsTimerVisible(!isTimerVisible)}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c')
              }}
              aria-label={isTimerVisible ? t('quizzes.quiz.hideTimer') : t('quizzes.quiz.showTimer')}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
                {!isTimerVisible && (
                  <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.5"/>
                )}
              </svg>
            </button>
            
            {/* Timer inline */}
            {isTimerVisible && (
              <Timer
                durationMinutes={timeLimit}
                onTimeUp={handleSubmit}
                isPaused={quizState === 'submitted' || quizState === 'submitting'}
                initialTimeRemaining={timeRemaining}
                onTick={(remainingSeconds) => setTimeRemaining(remainingSeconds)}
                compact={true}
              />
            )}
            
            {/* Botón Dark Mode - Solo si no está oculto */}
            {!hideDarkModeToggle && (
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c')
                }}
                aria-label={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botón flotante para el subrayador - solo desktop */}
      {!isMobile && <button
        onClick={() => {
          const newState = !currentShowToolbar;
          handleSetShowToolbar(newState);
          handleSetDrawingEnabled(newState);
          handleSetDrawingMode(true);
        }}
        className="fixed bottom-24 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 lg:bottom-6"
        style={{
          backgroundColor: currentShowToolbar ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
          color: '#ffffff'
        }}
        aria-label="Activar/Desactivar subrayador"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="m9 11-6 6v3h3l6-6"/>
          <path d="m22 2-7 7"/>
          <path d="M21 3 3 21"/>
        </svg>
      </button>}

      {/* Botón flotante para abrir sidebar en móvil */}
      <button
        onClick={() => setIsQuizSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: getColor('primary', '#3b82f6'),
          color: '#ffffff'
        }}
        aria-label={t('quizzes.quiz.openMenu')}
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1 overflow-y-auto" ref={pageScrollRef}>
        <div className="w-full max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-8 justify-between px-4 sm:px-6 py-6">
          {/* Columna de Preguntas (con canvas de dibujo) */}
          <main ref={questionsContainerRef} className="flex-1 min-w-0 lg:pr-4 relative pb-24 lg:pb-8">
            {/* Canvas de dibujo relativo al contenedor - solo desktop */}
            {!isMobile && currentDrawingMode && (
              <DrawingCanvas
                isActive={currentDrawingMode}
                isDrawingEnabled={currentDrawingEnabled}
                tool={currentDrawingTool}
                color={currentDrawingColor}
                lineWidth={currentDrawingLineWidth}
                onClose={() => {
                  handleSetDrawingMode(false);
                  handleSetDrawingEnabled(false);
                  handleSetShowToolbar(false);
                }}
                onClear={(callback) => setClearCanvasCallback(() => callback)}
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
        
        {/* 🔥 NUEVO: Trigger invisible para auto-carga + indicador de progreso */}
        {hasMoreQuestions && (
          <div className="mt-8 mb-4 flex flex-col items-center gap-4">
            {/* Elemento trigger invisible para Intersection Observer */}
            <div 
              ref={loadMoreTriggerRef}
              className="w-full h-px"
              aria-hidden="true"
            />
            
            {/* Indicador de carga cuando se están cargando más preguntas */}
            {questionsLoading && (
              <div className="flex flex-col items-center justify-center p-6 gap-3">
                <Loader className="w-8 h-8 animate-spin" style={{ color: getColor('primary', '#3b82f6') }} />
                <div className="text-center">
                  <p className="font-medium" style={{ color: getColor('primary', '#3b82f6') }}>
                    {t('quizzes.quiz.loadingMoreQuestions')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: textMuted }}>
                    {t('quizzes.quiz.questionsLoadedCount', { loaded: loadedCount, total: totalQuestions })}
                  </p>
                </div>
              </div>
            )}
            
            {/* Contador de progreso siempre visible */}
            {!questionsLoading && (
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: textMuted }}>
                  {t('quizzes.quiz.questionsLoadedCount', { loaded: loadedCount, total: totalQuestions })}
                </p>
                <p className="text-xs mt-1" style={{ color: textMuted, opacity: 0.7 }}>
                  {t('quizzes.quiz.autoLoadingMore')}
                </p>
              </div>
            )}
          </div>
        )}
        
      </main>

      {/* Columna de la Barra Lateral y Reloj */}
      <aside className={`
        fixed lg:relative
        top-0 right-0 
        h-full lg:h-auto
        w-80 lg:w-[320px] xl:w-[340px]
        flex-shrink-0
        transition-transform duration-300
        z-50 lg:z-auto
        ${isQuizSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}
      style={{
        backgroundColor: isQuizSidebarOpen ? getColor('background', '#ffffff') : 'transparent'
      }}
      >
        {/* Header del sidebar móvil */}
        <div className="lg:hidden flex items-center justify-between px-4 py-5 border-b" style={{
          borderColor: getColor('borderColor', '#e5e7eb')
        }}>
          <h3 className="font-bold text-xl" style={{ color: textPrimary }}>
            {t('quizzes.quiz.quizProgress')}
          </h3>
          <button
            onClick={() => setIsQuizSidebarOpen(false)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: textPrimary }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 p-4 lg:p-0 lg:sticky lg:top-6 overflow-y-auto h-[calc(100%-88px)] lg:max-h-[calc(100vh-3rem)] lg:ml-auto">
            <QuizSidebar
              questions={quizQuestions}
              questionIds={orderedQuestionIds || questionIds}
              totalCount={totalQuestions}
              userAnswers={userAnswers}
              riskedAnswers={riskedAnswers}
              onSubmit={handleSubmit}
              loadedCount={loadedCount}
              onLoadMore={hasMoreQuestions && !questionsLoading ? loadMore : null}
              scrollContainerRef={pageScrollRef}
            />
        </div>
      </aside>
        </div>
      </div>

      {/* Drawing Toolbar - solo desktop */}
      {!isMobile && <DrawingToolbar
        isActive={currentShowToolbar}
        tool={currentDrawingTool}
        onToolChange={handleSetDrawingTool}
        color={currentDrawingColor}
        onColorChange={handleSetDrawingColor}
        lineWidth={currentDrawingLineWidth}
        onLineWidthChange={handleSetDrawingLineWidth}
        onClear={() => {
          if (clearCanvasCallback) {
            clearCanvasCallback();
          }
        }}
        onClose={() => {
          handleSetShowToolbar(false);
          handleSetDrawingEnabled(false);
        }}
      />}
    </div>
  );
};

export default Quiz;