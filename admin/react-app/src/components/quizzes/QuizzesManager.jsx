// src/components/quizzes/QuizzesManager.jsx

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  HelpCircle,
  Target,
  Award,
  BarChart,
  BookOpen,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Hooks
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';
import { useTranslation } from 'react-i18next';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Components
import ContentManager from '../common/ContentManager';
import QuizCard from './QuizCard';
import QuizModal from './QuizModal';
import DeleteModal from '../common/DeleteModal';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';
import ResourceGrid from '../common/ResourceGrid.jsx';

const QuizzesManager = () => {
  const { t } = useTranslation();

  // ============================================================
  // LOCAL STATE
  // ============================================================

  const [viewMode, setViewMode] = useState('cards');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ============================================================
  // SEARCH & FILTERS WITH DEBOUNCE
  // ============================================================

  const { searchValue, isSearching, handleSearchChange, clearSearch } =
    useSearchInput('', () => {}, 500);

  const { filters, isFiltering, updateFilter, resetFilters } = useFilterDebounce(
    {
      courseId: 'all',
      quizType: 'all',
      difficulty: 'all',
      status: 'all',
      category: 'all',
    },
    () => {},
    300
  );

  // ============================================================
  // DATA FETCHING HOOKS
  // ============================================================

  const {
    quizzes,
    loading,
    error,
    pagination,
    computed,
    creating,
    updating,
    deleting,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    duplicateQuiz,
    fetchQuizzes
  } = useQuizzes({
    search: searchValue,
    courseId: filters.courseId !== 'all' ? parseInt(filters.courseId) : null,
    quizType: filters.quizType !== 'all' ? filters.quizType : null,
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
    category: filters.category !== 'all' ? filters.category : null,
    status: filters.status !== 'all' ? filters.status : null,
    autoFetch: true,
    perPage: 20
  });

  // 🔥 CORRECCIÓN: Usamos el alias 'availableCourses' para mantener la consistencia
  const { courses: availableCourses, loading: coursesLoading } = useCourses({
    status: 'publish,draft',
    autoFetch: true,
    perPage: 100
  });

  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies } = useTaxonomyOptions(['qe_category']);

  // ============================================================
  // INFINITE SCROLL
  // ============================================================

  const observer = useRef();
  const hasMore = pagination.hasMore;

  const lastQuizElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log('📄 Loading more quizzes...');
        fetchQuizzes(false); // false means don't reset
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchQuizzes]);

  // ============================================================
  // MODAL HANDLERS
  // ============================================================

  const openModal = useCallback((mode, quiz = null) => {
    setModalMode(mode);
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedQuiz(null);
    }, 300);
  }, []);

  const handleSaveQuiz = async (quizData, nextAction = 'close') => {
    try {
      let result;
      if (modalMode === 'create') {
        result = await createQuiz(quizData);
      } else if (modalMode === 'edit') {
        result = await updateQuiz(selectedQuiz.id, quizData);
      }

      if (nextAction === 'close') {
        closeModal();
      } else if (nextAction === 'reset') {
        // Reset form for new entry
        setSelectedQuiz(null);
        setModalMode('create'); // Keep modal open for a new one
      }

      return result;
    } catch (err) {
      console.error('❌ Failed to save quiz:', err);
      throw err;
    }
  };

  // ============================================================
  // ACTION HANDLERS
  // ============================================================

  const handleRefresh = useCallback(() => {
    fetchQuizzes(true); // true means reset
  }, [fetchQuizzes]);

  const handleDeleteClick = useCallback((quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!quizToDelete) return;
    try {
      await deleteQuiz(quizToDelete.id);
      setShowDeleteModal(false);
      setQuizToDelete(null);
    } catch (err) {
      console.error('❌ Failed to delete quiz:', err);
    }
  };

  const handleDuplicate = useCallback(async (quiz) => {
    try {
      await duplicateQuiz(quiz.id);
    } catch (error) {
      console.error('Error duplicating quiz:', error);
    }
  }, [duplicateQuiz]);


  // ============================================================
  // COMPUTED VALUES & CONFIGS
  // ============================================================

  const statsCards = useMemo(() => [
    { label: 'Total Quizzes', value: computed?.total || 0, icon: HelpCircle, iconColor: 'text-blue-500' },
    { label: 'Total Questions', value: computed?.totalQuestions || 0, icon: Target, iconColor: 'text-purple-500' },
    { label: 'Total Points', value: computed?.totalPoints || 0, icon: Award, iconColor: 'text-green-500' },
    { label: 'Avg. Questions', value: computed?.averageQuestions || 0, icon: BarChart, iconColor: 'text-orange-500' },
  ], [computed]);

  const searchConfig = {
    value: searchValue,
    onChange: (e) => handleSearchChange(e.target.value),
    onClear: clearSearch,
    placeholder: 'Search quizzes...',
    isLoading: isSearching,
  };

  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    ...(availableCourses || []).map(c => ({ value: c.id.toString(), label: c.title?.rendered || c.title }))
  ], [availableCourses]);

  const filtersConfig = [
    {
      label: 'Course',
      value: filters.courseId,
      onChange: (value) => updateFilter('courseId', value),
      options: courseOptions,
      isLoading: coursesLoading,
    },
    {
      label: 'Category',
      value: filters.category,
      onChange: (value) => updateFilter('category', value),
      options: taxonomyOptions.qe_category || [],
      isLoading: isLoadingTaxonomies,
    },
    // Add other filters like difficulty, type, status here if needed
  ];


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Quizzes"
        description="Create and manage quizzes to assess student learning."
        stats={statsCards}
        primaryAction={{
          text: "Create Quiz",
          onClick: () => openModal('create'),
          isLoading: creating,
          icon: BookOpen
        }}
        isLoading={isFiltering || isSearching}
      />

      <FilterBar
        searchConfig={searchConfig}
        filtersConfig={filtersConfig}
        onRefresh={handleRefresh}
        onResetFilters={resetFilters}
        isLoading={loading && quizzes.length === 0}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}


      <ContentManager
        items={quizzes}
        loading={loading && quizzes.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        emptyState={{ icon: HelpCircle, title: 'No Quizzes Found', onAction: () => openModal('create'), actionText: 'Create First Quiz' }}
      >
        <ResourceGrid
          items={quizzes}
          ItemComponent={QuizCard}
          lastItemRef={lastQuizElementRef}
          itemProps={{
            resourceName: 'quiz',
            onEdit: (quiz) => openModal('edit', quiz),
            onDelete: handleDeleteClick,
            onDuplicate: handleDuplicate,
            onView: (quiz) => openModal('view', quiz),
          }}
        />
      </ContentManager>

      {loading && quizzes.length > 0 && (
        <div className="col-span-full text-center py-8">
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
            <span>{t('lessons.loadingMoreLessons')}</span>
          </div>
        </div>
      )}
      {!loading && !hasMore && quizzes.length > 0 && (
        <div className="col-span-full text-center py-8">
          <p className="text-sm text-gray-500">{t('common.endOfList')}</p>
        </div>
      )}


      {isModalOpen && (
        <QuizModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveQuiz}
          quiz={selectedQuiz}
          mode={modalMode}
          availableCourses={courseOptions.filter(opt => opt.value !== 'all')}
          availableCategories={taxonomyOptions.qe_category?.filter(opt => opt.value !== 'all') || []}
          isLoading={creating || updating}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Quiz"
          message={`Are you sure you want to delete "${quizToDelete?.title?.rendered || ''}"? This cannot be undone.`}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default QuizzesManager;