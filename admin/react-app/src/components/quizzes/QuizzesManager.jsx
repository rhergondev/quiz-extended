import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Hooks
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Nuevos componentes de Layout y UI
import MasterDetailLayout from '../common/layout/MasterDetailLayout';
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';
import QuizListItem from './QuizListItem';
import QuizEditorPanel from './QuizEditorPanel'; // ¡Importamos el nuevo panel!

const QuizzesManager = () => {
  const { t } = useTranslation();

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'create'
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // ============================================================
  // DATA FETCHING HOOKS
  // ============================================================
  const {
    quizzes,
    loading,
    error,
    pagination,
    creating,
    filters,
    updateFilter,
    createQuiz,
    updateQuiz,
    loadMoreQuizzes,
    hasMore,
  } = useQuizzes({ 
    autoFetch: true, 
    perPage: 50,
    debounceMs: 300 
  });

  const { courses: availableCourses, loading: coursesLoading, fetchCourses } = useCourses({ 
    autoFetch: false,
    status: 'publish,draft,private' // 🎯 Admin: mostrar todos los estados
  });
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies } = useTaxonomyOptions(['qe_category']);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleSelectQuiz = (quizId) => {
    setSelectedQuizId(quizId);
    setMode('edit');
  };

  const handleCreateNew = () => {
    setSelectedQuizId(null);
    setMode('create');
  };

  const handleSaveQuiz = async (quizData) => {
    if (mode === 'create') {
      const newQuiz = await createQuiz(quizData);
      setSelectedQuizId(newQuiz.id);
      setMode('edit');
    } else if (mode === 'edit') {
      await updateQuiz(selectedQuizId, quizData);
    }
  };

  // 🔧 TEMPORAL: Función para sincronizar course_ids en quizzes
  const handleSyncCourseIds = async () => {
    if (!confirm('¿Estás seguro de que quieres sincronizar los Course IDs de todos los quizzes?\n\nEsto actualizará el campo _course_ids basándose en las lecciones que contienen cada quiz.')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const apiUrl = window.qe_data?.endpoints?.custom_api || window.qe_data?.api_url + '/quiz-extended/v1';
      const response = await fetch(`${apiUrl}/sync-quiz-course-ids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.qe_data.nonce,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setSyncResult(result);
      
      const data = result.data || result;
      const message = `✅ Sincronización completa!\n\nTotal de quizzes: ${data.total || 0}\nSincronizados exitosamente: ${data.synced || 0}\nErrores: ${data.errors || 0}`;
      alert(message);
    } catch (error) {
      console.error('Error syncing course IDs:', error);
      alert(`❌ Error al sincronizar:\n\n${error.message}\n\nRevisa la consola para más detalles.`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Cargar cursos solo cuando sea necesario (al abrir editor o filtros)
  useEffect(() => {
    if ((mode === 'edit' || mode === 'create' || filters.courseId !== null) && 
        availableCourses.length === 0 && !coursesLoading) {
      fetchCourses(true, { perPage: 100 });
    }
  }, [mode, filters.courseId]);

  // ============================================================
  // CONFIGS PARA COMPONENTES REUTILIZABLES
  // ============================================================
  const searchConfig = {
    value: filters.search,
    onChange: (e) => updateFilter('search', e.target.value),
    placeholder: t('quizzes.searchPlaceholder'),
    isLoading: loading,
  };
  
  const courseOptions = useMemo(() => 
    (availableCourses || []).map(c => ({ value: c.id.toString(), label: c.title?.rendered || c.title }))
  , [availableCourses]);

  const categoryOptions = useMemo(() =>
    (taxonomyOptions.qe_category || []).filter(opt => opt.value !== 'all')
  , [taxonomyOptions.qe_category]);

  const filtersConfig = [
    {
      label: t('quizzes.form.course'),
      value: filters.courseId || 'all',
      onChange: (value) => updateFilter('courseId', value),
      options: [{ value: 'all', label: t('courses.all') }, ...courseOptions],
      isLoading: coursesLoading,
    },
    {
      label: t('quizzes.form.category'),
      value: filters.category || 'all',
      onChange: (value) => updateFilter('category', value),
      options: taxonomyOptions.qe_category || [{ value: 'all', label: t('courses.category.all') }],
      isLoading: isLoadingTaxonomies,
    },
  ];

  // ============================================================
  // RENDERIZADO DE PANELES
  // ============================================================

  const masterPanel = (
    <ListPanel
      title={t('quizzes.title')}
      itemCount={pagination.total || 0}
      createButtonText={t('quizzes.createNew')}
      onCreate={handleCreateNew}
      isCreating={creating}
      filters={
        <div className="space-y-2">
          <FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />
          {/* 🔧 TEMPORAL: Botón de sincronización - ELIMINAR después de migración */}
          <button
            onClick={handleSyncCourseIds}
            disabled={isSyncing}
            className="w-full px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-md transition-colors"
          >
            {isSyncing ? '⏳ Sincronizando...' : '🔄 Sincronizar Course IDs (TEMPORAL)'}
          </button>
        </div>
      }
      onLoadMore={loadMoreQuizzes}
      hasMore={hasMore}
      isLoadingMore={loading && quizzes.length > 0}
    >
      {loading && quizzes.length === 0 ? (
        <p className="p-4 text-center text-gray-500">{t('common.loading')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {quizzes.map(quiz => (
            <QuizListItem
              key={quiz.id}
              quiz={quiz}
              isSelected={selectedQuizId === quiz.id}
              onClick={() => handleSelectQuiz(quiz.id)}
            />
          ))}
        </ul>
      )}
    </ListPanel>
  );

  const detailPanel = (
    (mode === 'edit' || mode === 'create') ? (
      <QuizEditorPanel
        key={selectedQuizId || 'create'}
        quizId={selectedQuizId}
        mode={mode}
        onSave={handleSaveQuiz}
        availableCourses={courseOptions}
        availableCategories={categoryOptions}
      />
    ) : (
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full justify-center items-center">
        <div className="text-center text-gray-500">
          <p>{t('quizzes.selectQuizToStart')}</p>
        </div>
      </div>
    )
  );

  return (
    <div className="bg-gray-100 h-full">
        {error && <p className="text-red-500 bg-red-50 p-4 rounded-md mb-4">{error}</p>}
        <MasterDetailLayout master={masterPanel} detail={detailPanel} />
    </div>
  );
};

export default QuizzesManager;
