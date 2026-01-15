import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, HelpCircle, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Hooks
import useQuestionsAdmin from '../../hooks/useQuestionsAdmin.js';
import useLessons from '../../hooks/useLessons.js';
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';
import { useTheme } from '../../contexts/ThemeContext';

// Services
import { getCourseLessons } from '../../api/services/courseLessonService';

// Componentes
import QuestionCard from './QuestionCard';
import QuestionModal from './QuestionModal';

const QuestionsManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // --- ESTADOS PRINCIPALES ---
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', questionId: null });
  const [showFilters, setShowFilters] = useState(false);
  
  // 🔥 Estado para lecciones filtradas por curso
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // --- HOOKS DE DATOS ---
  // 🔥 Usamos el nuevo hook específico para admin con filtros extendidos
  const questionsHook = useQuestionsAdmin({ 
    autoFetch: true, 
    perPage: 24,
    debounceMs: 300 
  });
  const lessonsHook = useLessons({ autoFetch: false });
  const quizzesHook = useQuizzes({ autoFetch: false });
  const coursesHook = useCourses({ 
    autoFetch: false,
    status: 'publish,draft,private'
  });
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category', 'qe_provider']);

  // --- CARGAR DATOS RELACIONADOS ---
  useEffect(() => {
    if (lessonsHook.lessons.length === 0 && !lessonsHook.loading) {
      lessonsHook.fetchLessons(true, { perPage: 100 });
    }
    if (quizzesHook.quizzes.length === 0 && !quizzesHook.loading) {
      quizzesHook.fetchQuizzes(true, { perPage: 100 });
    }
    if (coursesHook.courses.length === 0 && !coursesHook.loading) {
      coursesHook.fetchCourses(true, { perPage: 100 });
    }
  }, []);

  // 🔥 Cargar lecciones filtradas cuando se seleccione un curso
  const selectedCourseId = questionsHook.filters?.course_id;
  
  useEffect(() => {
    const loadLessonsForCourse = async () => {
      if (!selectedCourseId || selectedCourseId === 'all') {
        // Si no hay curso seleccionado, mostrar todas las lecciones
        setFilteredLessons(lessonsHook.lessons || []);
        return;
      }
      
      setLessonsLoading(true);
      try {
        const courseIdInt = parseInt(selectedCourseId, 10);
        if (!isNaN(courseIdInt)) {
          const result = await getCourseLessons(courseIdInt, { perPage: 100 });
          setFilteredLessons(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching lessons for course:', error);
        setFilteredLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };
    
    loadLessonsForCourse();
  }, [selectedCourseId, lessonsHook.lessons]);

  // --- OPCIONES DE TAXONOMÍAS ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions.qe_provider]);
  
  // Opciones de cursos y lecciones
  const courseOptions = useMemo(() => 
    (coursesHook.courses || []).map(c => ({ 
      value: c.id.toString(), 
      label: c.title?.rendered || c.title 
    }))
  , [coursesHook.courses]);

  // 🔥 Opciones de lecciones - usa las filtradas por curso
  const lessonOptions = useMemo(() => 
    filteredLessons.map(l => ({ 
      value: l.id.toString(), 
      label: l.title?.rendered || l.title 
    }))
  , [filteredLessons]);

  // 🔥 Handler para cambio de curso - limpia el filtro de lección
  const handleCourseChange = useCallback((courseId) => {
    // Limpiar lección si se cambia el curso
    questionsHook.updateFilter('lessons', null);
    questionsHook.updateFilter('course_id', courseId === 'all' ? null : courseId);
  }, [questionsHook]);

  // --- MANEJADORES DE MODAL ---
  const openCreateModal = () => {
    setModalState({ isOpen: true, mode: 'create', questionId: null });
  };

  const openEditModal = (question) => {
    setModalState({ isOpen: true, mode: 'edit', questionId: question.id });
  };

  const openViewModal = (question) => {
    setModalState({ isOpen: true, mode: 'view', questionId: question.id });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', questionId: null });
  };

  // --- GUARDAR PREGUNTA ---
  const handleSaveQuestion = async (data, nextAction) => {
    try {
      if (modalState.mode === 'create') {
        await questionsHook.createQuestion(data);
        toast.success('Pregunta creada correctamente');
        if (nextAction !== 'reset') {
          closeModal();
        }
      } else {
        await questionsHook.updateQuestion(modalState.questionId, data);
        toast.success('Pregunta actualizada correctamente');
        closeModal();
      }
      questionsHook.refresh();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Error al guardar la pregunta');
      throw error;
    }
  };

  // --- ELIMINAR PREGUNTA ---
  const handleDeleteQuestion = async (question) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
      return;
    }
    
    try {
      await questionsHook.deleteQuestion(question.id);
      toast.success('Pregunta eliminada correctamente');
      questionsHook.refresh();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Error al eliminar la pregunta');
    }
  };

  // --- DUPLICAR PREGUNTA ---
  const handleDuplicateQuestion = async (question) => {
    toast.info('Funcionalidad de duplicación próximamente');
  };

  // pageColors pattern - diseño unificado con frontend
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: isDarkMode ? getColor('background', '#0f172a') : '#f5f7fa',
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
  }), [getColor, isDarkMode]);

  // --- OPCIONES DE FILTROS ---
  const difficultyOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' },
  ];

  // --- RENDERIZADO ---
  const isInitialLoading = !questionsHook.filters || !questionsHook.computed;
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: pageColors.background }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: pageColors.accent }} />
      </div>
    );
  }
  
  const totalQuestions = questionsHook.pagination?.total || 0;
  const activeFiltersCount = [
    questionsHook.filters?.category && questionsHook.filters.category !== 'all',
    questionsHook.filters?.provider && questionsHook.filters.provider !== 'all',
    questionsHook.filters?.difficulty && questionsHook.filters.difficulty !== 'all',
    questionsHook.filters?.course_id && questionsHook.filters.course_id !== 'all',
    questionsHook.filters?.lessons && questionsHook.filters.lessons !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: pageColors.background }}>
      {/* HEADER: Buscador y Filtros */}
      <div 
        className="flex-shrink-0 px-6 py-4"
        style={{ 
          backgroundColor: pageColors.bgCard,
          borderBottom: `1px solid ${pageColors.border}`,
        }}
      >
        {/* Título y botón crear */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: pageColors.text }}>
              Preguntas
            </h1>
            <p className="text-sm mt-0.5" style={{ color: pageColors.textMuted }}>
              {totalQuestions.toLocaleString()} {totalQuestions === 1 ? 'pregunta' : 'preguntas'} en total
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: pageColors.accent }}
          >
            <Plus size={18} />
            Nueva Pregunta
          </button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex items-center gap-3">
          {/* Buscador */}
          <div className="flex-1 relative">
            <Search 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2" 
              style={{ color: pageColors.textMuted }} 
            />
            <input
              type="text"
              value={questionsHook.filters?.search || ''}
              onChange={(e) => questionsHook.updateFilter('search', e.target.value)}
              placeholder="Buscar preguntas por título..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: pageColors.inputBg,
                border: `1px solid ${pageColors.border}`,
                color: pageColors.text,
              }}
            />
            {questionsHook.loading && (
              <Loader2 
                size={16} 
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" 
                style={{ color: pageColors.textMuted }} 
              />
            )}
          </div>

          {/* Botón de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: showFilters || activeFiltersCount > 0 
                ? (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)')
                : pageColors.inputBg,
              border: `1px solid ${showFilters || activeFiltersCount > 0 ? pageColors.accent : pageColors.border}`,
              color: showFilters || activeFiltersCount > 0 ? pageColors.accent : pageColors.text,
            }}
          >
            <Filter size={16} />
            Filtros
            {activeFiltersCount > 0 && (
              <span 
                className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: pageColors.accent }}
              >
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div 
            className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-5 gap-4"
            style={{ borderTop: `1px solid ${pageColors.border}` }}
          >
            {/* Curso */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.tests.course')}
              </label>
              <select
                value={questionsHook.filters?.course_id || 'all'}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                }}
              >
                <option value="all">{t('admin.tests.allCourses')}</option>
                {courseOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Lección - filtrada por curso */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.questionModal.lesson')}
                {lessonsLoading && (
                  <Loader2 size={12} className="inline-block ml-1 animate-spin" />
                )}
              </label>
              <select
                value={questionsHook.filters?.lessons || 'all'}
                onChange={(e) => questionsHook.updateFilter('lessons', e.target.value === 'all' ? null : e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                disabled={lessonsLoading}
                style={{
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                  opacity: lessonsLoading ? 0.7 : 1,
                }}
              >
                <option value="all">{t('common.allLessons')}</option>
                {lessonOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.tests.category')}
              </label>
              <select
                value={questionsHook.filters?.category || 'all'}
                onChange={(e) => questionsHook.updateFilter('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                }}
              >
                <option value="all">{t('admin.tests.allCategories')}</option>
                {categoryOptions.filter(o => o.value !== 'all').map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.questions.provider')}
              </label>
              <select
                value={questionsHook.filters?.provider || 'all'}
                onChange={(e) => questionsHook.updateFilter('provider', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                }}
              >
                <option value="all">{t('admin.questions.allProviders')}</option>
                {providerOptions.filter(o => o.value !== 'all').map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Dificultad */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.tests.difficulty')}
              </label>
              <select
                value={questionsHook.filters?.difficulty || 'all'}
                onChange={(e) => questionsHook.updateFilter('difficulty', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                }}
              >
                {difficultyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Limpiar filtros */}
            {activeFiltersCount > 0 && (
              <div className="md:col-span-5 flex justify-end">
                <button
                  onClick={() => {
                    questionsHook.updateFilter('category', 'all');
                    questionsHook.updateFilter('provider', 'all');
                    questionsHook.updateFilter('difficulty', 'all');
                    questionsHook.updateFilter('course_id', null);
                    questionsHook.updateFilter('lessons', null);
                  }}
                  className="flex items-center gap-1 text-sm"
                  style={{ color: pageColors.accent }}
                >
                  <X size={14} />
                  {t('admin.tests.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENIDO: Grid de tarjetas */}
      <div className="flex-1 overflow-y-auto p-6">
        {questionsHook.questions.length === 0 ? (
          // Estado vacío
          <div 
            className="flex flex-col items-center justify-center h-full rounded-2xl"
            style={{ 
              backgroundColor: pageColors.bgCard,
              border: `1px solid ${pageColors.border}`,
            }}
          >
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: pageColors.hoverBg }}
            >
              <HelpCircle className="w-10 h-10" style={{ color: pageColors.textMuted, opacity: 0.5 }} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: pageColors.text }}>
              {questionsHook.filters?.search ? 'Sin resultados' : 'No hay preguntas'}
            </h3>
            <p className="text-sm mb-4" style={{ color: pageColors.textMuted }}>
              {questionsHook.filters?.search 
                ? 'Intenta con otros términos de búsqueda'
                : 'Crea tu primera pregunta para comenzar'}
            </p>
            {!questionsHook.filters?.search && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: pageColors.accent }}
              >
                <Plus size={16} />
                Crear pregunta
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid de tarjetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {questionsHook.questions.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  quizzes={quizzesHook.quizzes}
                  viewMode="grid"
                  onClick={openEditModal}
                  onEdit={openEditModal}
                  onDuplicate={handleDuplicateQuestion}
                  onDelete={handleDeleteQuestion}
                />
              ))}
            </div>

            {/* Cargar más */}
            {questionsHook.hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={questionsHook.loadMoreQuestions}
                  disabled={questionsHook.loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors"
                  style={{
                    backgroundColor: pageColors.bgCard,
                    border: `1px solid ${pageColors.border}`,
                    color: pageColors.text,
                  }}
                >
                  {questionsHook.loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      Cargar más preguntas
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL */}
      <QuestionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        question={modalState.questionId ? questionsHook.questions.find(q => q.id === modalState.questionId) : null}
        mode={modalState.mode}
        onSave={handleSaveQuestion}
        availableQuizzes={quizzesHook.quizzes}
        availableLessons={lessonsHook.lessons}
        availableCourses={coursesHook.courses}
        isLoading={questionsHook.creating || questionsHook.updating}
      />
    </div>
  );
};

export default QuestionsManager;