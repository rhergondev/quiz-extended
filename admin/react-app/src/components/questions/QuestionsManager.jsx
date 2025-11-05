import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

// Hooks
import useQuestions from '../../hooks/useQuestions.js';
import useLessons from '../../hooks/useLessons.js';
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Componentes comunes
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';

// Componentes específicos
import QuestionListItem from './QuestionListItem';
import QuestionEditorPanel from './QuestionEditorPanel';

const QuestionsManager = () => {
  const { t } = useTranslation();

  // --- ESTADOS PRINCIPALES ---
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [mode, setMode] = useState('view');

  // --- HOOKS DE DATOS ---
  const questionsHook = useQuestions({ autoFetch: true, perPage: 100 });
  const lessonsHook = useLessons({ autoFetch: false }); // Solo cargar cuando sea necesario
  const quizzesHook = useQuizzes({ autoFetch: false }); // Solo cargar cuando sea necesario
  const coursesHook = useCourses({ autoFetch: false }); // Solo cargar cuando sea necesario
  // CORRECCIÓN: Añadimos 'qe_provider' para que el hook lo cargue
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category', 'qe_provider']);

  // --- MANEJADORES DE UI ---
  const handleSelectQuestion = (question) => {
    setSelectedQuestionId(question.id);
    setMode('edit');
  };

  const handleCreateNew = () => {
    setSelectedQuestionId(null);
    setMode('create');
  };
  
  const handleClosePanel = () => {
      setSelectedQuestionId(null);
      setMode('view');
  }

  // Cargar datos necesarios solo cuando se abre el editor
  useEffect(() => {
    if (mode === 'edit' || mode === 'create') {
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
  }, [mode]);

  // --- CONFIGS PARA COMPONENTES HIJO ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions.qe_provider]); // NUEVO
  
  const lessonOptions = useMemo(() => {
    const baseOptions = [{ value: 'all', label: 'Todas las Lecciones' }];
    if (lessonsHook.lessons && lessonsHook.lessons.length > 0) {
      return [
        ...baseOptions,
        ...(lessonsHook.lessons || []).map(l => ({ value: l.id.toString(), label: l.title?.rendered || l.title }))
      ];
    }
    return baseOptions;
  }, [lessonsHook.lessons]);
  
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
        label: 'Proveedor',
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

  // --- RENDERIZADO ---
  const isInitialLoading = !questionsHook.filters || !questionsHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }
  
  return (
    <div className="qe-lms-admin-app h-full flex overflow-hidden px-6 py-6 space-x-6">
      <div className="transition-all duration-500 ease-in-out h-full flex-shrink-0 w-full lg:w-[30%]">
        <ListPanel
          title={t('questions.title')}
          itemCount={questionsHook.pagination.total || 0}
          createButtonText={t('questions.addNew')}
          onCreate={handleCreateNew}
          isCreating={questionsHook.creating}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
          onLoadMore={questionsHook.loadMoreQuestions}
          hasMore={questionsHook.hasMore}
          isLoadingMore={questionsHook.loading && questionsHook.questions.length > 0}
        >
          {(questionsHook.questions || []).map(question => (
            <QuestionListItem key={question.id} question={question} isSelected={selectedQuestionId === question.id} onClick={handleSelectQuestion} />
          ))}
        </ListPanel>
      </div>

      <div className={clsx("transition-all duration-500 ease-in-out h-full flex-1", { "w-0 opacity-0": mode === 'view', "opacity-100": mode !== 'view' })}>
        {(mode === 'edit' || mode === 'create') && (
          <QuestionEditorPanel
            key={selectedQuestionId || 'new'}
            questionId={selectedQuestionId}
            mode={mode}
            onSave={mode === 'create' ? questionsHook.createQuestion : (data) => questionsHook.updateQuestion(selectedQuestionId, data)}
            onCancel={handleClosePanel}
            categoryOptions={categoryOptions.filter(opt => opt.value !== 'all')}
            providerOptions={providerOptions.filter(opt => opt.value !== 'all')} // NUEVO
            onCategoryCreated={refetchTaxonomies}
            onProviderCreated={refetchTaxonomies} // NUEVO
            availableQuizzes={quizzesHook.quizzes}
            availableLessons={lessonsHook.lessons}
            availableCourses={coursesHook.courses}
          />
        )}
      </div>
    </div>
  );
};

export default QuestionsManager;
