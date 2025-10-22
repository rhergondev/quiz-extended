import React, { useState, useMemo } from 'react';
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
  const questionsHook = useQuestions({ autoFetch: true, perPage: 50 });
  const lessonsHook = useLessons({ autoFetch: true, perPage: 100 });
  const quizzesHook = useQuizzes({ autoFetch: true, perPage: 100 });
  const coursesHook = useCourses({ autoFetch: true, perPage: 100 });
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

  // --- CONFIGS PARA COMPONENTES HIJO ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions.qe_provider]); // NUEVO
  
  const lessonOptions = useMemo(() => [
    { value: 'all', label: 'Todas las Lecciones' },
    ...(lessonsHook.lessons || []).map(l => ({ value: l.id.toString(), label: l.title?.rendered || l.title }))
  ], [lessonsHook.lessons]);
  
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
        label: 'Lección',
        value: questionsHook.filters.lessonId || 'all',
        onChange: (value) => questionsHook.updateFilter('lessonId', value),
        options: lessonOptions,
        isLoading: lessonsHook.loading,
      },
      {
        label: 'Proveedor',
        value: questionsHook.filters.provider || 'all',
        onChange: (value) => questionsHook.updateFilter('provider', value),
        options: providerOptions,
        isLoading: isLoadingTaxonomies,
      },
    ];
  }, [questionsHook.filters, categoryOptions, lessonOptions, providerOptions, isLoadingTaxonomies, lessonsHook.loading, t]);

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
          itemCount={questionsHook.computed.total || 0}
          createButtonText={t('questions.addNew')}
          onCreate={handleCreateNew}
          isCreating={questionsHook.creating}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
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
