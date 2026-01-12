import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, FileText, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Hooks
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';
import { useTheme } from '../../contexts/ThemeContext';

// Componentes
import QuizCard from './QuizCard';
import QuizModal from './QuizModal';

const QuizzesManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // --- ESTADOS PRINCIPALES ---
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', quizId: null });
  const [showFilters, setShowFilters] = useState(false);

  // --- HOOKS DE DATOS ---
  const quizzesHook = useQuizzes({ 
    autoFetch: true, 
    perPage: 24,
    debounceMs: 300 
  });

  const coursesHook = useCourses({ 
    autoFetch: false,
    status: 'publish,draft,private'
  });

  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- CARGAR DATOS RELACIONADOS ---
  useEffect(() => {
    if (coursesHook.courses.length === 0 && !coursesHook.loading) {
      coursesHook.fetchCourses(true, { perPage: 100 });
    }
  }, []);

  // --- OPCIONES DE TAXONOMÍAS ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  
  const courseOptions = useMemo(() => 
    (coursesHook.courses || []).map(c => ({ 
      value: c.id.toString(), 
      label: c.title?.rendered || c.title 
    }))
  , [coursesHook.courses]);

  // --- MANEJADORES DE MODAL ---
  const openCreateModal = () => {
    setModalState({ isOpen: true, mode: 'create', quizId: null });
  };

  const openEditModal = (quiz) => {
    setModalState({ isOpen: true, mode: 'edit', quizId: quiz.id });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', quizId: null });
  };

  // --- GUARDAR QUIZ ---
  const handleSaveQuiz = async (data) => {
    try {
      if (modalState.mode === 'create') {
        const newQuiz = await quizzesHook.createQuiz(data);
        toast.success(t('admin.tests.createSuccess'));
        // Abrir en modo edición tras crear
        setModalState({ isOpen: true, mode: 'edit', quizId: newQuiz.id });
      } else {
        await quizzesHook.updateQuiz(modalState.quizId, data);
        toast.success(t('admin.tests.updateSuccess'));
        closeModal();
      }
      quizzesHook.refresh();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(t('errors.saveQuiz'));
      throw error;
    }
  };

  // --- ELIMINAR QUIZ ---
  const handleDeleteQuiz = async (quiz) => {
    const title = quiz.title?.rendered || quiz.title;
    if (!window.confirm(t('admin.tests.deleteConfirm', { title }))) {
      return;
    }
    
    try {
      await quizzesHook.deleteQuiz(quiz.id);
      toast.success(t('admin.tests.deleteSuccess'));
      quizzesHook.refresh();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error(t('errors.saveQuiz'));
    }
  };

  // --- DUPLICAR QUIZ ---
  const handleDuplicateQuiz = async (quiz) => {
    toast.info(t('admin.tests.duplicateComingSoon'));
  };

  // --- ESTADÍSTICAS QUIZ ---
  const handleViewStats = (quiz) => {
    toast.info(t('admin.tests.statsComingSoon'));
  };

  // pageColors pattern
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

  // --- RENDERIZADO ---
  const isInitialLoading = !quizzesHook.filters || !quizzesHook.pagination;
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: pageColors.background }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: pageColors.accent }} />
      </div>
    );
  }
  
  const totalQuizzes = quizzesHook.pagination?.total || 0;
  const activeFiltersCount = [
    quizzesHook.filters?.category && quizzesHook.filters.category !== 'all',
    quizzesHook.filters?.courseId && quizzesHook.filters.courseId !== 'all',
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
              {t('admin.tests.title')}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: pageColors.textMuted }}>
              {t('admin.tests.total', { count: totalQuizzes })}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: pageColors.accent }}
          >
            <Plus size={18} />
            {t('admin.tests.newTest')}
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
              value={quizzesHook.filters?.search || ''}
              onChange={(e) => quizzesHook.updateFilter('search', e.target.value)}
              placeholder={t('admin.tests.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                backgroundColor: pageColors.inputBg,
                border: `1px solid ${pageColors.border}`,
                color: pageColors.text,
              }}
            />
            {quizzesHook.loading && (
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
            {t('admin.tests.filters')}
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
            className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{ borderTop: `1px solid ${pageColors.border}` }}
          >
            {/* Curso */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.tests.course')}
              </label>
              <select
                value={quizzesHook.filters?.courseId || 'all'}
                onChange={(e) => quizzesHook.updateFilter('courseId', e.target.value)}
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

            {/* Categoría */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.textMuted }}>
                {t('admin.tests.category')}
              </label>
              <select
                value={quizzesHook.filters?.category || 'all'}
                onChange={(e) => quizzesHook.updateFilter('category', e.target.value)}
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

            {/* Limpiar filtros */}
            {activeFiltersCount > 0 && (
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => {
                    quizzesHook.updateFilter('category', 'all');
                    quizzesHook.updateFilter('courseId', 'all');
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
        {quizzesHook.quizzes.length === 0 ? (
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
              <FileText className="w-10 h-10" style={{ color: pageColors.textMuted, opacity: 0.5 }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
              {t('admin.tests.noTests')}
            </h3>
            <p className="text-sm mb-6" style={{ color: pageColors.textMuted }}>
              {quizzesHook.filters?.search 
                ? t('common.noResults')
                : t('admin.tests.noTestsDescription')}
            </p>
            {!quizzesHook.filters?.search && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white"
                style={{ backgroundColor: pageColors.accent }}
              >
                <Plus size={18} />
                {t('admin.tests.newTest')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid de tarjetas */}
            <div 
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              }}
            >
              {quizzesHook.quizzes.map(quiz => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={openEditModal}
                  onDelete={handleDeleteQuiz}
                  onDuplicate={handleDuplicateQuiz}
                  onStats={handleViewStats}
                />
              ))}
            </div>

            {/* Cargar más */}
            {quizzesHook.hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => quizzesHook.loadMoreQuizzes()}
                  disabled={quizzesHook.loading}
                  className="px-6 py-2.5 rounded-xl font-medium transition-colors"
                  style={{
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.border}`,
                    color: pageColors.text,
                  }}
                >
                  {quizzesHook.loading ? t('common.loading') : t('admin.tests.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <QuizModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        quizId={modalState.quizId}
        mode={modalState.mode}
        onSave={handleSaveQuiz}
        availableCourses={courseOptions}
        availableCategories={categoryOptions.filter(o => o.value !== 'all')}
      />
    </div>
  );
};

export default QuizzesManager;
