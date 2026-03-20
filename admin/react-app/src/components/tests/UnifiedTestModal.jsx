import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Plus, Settings, FileQuestion, Clock, CheckCircle, AlertCircle, Trash2, GripVertical, ChevronRight, Edit2, Eye, EyeOff, Calendar, Search, MoveRight, Loader2, Sparkles, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-toastify';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Hooks & Services
import useQuizzes from '../../hooks/useQuizzes';
import useQuestionsAdmin from '../../hooks/useQuestionsAdmin';
import { getQuestionsByIds, getAll as getAllQuestions } from '../../api/services/questionService';
import { getApiConfig, getDefaultHeaders } from '../../api/config/apiConfig';
import { makeApiRequest } from '../../api/services/baseService';
import QuestionSelector from '../questions/QuestionSelector';
import QuestionModal from '../questions/QuestionModal';
import { getOne as getQuiz } from '../../api/services/quizService';
import { moveQuizToLesson } from '../../api/services/lessonService';

const decodeHtml = (str) => {
  if (!str) return str;
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

// Sortable Item Component with Edit button and search match tags
const SortableQuestionItem = ({ question, onRemove, onEdit, colors }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{...style}}
      className="flex items-center justify-between p-2 mb-1 rounded-lg border bg-transparent border-gray-200 dark:border-gray-700 group hover:border-amber-400/50 transition-colors shadow-sm"
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <button {...attributes} {...listeners} className="cursor-grab p-1 flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" style={{ color: colors.text }}>
          <GripVertical size={14} />
        </button>
        <div className="flex flex-col min-w-0 flex-1 justify-center space-y-[2px]">
          <span className="font-medium text-xs truncate leading-none cursor-pointer hover:text-amber-500 transition-colors" onClick={() => onEdit(question)} style={{ color: colors.text }}>
            {question.title?.rendered || question.title}
          </span>
          {question._matches && (
            <div className="flex items-center gap-1 flex-wrap">
              {question._matches.map((m, i) => (
                <span
                  key={i}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    backgroundColor: `${colors.accent}20`,
                    color: colors.accent
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 transition-all">
        <button
          onClick={() => onEdit(question)}
          className="p-1.5 flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-all bg-transparent"
          style={{ color: colors.accent }}
          title="Editar pregunta"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onRemove(question.id)}
          className="p-1.5 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all bg-transparent"
          title="Quitar pregunta"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const HIDDEN_DATE = '9999-12-31';

const UnifiedTestModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  test = null, // The lesson step object if editing
  courseId,
  lessonId = null,
  onSave,
  availableCourses = [],
  onMoved,
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'settings' | 'selector'
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // For slide animation
  const mouseDownOnOverlayRef = useRef(false);
  
  // Question Modal State
  const [questionModal, setQuestionModal] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    question: null
  });

  // Data State
  const [formData, setFormData] = useState({
    title: '', // Lesson Step Title
    description: '', // Quiz Content
    difficulty_level: 'medium', // easy | medium | hard
    // Settings (Defaults hardcoded hidden)
    passing_score: '5.0',
    time_limit: '', // Automatico
    max_attempts: '', // Ilimitados
    randomize: true, // Siempre aleatorio
    show_results: true, // Siempre mostrar resultados
    start_date: '', // Visibility control
  });
  
  const [selectedQuestions, setSelectedQuestions] = useState([]); // Array of question objects
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectorKey, setSelectorKey] = useState(0); // Increment to force QuestionSelector remount/refetch
  const [questionOverrides, setQuestionOverrides] = useState({}); // Map of id → updated question, refreshes individual cards
  const [providerRefreshKey, setProviderRefreshKey] = useState(0); // Incremented when QuestionModal closes to re-sync provider locks
  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0); // Incremented to trigger a soft re-fetch of the selector's question list

  // Auto-Generator state
  const [autoGenConfig, setAutoGenConfig] = useState({ lessons: [], numQuestions: 10, minFailureRate: 0, difficulty: 'all' });
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenEmpty, setAutoGenEmpty] = useState(false);
  const [courseLessons, setCourseLessons] = useState([]);
  const [courseLessonsLoading, setCourseLessonsLoading] = useState(false);

  // Move Test state (edit mode only)
  const [showMove, setShowMove] = useState(false);
  const [moveTargetCourseId, setMoveTargetCourseId] = useState('');
  const [moveLessons, setMoveLessons] = useState([]);
  const [moveTargetLessonId, setMoveTargetLessonId] = useState('');
  const [loadingMoveLessons, setLoadingMoveLessons] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Fetch course lessons for the auto-generator panel (lazy, only once per modal open)
  useEffect(() => {
    if (activeTab !== 'autogen' || !courseId || courseLessons.length > 0 || courseLessonsLoading) return;
    let cancelled = false;
    setCourseLessonsLoading(true);
    const { apiUrl } = getApiConfig();
    const params = new URLSearchParams({ per_page: '100', status: 'publish,draft,private' });
    makeApiRequest(`${apiUrl}/qe/v1/courses/${courseId}/lessons?${params}`)
      .then(res => {
        if (cancelled) return;
        const list = res.data?.data || [];
        setCourseLessons(list.map(l => ({ id: l.id, label: l.title?.rendered || l.title || `Lección #${l.id}` })));
      })
      .catch(() => { if (!cancelled) setCourseLessons([]); })
      .finally(() => { if (!cancelled) setCourseLessonsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, courseId]);

  // Fetch lessons when move target course changes
  useEffect(() => {
    if (!showMove || !moveTargetCourseId) { setMoveLessons([]); return; }
    let cancelled = false;
    setLoadingMoveLessons(true);
    setMoveTargetLessonId('');
    const { apiUrl } = getApiConfig();
    const params = new URLSearchParams({ per_page: '100', status: 'publish,draft,private' });
    makeApiRequest(`${apiUrl}/qe/v1/courses/${moveTargetCourseId}/lessons?${params}`)
      .then(res => {
        if (cancelled) return;
        const list = res.data?.data || [];
        const filtered = list.filter(l => l.id !== lessonId);
        setMoveLessons(filtered.map(l => ({ value: l.id, label: decodeHtml(l.title?.rendered || l.title) || `Lección #${l.id}` })));
      })
      .catch(() => { if (!cancelled) setMoveLessons([]); })
      .finally(() => { if (!cancelled) setLoadingMoveLessons(false); });
    return () => { cancelled = true; };
  }, [showMove, moveTargetCourseId, lessonId]);

  const handleToggleMove = () => {
    setShowMove(v => {
      if (!v) {
        setMoveTargetCourseId(courseId?.toString() || '');
        setMoveTargetLessonId('');
        setMoveLessons([]);
      }
      return !v;
    });
  };

  const handleConfirmMove = async () => {
    const quizId = test?.data?.quiz_id;
    if (!quizId || !moveTargetLessonId) return;
    setIsMoving(true);
    try {
      await moveQuizToLesson(quizId, lessonId, Number(moveTargetLessonId));
      toast.success('Test movido correctamente', { autoClose: 2000, position: 'bottom-right' });
      if (onMoved) onMoved();
      handleClose();
    } catch (err) {
      toast.error('Error al mover el test', { autoClose: 3000, position: 'bottom-right' });
    } finally {
      setIsMoving(false);
    }
  };

  // Filter assigned questions by search term, with match metadata per question
  const filteredSelectedQuestions = useMemo(() => {
    if (!questionSearch.trim()) return selectedQuestions.map(q => ({ ...q, _matches: null }));
    const term = questionSearch.toLowerCase().trim();
    return selectedQuestions.reduce((acc, q) => {
      const title = (q.title?.rendered || q.title || '').toLowerCase();
      const content = (q.content?.rendered || q.content || '').replace(/<[^>]*>/g, '').toLowerCase();
      const matchingOptions = (q.meta?._question_options || []).filter(o => (o.text || '').toLowerCase().includes(term));

      const matches = [];
      if (title.includes(term)) matches.push('título');
      if (content.includes(term)) matches.push('explicación');
      if (matchingOptions.length > 0) {
        matches.push(matchingOptions.length === 1 ? '1 opción' : `${matchingOptions.length} opciones`);
      }

      if (matches.length > 0) acc.push({ ...q, _matches: matches });
      return acc;
    }, []);
  }, [selectedQuestions, questionSearch]);

  // Hooks
  const quizzesHook = useQuizzes({ autoFetch: false });
  const questionsAdminHook = useQuestionsAdmin({ autoFetch: false });
  
  // Colors
  const colors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bg: isDarkMode ? getColor('background', '#0f172a') : '#f9fafb',
    border: isDarkMode ? '#374151' : '#e5e7eb',
  }), [getColor, isDarkMode]);

  // Load Initial Data
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      // Reset
      setActiveTab('content');
      setQuestionSearch('');
      setShowMove(false);
      setCourseLessons([]);
      setAutoGenConfig({ lessons: [], numQuestions: 10, minFailureRate: 0, difficulty: 'all' });
      setAutoGenEmpty(false);
      setMoveTargetCourseId(courseId?.toString() || '');
      setMoveTargetLessonId('');
      setMoveLessons([]);
      setFormData({
        title: '',
        description: '',
        difficulty_level: 'medium',
        passing_score: '5.0',
        time_limit: '',
        max_attempts: '',
        randomize: true,
        show_results: true,
        start_date: '',
      });
      setSelectedQuestions([]);
      setQuestionOverrides({});

      if (mode === 'edit' && test) {
        setIsLoading(true);
        try {
          // Pre-fill Title from Lesson Step
          const stepTitle = test.title || '';
          const quizId = test.data?.quiz_id;

          if (quizId) {
            const quiz = await getQuiz(quizId);
            const meta = quiz.meta || {};
            
            setFormData({
              title: stepTitle,
              description: quiz.content?.rendered || quiz.content || '',
              difficulty_level: meta._difficulty_level || 'medium',
              passing_score: '5.0',
              time_limit: '',
              max_attempts: '',
              randomize: true,
              show_results: true,
              start_date: test.start_date || '',
            });
            
            // Fetch questions
            const qIds = meta._quiz_question_ids || [];
            if (qIds.length > 0) {
              const questions = await getQuestionsByIds(qIds);
              setSelectedQuestions(questions);
            }
          } else {
             setFormData(prev => ({ ...prev, title: stepTitle, start_date: test.start_date || '' }));
          }
        } catch (error) {
          console.error('Error loading test data:', error);
          toast.error('Error al cargar datos del test');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [isOpen, mode, test]);

  // Handlers
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const questionIds = selectedQuestions.map(q => q.id);

      // 1. Prepare Test Data
      const quizData = {
        title: formData.title,
        content: formData.description,
        status: 'publish',
        qe_course: courseId ? [parseInt(courseId)] : [],
        meta: {
          _course_id: courseId,
          _difficulty_level: formData.difficulty_level,
          _passing_score: formData.passing_score,
          _time_limit: formData.time_limit,
          _max_attempts: formData.max_attempts,
          _randomize_questions: formData.randomize,
          _show_results: formData.show_results,
          _quiz_question_ids: questionIds
        }
      };

      let resultQuizId;

      // 2. Create or Update Test
      if (mode === 'edit' && test?.data?.quiz_id) {
        // Retry once on failure — update_post_meta is idempotent so this is safe
        let updatedQuiz = null;
        let lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            updatedQuiz = await quizzesHook.updateQuiz(test.data.quiz_id, quizData);
            break;
          } catch (err) {
            lastError = err;
            if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
          }
        }
        if (!updatedQuiz) throw lastError;
        resultQuizId = test.data.quiz_id;

        // Verify the server actually persisted every question ID we sent.
        // If there's any mismatch, keep the modal open so the user doesn't lose their work.
        const savedIds = new Set(updatedQuiz?.meta?._quiz_question_ids || []);
        const missingIds = questionIds.filter(id => !savedIds.has(id));
        if (missingIds.length > 0) {
          toast.error(
            `Error al guardar: ${missingIds.length} pregunta(s) no quedaron vinculadas al test. Intenta guardar de nuevo.`
          );
          setIsSaving(false);
          return;
        }
      } else {
        const newQuiz = await quizzesHook.createQuiz(quizData);
        resultQuizId = newQuiz.id;
      }

      // 3. Secondary batch updates — fire in the background, don't block the save.
      // Chunks of 10 processed sequentially to avoid server load spikes.
      // All 3 operations run in parallel per chunk since they're independent.
      const difficulty = formData.difficulty_level;
      if (questionIds.length > 0) {
        const CHUNK_SIZE = 10;
        const { apiUrl } = getApiConfig();

        const chunks = [];
        for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
          chunks.push(questionIds.slice(i, i + CHUNK_SIZE));
        }

        const batchFetch = (endpoint, body) =>
          fetch(`${apiUrl}/quiz-extended/v1/batch/${endpoint}`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(body),
          });

        // Not awaited — runs in the background after modal closes.
        // When done, bumps questionsRefreshKey so the selector re-fetches
        // and shows the updated provider on all affected question cards.
        (async () => {
          for (const chunk of chunks) {
            await Promise.all([
              lessonId
                ? batchFetch('sync-question-lessons', { question_ids: chunk, lesson_id: lessonId })
                    .catch(e => console.warn('Could not sync question lesson associations:', e))
                : Promise.resolve(),
              batchFetch('set-question-difficulty', { question_ids: chunk, difficulty })
                .catch(e => console.warn('Could not batch-update question difficulty:', e)),
              batchFetch('set-question-provider', { question_ids: chunk, provider_slug: 'uniforme-azul' })
                .catch(e => console.warn('Could not batch-update question provider:', e)),
            ]);
          }
          setQuestionsRefreshKey(k => k + 1);
        })();
      }

      // 4. Calculate test metadata for display
      const questionCount = selectedQuestions.length;
      const timeLimit = questionCount > 0 ? Math.max(1, Math.ceil(questionCount / 2)) : null;

      await onSave({
        type: 'quiz',
        title: formData.title,
        start_date: formData.start_date,
        data: {
          quiz_id: resultQuizId,
          difficulty: difficulty,
          question_count: questionCount,
          time_limit: timeLimit,
          start_date: new Date().toISOString()
        }
      });

      handleClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar el test');
    } finally {
      setIsSaving(false);
    }
  };



  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedQuestions((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Auto-Generator Handler ---
  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    setAutoGenEmpty(false);
    try {
      const allLessonIds = courseLessons.map(l => l.id);
      const isAllLessons = autoGenConfig.lessons.length === 0 || autoGenConfig.lessons.length === allLessonIds.length;
      // When all lessons selected, pass all IDs explicitly — course_id is not supported by the endpoint
      const lessonsFilter = isAllLessons ? (allLessonIds.length > 0 ? allLessonIds : null) : autoGenConfig.lessons;

      // Fetch a large batch so we can filter by failure rate client-side
      const result = await getAllQuestions({
        lessons: lessonsFilter,
        difficulty: autoGenConfig.difficulty !== 'all' ? autoGenConfig.difficulty : null,
        perPage: 200,
        status: 'publish',
        provider_slug: 'uniforme-azul',
      });

      let questions = result.data || [];

      // Filter by minimum failure rate
      if (autoGenConfig.minFailureRate > 0) {
        questions = questions.filter(q => (q.meta?._question_fail_rate || 0) >= autoGenConfig.minFailureRate);
      }

      // Exclude questions already in the test
      const selectedIds = new Set(selectedQuestions.map(q => q.id));
      questions = questions.filter(q => !selectedIds.has(q.id));

      // Shuffle (Fisher-Yates) before slicing so selection is random
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      const toAdd = questions.slice(0, autoGenConfig.numQuestions);

      if (toAdd.length === 0) {
        setAutoGenEmpty(true);
        return;
      }

      setSelectedQuestions(prev => [...prev, ...toAdd]);
      toast.success(`${toAdd.length} pregunta${toAdd.length !== 1 ? 's' : ''} añadida${toAdd.length !== 1 ? 's' : ''} al test`, { autoClose: 2000, position: 'bottom-right' });
      setActiveTab('content');
    } catch (error) {
      console.error('Error auto-generating questions:', error);
      toast.error('Error al auto-generar preguntas', { autoClose: 3000, position: 'bottom-right' });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // --- Question Modal Handlers ---

  const openCreateQuestion = () => {
    setQuestionModal({ isOpen: true, mode: 'create', question: null });
  };

  const openEditQuestion = (question) => {
    setQuestionModal({ isOpen: true, mode: 'edit', question });
  };

  const closeQuestionModal = () => {
    setQuestionModal(prev => ({ ...prev, isOpen: false }));
    setProviderRefreshKey(k => k + 1);
  };

  const handleSaveQuestion = async (questionData, nextAction) => {
    try {
      if (questionModal.mode === 'create') {
        // Inject lesson context so _question_lesson is written on the initial CREATE call,
        // even if the question is later removed from this test before saving.
        const dataWithLesson = lessonId ? { ...questionData, lessonId: String(lessonId) } : questionData;
        const newQuestion = await questionsAdminHook.createQuestion(dataWithLesson);

        setSelectedQuestions(prev => [...prev, newQuestion]);
        toast.success('Pregunta creada y añadida');
        
        if (nextAction !== 'create_another') {
            closeQuestionModal();
        }
      } else {
        const updatedQuestion = await questionsAdminHook.updateQuestion(questionModal.question.id, questionData);
        // Update local list
        setSelectedQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
        // Refresh this question's card in the selector immediately via override,
        // then trigger a full soft re-fetch so other cards also pick up any server-side changes
        setQuestionOverrides(prev => ({ ...prev, [updatedQuestion.id]: updatedQuestion }));
        setQuestionsRefreshKey(k => k + 1);
        toast.success('Pregunta actualizada');
        closeQuestionModal();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Error al guardar la pregunta');
    }
  };
  
  const handleDeleteQuestion = (questionId) => {
    // Unassign: removes from this test's question list only (no DB delete)
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    closeQuestionModal();
    toast.success('Pregunta desasignada del test');
  };

  const handleDeleteQuestionFromDB = async (questionId) => {
    // Permanently delete from DB — only callable when question has no quiz associations
    await questionsAdminHook.deleteQuestion(questionId);
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    setSelectorKey(k => k + 1); // Force QuestionSelector to refetch the list
    closeQuestionModal();
    toast.success('Pregunta borrada del campus');
  };

  // Custom add from selector
  // Since QuestionSelector filters, it has the objects in its hook.
  // It's hard to get them out without modifying QuestionSelector.
  // I will just open a "Drawer" mode.
  
  // Slide-in/out animation
  useEffect(() => {
    if (isOpen) {
      // Small delay so the DOM renders at translateX(100%) first, then animates in
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for slide-out animation
  };

  if (!isOpen) return null;

  // Calculate top offset: WP admin bar + app topbar
  const wpAdminBar = document.getElementById('wpadminbar');
  const qeTopbar = document.getElementById('qe-topbar');
  const topOffset = (wpAdminBar ? wpAdminBar.offsetHeight : 0) + (qeTopbar ? qeTopbar.offsetHeight : 0);

  return (
    <div className="fixed left-0 right-0 bottom-0" style={{ zIndex: 10000, top: topOffset }}>
      {/* Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isVisible ? 1 : 0
        }}
        onClick={handleClose}
      />

      {/* Full-page Slide Panel */}
      <div
        className="absolute inset-0 w-full shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{
          backgroundColor: colors.bg,
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-2 border-b flex-shrink-0" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            {mode === 'create' ? 'Nuevo Test' : 'Editar Test'}
            <span className="font-normal ml-2 text-xs" style={{ color: colors.textMuted }}>— Configura el contenido y las preguntas</span>
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: colors.textMuted }}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: FORM & LIST */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all ${(activeTab === 'selector' || activeTab === 'autogen') ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
             
             {/* No Tabs Needed anymore - Content Only */}

             <div className="flex-1 overflow-y-auto p-5">
                {isLoading ? (
                  <div className="flex justify-center p-10"><span className="animate-pulse" style={{ color: colors.text }}>Cargando...</span></div>
                ) : (
                  /* CONTENT FORM */
                  <div className="space-y-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: colors.textMuted }}>
                          Título del Test
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full text-sm font-medium p-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                            placeholder="Ej: Evaluación Final del Módulo 1"
                            style={{
                              border: `2px solid ${colors.border}`,
                              color: colors.text,
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                            }}
                            autoFocus
                          />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: colors.textMuted }}>
                          Dificultad
                        </label>
                        <select
                          value={formData.difficulty_level}
                          onChange={e => setFormData({...formData, difficulty_level: e.target.value})}
                          className="text-sm font-medium p-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          style={{
                            border: `2px solid ${colors.border}`,
                            color: formData.difficulty_level === 'easy' ? '#10b981' : formData.difficulty_level === 'hard' ? '#ef4444' : '#f59e0b',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }}
                        >
                          <option value="easy">Fácil</option>
                          <option value="medium">Media</option>
                          <option value="hard">Difícil</option>
                        </select>
                      </div>
                    </div>


                    {/* Visibility & Unlock Date */}
                    <div
                      className="rounded-lg border flex flex-col gap-3"
                      style={{
                        padding: '12px',
                        borderColor: colors.border,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Visibility Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {formData.start_date !== HIDDEN_DATE ? (
                            <Eye size={14} style={{ color: '#10b981' }} />
                          ) : (
                            <EyeOff size={14} style={{ color: '#ef4444' }} />
                          )}
                          <div>
                            <div className="text-xs font-medium" style={{ color: colors.text }}>
                              Visibilidad
                            </div>
                            <div className="text-[10px]" style={{ color: colors.textMuted }}>
                              {formData.start_date !== HIDDEN_DATE
                                ? 'Los estudiantes pueden ver este test'
                                : 'Oculto para los estudiantes'
                              }
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, start_date: formData.start_date === HIDDEN_DATE ? '' : HIDDEN_DATE })}
                          style={{
                            position: 'relative',
                            width: '36px',
                            height: '20px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: formData.start_date !== HIDDEN_DATE ? '#10b981' : '#9ca3af',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            flexShrink: 0
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: formData.start_date !== HIDDEN_DATE ? '18px' : '2px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                          />
                        </button>
                      </div>

                      {/* Unlock Date - only when visible */}
                      {formData.start_date !== HIDDEN_DATE && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Calendar size={11} style={{ color: colors.textMuted }} />
                            <label className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
                              Fecha de desbloqueo
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={formData.start_date && formData.start_date !== HIDDEN_DATE ? formData.start_date.split('T')[0] : ''}
                              onChange={e => setFormData({ ...formData, start_date: e.target.value || '' })}
                              className="flex-1 text-xs p-1.5 rounded-md outline-none"
                              style={{
                                border: `1px solid ${colors.border}`,
                                color: colors.text,
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                              }}
                            />
                            {formData.start_date && formData.start_date !== HIDDEN_DATE && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, start_date: '' })}
                                className="text-[10px] px-2 py-1 rounded bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                            Opcional. El test será visible a partir de esta fecha.
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
                          Preguntas ({selectedQuestions.length})
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={openCreateQuestion}
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1 hover:underline px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Plus size={12} /> CREAR
                            </button>
                            <button
                                onClick={() => setActiveTab('selector')}
                                className={`text-[10px] font-bold flex items-center gap-1 hover:underline px-2 py-1 rounded-md transition-colors ${activeTab === 'selector' ? 'text-white' : 'text-amber-600 dark:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                style={activeTab === 'selector' ? { backgroundColor: colors.accent } : {}}
                            >
                                <FileQuestion size={12} /> BUSCAR
                            </button>
                            <button
                                onClick={() => setActiveTab('autogen')}
                                className={`text-[10px] font-bold flex items-center gap-1 hover:underline px-2 py-1 rounded-md transition-colors ${activeTab === 'autogen' ? 'text-white' : 'text-amber-600 dark:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                style={activeTab === 'autogen' ? { backgroundColor: colors.accent } : {}}
                            >
                                <Sparkles size={12} /> AUTO
                            </button>
                        </div>
                      </div>

                      {/* Search within assigned questions */}
                      {selectedQuestions.length > 0 && (
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: colors.textMuted }} />
                          <input
                            type="text"
                            value={questionSearch}
                            onChange={e => setQuestionSearch(e.target.value)}
                            placeholder="Buscar en título, contenido u opciones..."
                            className="w-full text-xs pl-8 pr-8 py-2 rounded-lg outline-none transition-all focus:ring-2 focus:ring-amber-500/20"
                            style={{
                              border: `1px solid ${colors.border}`,
                              color: colors.text,
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                            }}
                          />
                          {questionSearch && (
                            <button
                              onClick={() => setQuestionSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors bg-transparent"
                              style={{ color: colors.textMuted }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {selectedQuestions.length === 0 ? (
                        <div
                          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors group"
                          style={{ borderColor: colors.border }}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <FileQuestion className="text-gray-600 dark:text-gray-400" size={24} />
                          </div>
                          <p className="text-xs font-medium mb-1" style={{ color: colors.text }}>No hay preguntas seleccionadas</p>
                          <p className="text-[10px] opacity-60 mb-3" style={{ color: colors.textMuted }}>Empieza añadiendo preguntas al test</p>
                          <div className="flex gap-3">
                            <button onClick={openCreateQuestion} className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-transparent border-0 p-0 hover:bg-transparent transition-colors">Crear una</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setActiveTab('selector')} className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-transparent border-0 p-0 hover:bg-transparent transition-colors">Buscar existentes</button>
                          </div>
                        </div>
                      ) : questionSearch && filteredSelectedQuestions.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs" style={{ color: colors.textMuted }}>
                            Sin resultados para "{questionSearch}"
                          </p>
                        </div>
                      ) : (
                        <div className="bg-transparent space-y-1">
                          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={questionSearch ? filteredSelectedQuestions : selectedQuestions} strategy={verticalListSortingStrategy}>
                              {(questionSearch ? filteredSelectedQuestions : selectedQuestions).map((q) => (
                                <SortableQuestionItem
                                  key={q.id}
                                  question={q}
                                  onRemove={(id) => setSelectedQuestions(items => items.filter(i => i.id !== id))}
                                  onEdit={openEditQuestion}
                                  colors={colors}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT: SELECTOR DRAWER */}
          {activeTab === 'selector' && (
            <div
              className="absolute inset-0 md:static md:w-1/2 flex flex-col border-l shadow-xl z-20 animate-in slide-in-from-right-10 duration-200"
              style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: colors.border }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: colors.text }}>
                  <Plus size={16} className="text-amber-500"/> Banco de Preguntas
                </h3>
                <button
                  onClick={() => setActiveTab('content')}
                  className="p-1.5 rounded-lg border transition-colors shadow-sm"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: isDarkMode ? colors.bgCard : '#ffffff',
                    color: colors.text
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                 <QuestionSelectorWrapper
                    key={selectorKey}
                    currentSelected={selectedQuestions}
                    onSelectionChange={setSelectedQuestions}
                    colors={colors}
                    onEditQuestion={openEditQuestion}
                    questionOverrides={questionOverrides}
                    providerRefreshKey={providerRefreshKey}
                    questionsRefreshKey={questionsRefreshKey}
                 />
              </div>
            </div>
          )}

          {/* RIGHT: AUTO-GENERATOR DRAWER */}
          {activeTab === 'autogen' && (
            <div
              className="absolute inset-0 md:static md:w-1/2 flex flex-col border-l shadow-xl z-20 animate-in slide-in-from-right-10 duration-200"
              style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: colors.border }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: colors.text }}>
                  <Sparkles size={16} className="text-amber-500" /> Auto-Generar Preguntas
                </h3>
                <button
                  onClick={() => setActiveTab('content')}
                  className="p-1.5 rounded-lg border transition-colors shadow-sm"
                  style={{ borderColor: colors.border, backgroundColor: isDarkMode ? colors.bgCard : '#ffffff', color: colors.text }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* Lecciones */}
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>
                    Lecciones
                  </label>
                  {courseLessonsLoading ? (
                    <div className="text-xs animate-pulse" style={{ color: colors.textMuted }}>Cargando lecciones...</div>
                  ) : courseLessons.length === 0 ? (
                    <div className="text-xs" style={{ color: colors.textMuted }}>No hay lecciones disponibles</div>
                  ) : (
                    <div
                      className="rounded-lg border overflow-hidden"
                      style={{ borderColor: colors.border }}
                    >
                      {/* Select All row */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer border-b"
                        style={{ borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        onClick={() => {
                          const allIds = courseLessons.map(l => l.id);
                          const isAll = autoGenConfig.lessons.length === allIds.length;
                          setAutoGenEmpty(false); setAutoGenConfig(prev => ({ ...prev, lessons: isAll ? [] : allIds }));
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{
                            backgroundColor: autoGenConfig.lessons.length === courseLessons.length && courseLessons.length > 0 ? colors.accent : 'transparent',
                            borderColor: autoGenConfig.lessons.length === courseLessons.length && courseLessons.length > 0 ? colors.accent : colors.border
                          }}
                        >
                          {autoGenConfig.lessons.length === courseLessons.length && courseLessons.length > 0 && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: colors.text }}>Todas las lecciones</span>
                      </div>
                      {/* Individual lessons (scrollable) */}
                      <div className="max-h-40 overflow-y-auto">
                        {courseLessons.map(lesson => {
                          const isSelected = autoGenConfig.lessons.includes(lesson.id);
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                              onClick={() => {
                                setAutoGenEmpty(false); setAutoGenConfig(prev => ({
                                  ...prev,
                                  lessons: isSelected
                                    ? prev.lessons.filter(id => id !== lesson.id)
                                    : [...prev.lessons, lesson.id]
                                }));
                              }}
                            >
                              <div
                                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                                style={{
                                  backgroundColor: isSelected ? colors.accent : 'transparent',
                                  borderColor: isSelected ? colors.accent : colors.border
                                }}
                              >
                                {isSelected && <Check size={10} className="text-white" />}
                              </div>
                              <span className="text-xs truncate" style={{ color: colors.text }}>{lesson.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                    {autoGenConfig.lessons.length === 0 ? 'Se usarán todas las lecciones del curso' : `${autoGenConfig.lessons.length} lección${autoGenConfig.lessons.length !== 1 ? 'es' : ''} seleccionada${autoGenConfig.lessons.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Número de preguntas */}
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>
                    Número de preguntas
                  </label>
                  <select
                    value={autoGenConfig.numQuestions}
                    onChange={e => { setAutoGenEmpty(false); setAutoGenConfig(prev => ({ ...prev, numQuestions: Number(e.target.value) })); }}
                    className="w-full text-sm p-2 rounded-lg outline-none transition-all"
                    style={{
                      border: `2px solid ${colors.border}`,
                      color: colors.text,
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                    }}
                  >
                    {[5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(n => (
                      <option key={n} value={n}>{n} preguntas</option>
                    ))}
                  </select>
                </div>

                {/* Dificultad */}
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-2" style={{ color: colors.textMuted }}>
                    Dificultad
                  </label>
                  <select
                    value={autoGenConfig.difficulty}
                    onChange={e => { setAutoGenEmpty(false); setAutoGenConfig(prev => ({ ...prev, difficulty: e.target.value })); }}
                    className="w-full text-sm p-2 rounded-lg outline-none transition-all"
                    style={{
                      border: `2px solid ${colors.border}`,
                      color: autoGenConfig.difficulty === 'easy' ? '#10b981' : autoGenConfig.difficulty === 'hard' ? '#ef4444' : autoGenConfig.difficulty === 'medium' ? '#f59e0b' : colors.text,
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                    }}
                  >
                    <option value="all" style={{ color: colors.text }}>Todas</option>
                    <option value="easy" style={{ color: '#10b981' }}>Fácil</option>
                    <option value="medium" style={{ color: '#f59e0b' }}>Media</option>
                    <option value="hard" style={{ color: '#ef4444' }}>Difícil</option>
                  </select>
                </div>

                {/* Porcentaje mínimo de fallos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
                      % mínimo de fallos
                    </label>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: autoGenConfig.minFailureRate > 0 ? colors.accent : colors.textMuted }}
                    >
                      {autoGenConfig.minFailureRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={autoGenConfig.minFailureRate}
                    onChange={e => { setAutoGenEmpty(false); setAutoGenConfig(prev => ({ ...prev, minFailureRate: Number(e.target.value) })); }}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                    {autoGenConfig.minFailureRate === 0
                      ? 'Sin filtro — se incluyen todas las preguntas'
                      : `Solo preguntas donde ≥${autoGenConfig.minFailureRate}% de estudiantes fallaron`}
                  </p>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleAutoGenerate}
                  disabled={isAutoGenerating}
                  className="w-full py-2.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.accent }}
                  onMouseEnter={e => { if (!isAutoGenerating) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={e => { if (!isAutoGenerating) e.currentTarget.style.opacity = '1'; }}
                >
                  {isAutoGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Auto-Generar
                    </>
                  )}
                </button>

                {autoGenEmpty && (
                  <div
                    className="rounded-lg p-3 flex items-start gap-2 text-xs"
                    style={{ backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid #fca5a5' }}
                  >
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    <div style={{ color: isDarkMode ? '#fca5a5' : '#b91c1c' }}>
                      <p className="font-semibold mb-0.5">Sin resultados</p>
                      <p>No se encontraron preguntas con los criterios seleccionados. Prueba a reducir el % de fallos, cambiar la dificultad o seleccionar más lecciones.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgCard }}>
          {/* Move Test Panel (edit mode only) */}
          {mode === 'edit' && showMove && (
            <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.04)' }}>
              <MoveRight size={14} className="flex-shrink-0" style={{ color: '#f59e0b' }} />
              <select
                value={moveTargetCourseId}
                onChange={e => setMoveTargetCourseId(e.target.value)}
                className="flex-1 min-w-[130px] text-xs rounded-md px-2 py-1.5 border"
                style={{ backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border }}
              >
                <option value="">Seleccionar curso</option>
                {availableCourses.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select
                value={moveTargetLessonId}
                onChange={e => setMoveTargetLessonId(e.target.value)}
                disabled={!moveTargetCourseId || loadingMoveLessons}
                className="flex-1 min-w-[130px] text-xs rounded-md px-2 py-1.5 border"
                style={{ backgroundColor: colors.bgCard, color: colors.text, borderColor: colors.border, opacity: (!moveTargetCourseId || loadingMoveLessons) ? 0.6 : 1 }}
              >
                <option value="">{loadingMoveLessons ? 'Cargando...' : 'Seleccionar lección'}</option>
                {moveLessons.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <button
                onClick={handleConfirmMove}
                disabled={!moveTargetLessonId || isMoving}
                className="px-3 py-1.5 rounded-md text-white text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                style={{ backgroundColor: (!moveTargetLessonId || isMoving) ? '#9ca3af' : '#f59e0b', cursor: (!moveTargetLessonId || isMoving) ? 'not-allowed' : 'pointer' }}
              >
                {isMoving ? <Loader2 size={12} className="animate-spin" /> : <MoveRight size={12} />}
                Mover
              </button>
              <button onClick={() => setShowMove(false)} className="p-1.5 rounded-md bg-transparent flex-shrink-0" style={{ color: colors.textMuted }}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className="px-5 py-4 flex items-center justify-end gap-3">
            {/* Hint count */}
            <div className="mr-auto text-xs" style={{ color: colors.textMuted }}>
              {selectedQuestions.length} preguntas seleccionadas
            </div>
            {mode === 'edit' && (
              <button
                onClick={handleToggleMove}
                className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: showMove ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)',
                  color: '#f59e0b',
                }}
              >
                <MoveRight size={13} />
                Mover Test
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              style={{ backgroundColor: colors.accent }}
            >
              {isSaving ? <span className="animate-spin">⌛</span> : <Save size={14} />}
              {mode === 'create' ? 'Crear Test' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* QUESTION MODAL LAYER */}
      {questionModal.isOpen && (
        <QuestionModal
          isOpen={questionModal.isOpen}
          onClose={closeQuestionModal}
          mode={questionModal.mode}
          question={questionModal.question}
          onSave={handleSaveQuestion}
          onDelete={questionModal.mode === 'edit' ? handleDeleteQuestion : undefined}
          onDeleteFromDB={questionModal.mode === 'edit' ? handleDeleteQuestionFromDB : undefined}
          isSimplified={true}
          parentQuizId={mode === 'edit' ? (test?.data?.quiz_id || null) : null}
        />
      )}
    </div>
  );
};

// Wrapper ensuring we get objects not just IDs
const QuestionSelectorWrapper = ({ currentSelected, onSelectionChange, onEditQuestion, questionOverrides, providerRefreshKey }) => {
  return (
    <QuestionSelector
       selectedIds={currentSelected.map(q => q.id)}
       onSelect={() => {}} // Ignore generic bulk ID update
       onToggleQuestion={(question) => {
          const exists = currentSelected.find(q => q.id === question.id);
          if (exists) {
            onSelectionChange(prev => prev.filter(q => q.id !== question.id));
            toast.info(`Pregunta removida`, { autoClose: 1000, position: 'bottom-right' });
          } else {
            onSelectionChange(prev => [...prev, question]);
            toast.success(`Pregunta añadida al test`, { autoClose: 1000, position: 'bottom-right' });
          }
       }}
       onEditQuestion={onEditQuestion}
       questionOverrides={questionOverrides}
       providerRefreshKey={providerRefreshKey}
    />
  );
}

export default UnifiedTestModal;
