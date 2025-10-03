import React, { useState, useCallback, useMemo, useRef } from 'react';
import { HelpCircle, Target, FileText, Plus, RefreshCw, AlertCircle, Star } from 'lucide-react';

// Hooks actualizados
import useQuestions from '../../hooks/useQuestions.js';
import { useQuizzes } from '../../hooks/useQuizzes.js';
import { useLessons } from '../../hooks/useLessons.js';
import { useTranslation } from 'react-i18next';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Componentes reutilizables
import ContentManager from '../common/ContentManager.jsx';
import QuestionCard from './QuestionCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';
import QuestionModal from './QuestionModal.jsx';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';
import ResourceGrid from '../common/ResourceGrid.jsx';

const QuestionsManager = () => {
  const { t } = useTranslation();

  // --- GESTIÓN DE ESTADO ---
  const [viewMode, setViewMode] = useState('cards');
  const [modalMode, setModalMode] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  
  // --- GESTIÓN DE FILTROS ---
  const [filters, setFilters] = useState({
    search: '',
    quizId: 'all',
    type: 'all',
    difficulty: 'all',
    category: 'all',
  });
  
  // --- FETCHING DE DATOS ---
  const { 
    questions, loading, error, pagination, computed, creating, updating, deleting,
    createQuestion, updateQuestion, deleteQuestion, duplicateQuestion, fetchQuestions, hasMore
  } = useQuestions({
    search: filters.search,
    quizId: filters.quizId !== 'all' ? filters.quizId : null,
    type: filters.type !== 'all' ? filters.type : null,
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
    category: filters.category !== 'all' ? filters.category : null,
    autoFetch: true,
    debounceMs: 500
  });

  const { quizzes, loading: quizzesLoading } = useQuizzes({ autoFetch: true, perPage: 100 });
  const { lessons, loading: lessonsLoading } = useLessons({ autoFetch: true, perPage: 100 });
  
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- INFINITE SCROLL ---
  const observer = useRef();
  const lastQuestionElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchQuestions(false); // Cargar más
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchQuestions]);
  
  // --- MANEJADORES DE MODALES Y ACCIONES ---
  const openModal = useCallback((mode, question = null) => {
    setModalMode(mode);
    setSelectedQuestion(question);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedQuestion(null);
    }, 300);
  }, []);

  const handleSaveQuestion = async (questionData, nextAction) => {
    try {
      if (modalMode === 'edit') {
        await updateQuestion(selectedQuestion.id, questionData);
      } else {
        await createQuestion(questionData);
      }
      if (nextAction === 'close') closeModal();
      else if (nextAction === 'reset') {
        setSelectedQuestion(null);
        setModalMode('create');
      }
    } catch (err) {
      console.error("Failed to save question:", err);
      throw err;
    }
  };

  const handleDeleteClick = useCallback((question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    await deleteQuestion(questionToDelete.id);
    setShowDeleteModal(false);
    setQuestionToDelete(null);
  };
  
  const handleDuplicate = useCallback(async (question) => {
      await duplicateQuestion(question.id);
  }, [duplicateQuestion]);

  // --- VALORES COMPUTADOS Y CONFIGURACIONES ---
  const statsCards = useMemo(() => [
    { label: 'Total Questions', value: pagination.total || 0, icon: HelpCircle, iconColor: 'text-blue-500' },
    { label: 'Total Points', value: computed.totalPoints || 0, icon: Star, iconColor: 'text-yellow-500' },
    { label: 'True/False', value: computed.trueFalseQuestions || 0, icon: Target, iconColor: 'text-green-500' },
    { label: 'Essay Questions', value: computed.essayQuestions || 0, icon: FileText, iconColor: 'text-indigo-500' },
  ], [computed, pagination.total]);
  
  const quizOptions = useMemo(() => [{ value: 'all', label: 'All Quizzes' }, ...quizzes.map(q => ({ value: q.id.toString(), label: q.title || `Quiz ${q.id}` }))], [quizzes]);
  
  const filtersConfig = [
    {
      label: 'Quiz',
      value: filters.quizId,
      onChange: (value) => setFilters(prev => ({...prev, quizId: value})),
      options: quizOptions,
      isLoading: quizzesLoading,
    },
    {
      label: 'Category',
      value: filters.category,
      onChange: (value) => setFilters(prev => ({...prev, category: value})),
      options: taxonomyOptions.qe_category || [],
      isLoading: isLoadingTaxonomies,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Question Management"
        description="Manage and organize all questions for your quizzes."
        stats={statsCards}
        primaryAction={{ text: "Create Question", onClick: () => openModal('create'), icon: Plus, isLoading: creating }}
        secondaryAction={{ text: "Refresh", onClick: () => fetchQuestions(true), icon: RefreshCw, isLoading: loading && !creating }}
      />
      
      <FilterBar
        searchConfig={{
            value: filters.search,
            onChange: (e) => setFilters(f => ({...f, search: e.target.value})),
            onClear: () => setFilters(f => ({...f, search: ''})),
            placeholder: 'Search questions...'
        }}
        filtersConfig={filtersConfig}
        onResetFilters={() => setFilters({ search: '', quizId: 'all', type: 'all', difficulty: 'all', category: 'all' })}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <ContentManager
        items={questions}
        loading={loading && questions.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        emptyState={{ icon: HelpCircle, title: 'No Questions Found', onAction: () => openModal('create'), actionText: "Create First Question" }}
        title="Questions"
      >
        <ResourceGrid
          items={questions}
          ItemComponent={QuestionCard}
          lastItemRef={lastQuestionElementRef}
          itemProps={{
            resourceName: 'question',
            viewMode: viewMode,
            quizzes: quizzes,
            availableLessons: lessons,
            onEdit: (q) => openModal('edit', q),
            onDelete: handleDeleteClick,
            onDuplicate: handleDuplicate,
            onClick: (q) => openModal('view', q),
          }}
        />
      </ContentManager>
      
      {loading && questions.length > 0 && (
        <div className="text-center py-6 col-span-full">
            <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
        </div>
      )}
      {!loading && !hasMore && questions.length > 0 && (
        <div className="text-center py-6 col-span-full">
          <p className="text-gray-500">You've reached the end of the list.</p>
        </div>
      )}

      {isModalOpen && (
        <QuestionModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveQuestion}
          question={selectedQuestion}
          mode={modalMode}
          availableQuizzes={quizOptions.filter(q => q.value !== 'all')}
          availableLessons={lessons}
          isLoading={creating || updating}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Question"
          message={`Are you sure you want to delete "${questionToDelete?.title || ''}"? This action cannot be undone.`}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default QuestionsManager;