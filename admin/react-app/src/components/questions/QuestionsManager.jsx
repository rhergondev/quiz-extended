import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Hooks
import useQuestions from '../../hooks/useQuestions.js';
import useLessons from '../../hooks/useLessons.js';
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';
import { useTheme } from '../../contexts/ThemeContext';

// Componentes comunes
import ListPanel from '../common/layout/ListPanel';
import ManagerHeader from '../common/layout/ManagerHeader';
import FilterBar from '../common/FilterBar';

// Componentes específicos
import QuestionListItem from './QuestionListItem';
import QuestionEditorPanel from './QuestionEditorPanel';
import QuestionDetailsPanel from './QuestionDetailsPanel';

const QuestionsManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // --- ESTADOS PRINCIPALES ---
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [viewMode, setViewMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]); // Para batch actions

  // --- HOOKS DE DATOS ---
  const questionsHook = useQuestions({ 
    autoFetch: true, 
    perPage: 50,
    debounceMs: 300 
  });
  const lessonsHook = useLessons({ autoFetch: false });
  const quizzesHook = useQuizzes({ autoFetch: false });
  const coursesHook = useCourses({ 
    autoFetch: false,
    status: 'publish,draft,private'
  });
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category', 'qe_provider']);

  // --- CONFIGS PARA COMPONENTES HIJO ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions.qe_provider]);
  
  const filtersConfig = useMemo(() => {
    if (!questionsHook.filters) return [];
    return [
      {
        label: t('filters.category'),
        value: questionsHook.filters.category || 'all',
        onChange: (value) => questionsHook.updateFilter('category', value),
        options: categoryOptions,
        isLoading: isLoadingTaxonomies,
      },
      {
        label: t('questions.fields.provider'),
        value: questionsHook.filters.provider || 'all',
        onChange: (value) => questionsHook.updateFilter('provider', value),
        options: providerOptions,
        isLoading: isLoadingTaxonomies,
      },
    ];
  }, [questionsHook.filters, categoryOptions, providerOptions, isLoadingTaxonomies, t]);

  const searchConfig = useMemo(() => ({
      value: questionsHook.filters?.search || '',
      onChange: (e) => questionsHook.updateFilter('search', e.target.value),
      placeholder: t('questions.searchPlaceholder'),
      isLoading: questionsHook.loading,
  }), [questionsHook.filters, questionsHook.loading, t]);

  // --- MANEJADORES DE UI ---
  const handleSelectQuestion = (question) => {
    setSelectedQuestionId(question.id);
    setViewMode('view');
  };

  const handleCreateNew = () => {
    setSelectedQuestionId(null);
    setViewMode('create');
  };

  const handleEditQuestion = () => {
    setViewMode('edit');
  };

  const handleSaveQuestion = async (data) => {
    try {
      if (viewMode === 'create') {
        await questionsHook.createQuestion(data);
        toast.success('Pregunta creada correctamente');
        setViewMode('view');
        setSelectedQuestionId(null);
      } else {
        await questionsHook.updateQuestion(selectedQuestionId, data);
        toast.success('Pregunta actualizada correctamente');
        setViewMode('view');
        questionsHook.refresh();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Error al guardar la pregunta');
    }
  };

  const handleCancelEdit = () => {
    if (viewMode === 'create') {
      setSelectedQuestionId(null);
    }
    setViewMode('view');
  };

  const handleDeleteQuestion = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta pregunta?')) {
      return;
    }
    
    try {
      await questionsHook.deleteQuestion(selectedQuestionId);
      toast.success('Pregunta eliminada correctamente');
      setSelectedQuestionId(null);
      setViewMode('view');
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Error al eliminar la pregunta');
    }
  };

  // --- BATCH ACTIONS ---
  const handleDeleteSelected = async () => {
    if (selectedQuestionIds.length === 0) return;
    
    const count = selectedQuestionIds.length;
    if (!window.confirm(`¿Eliminar ${count} ${count === 1 ? 'pregunta' : 'preguntas'}?`)) {
      return;
    }

    try {
      await Promise.all(selectedQuestionIds.map(id => questionsHook.deleteQuestion(id)));
      toast.success(`${count} ${count === 1 ? 'pregunta eliminada' : 'preguntas eliminadas'} correctamente`);
      setSelectedQuestionIds([]);
      if (selectedQuestionIds.includes(selectedQuestionId)) {
        setSelectedQuestionId(null);
        setViewMode('view');
      }
      questionsHook.refresh();
    } catch (error) {
      console.error('Error deleting questions:', error);
      toast.error('Error al eliminar las preguntas');
    }
  };

  const handleDuplicateSelected = async () => {
    // TODO: Implementar duplicación batch
    toast.info('Funcionalidad de duplicación próximamente');
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Cargar datos necesarios solo cuando se abre el editor o vista
  useEffect(() => {
    if (viewMode === 'edit' || viewMode === 'create' || (viewMode === 'view' && selectedQuestionId)) {
      if (lessonsHook.lessons.length === 0 && !lessonsHook.loading) {
        lessonsHook.fetchLessons(true, { perPage: 100 });
      }
      if (quizzesHook.quizzes.length === 0 && !quizzesHook.loading) {
        quizzesHook.fetchQuizzes(true, { perPage: 100 });
      }
      if (coursesHook.courses.length === 0 && !coursesHook.loading) {
        coursesHook.fetchCourses(true, { perPage: 100 });
      }
    }
  }, [viewMode, selectedQuestionId]);

  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
  };

  // Obtener pregunta seleccionada
  const selectedQuestion = useMemo(
    () => questionsHook.questions?.find(q => q.id === selectedQuestionId),
    [selectedQuestionId, questionsHook.questions]
  );

  // --- RENDERIZADO ---
  const isInitialLoading = !questionsHook.filters || !questionsHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER CON DARK MODE Y BATCH ACTIONS */}
      <ManagerHeader
        selectedCount={selectedQuestionIds.length}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        batchActionsConfig={{
          showDelete: true,
          showDuplicate: true,
          showExport: false
        }}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div 
        className="flex-1 flex overflow-hidden p-4 gap-4"
        style={{ backgroundColor: pageColors.background }}
      >
      {/* LISTADO (30%) */}
      <div className="w-[30%] h-full flex-shrink-0">
        <ListPanel
          title={t('questions.title')}
          itemCount={questionsHook.pagination?.total || 0}
          createButtonText={t('questions.addNew')}
          onCreate={handleCreateNew}
          isCreating={questionsHook.creating}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
          onLoadMore={questionsHook.loadMoreQuestions}
          hasMore={questionsHook.hasMore}
          isLoadingMore={questionsHook.loading && questionsHook.questions.length > 0}
        >
          {(questionsHook.questions || []).map(question => (
            <QuestionListItem 
              key={question.id} 
              question={question} 
              isSelected={selectedQuestionId === question.id} 
              onClick={handleSelectQuestion}
              isMultiSelectMode={selectedQuestionIds.length > 0}
              isChecked={selectedQuestionIds.includes(question.id)}
              onToggleCheck={toggleQuestionSelection}
            />
          ))}
        </ListPanel>
      </div>

      {/* PANEL DE DETALLES/EDICIÓN (70%) */}
      <div className="flex-1 h-full">
        {selectedQuestionId || viewMode === 'create' ? (
          viewMode === 'create' ? (
            // Modo creación: directamente el editor
            <QuestionEditorPanel
              key="new"
              questionId={null}
              mode="create"
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              categoryOptions={categoryOptions.filter(opt => opt.value !== 'all')}
              providerOptions={providerOptions.filter(opt => opt.value !== 'all')}
              onCategoryCreated={refetchTaxonomies}
              onProviderCreated={refetchTaxonomies}
              availableQuizzes={quizzesHook.quizzes}
              availableLessons={lessonsHook.lessons}
              availableCourses={coursesHook.courses}
            />
          ) : (
            // Modo vista/edición: panel dual
            <QuestionDetailsPanel
              question={selectedQuestion}
              mode={viewMode}
              onEdit={handleEditQuestion}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              onDelete={handleDeleteQuestion}
              categoryOptions={categoryOptions.filter(opt => opt.value !== 'all')}
              providerOptions={providerOptions.filter(opt => opt.value !== 'all')}
              onCategoryCreated={refetchTaxonomies}
              onProviderCreated={refetchTaxonomies}
              availableQuizzes={quizzesHook.quizzes}
              availableLessons={lessonsHook.lessons}
              availableCourses={coursesHook.courses}
            />
          )
        ) : (
          // Estado vacío - Estilo frontend unificado
          <div 
            className="h-full flex items-center justify-center rounded-2xl"
            style={{ 
              backgroundColor: pageColors.bgCard,
              border: `1px solid ${pageColors.cardBorder}`,
              boxShadow: pageColors.shadow
            }}
          >
            <div className="text-center">
              <div 
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: pageColors.hoverBg }}
              >
                <HelpCircle 
                  className="w-10 h-10" 
                  style={{ color: pageColors.textMuted, opacity: 0.5 }} 
                />
              </div>
              <p className="text-lg font-medium mb-2" style={{ color: pageColors.text }}>
                {t('questions.details.emptyStateTitle')}
              </p>
              <p className="text-sm" style={{ color: pageColors.textMuted }}>
                {t('questions.details.emptyStateDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default QuestionsManager;