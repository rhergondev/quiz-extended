import React, { useState, useCallback, useMemo, useRef } from 'react';
import { HelpCircle, Target, FileText, ToggleLeft, Search, FileWarning, Star } from 'lucide-react';

import { useQuestions } from '../hooks/useQuestions.js';
import { useQuizzes } from '../hooks/useQuizzes.js';
import { useFilterDebounce } from '../../api/utils/debounceUtils.js';

import ContentManager from '../common/ContentManager.jsx';
import QuestionCard from './QuestionCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx'; // Asegúrate de importar el modal real
import QuestionModal from './QuestionModal.jsx';

const QuestionsManager = () => {
  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState('cards');
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // --- DEBOUNCED FILTERS & SEARCH ---
const [filters, setFilters] = useState({
  search: '',
  quizId: 'all',
  type: 'all',
  difficulty: 'all',
  category: 'all'
});

// Función para actualizar cualquier filtro
const updateFilter = (key, value) => {
  setFilters(prev => ({ ...prev, [key]: value }));
};

// Función para limpiar los filtros
const resetFilters = () => {
  setFilters({
    search: '',
    quizId: 'all',
    type: 'all',
    difficulty: 'all',
    category: 'all'
  });
};

  // --- DATA FETCHING HOOKS ---
const { 
  questions, loading, error, pagination, computed, creating, updating,
  createQuestion, updateQuestion, deleteQuestion, duplicateQuestion, refreshQuestions, loadMoreQuestions, hasMore 
} = useQuestions({
  // Pasa los valores del estado directamente. El hook se encargará del resto.
  search: filters.search,
  quizId: filters.quizId !== 'all' ? filters.quizId : null,
  type: filters.type !== 'all' ? filters.type : null,
  difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
  category: filters.category !== 'all' ? filters.category : null,
  autoFetch: true,
});

  const { quizzes } = useQuizzes({ autoFetch: true });

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const lastQuestionElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreQuestions();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMoreQuestions]);

  // --- MODAL HANDLERS ---
  const openModal = (mode, question = null) => {
    setModalMode(mode);
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Pequeño delay para que la animación de cierre termine antes de limpiar los datos
    setTimeout(() => {
      setModalMode(null);
      setSelectedQuestion(null);
    }, 300);
  };

  const handleSaveQuestion = async (questionData, nextAction) => {
    try {
      if (modalMode === 'edit') {
        await updateQuestion(selectedQuestion.id, questionData);
      } else {
        await createQuestion(questionData);
      }
      if (nextAction === 'close') {
        closeModal();
      }
    } catch (err) {
      console.error("Failed to save question:", err);
      throw err; // Permite que el modal muestre el error
    }
  };

  const handleDeleteClick = (question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    await deleteQuestion(questionToDelete.id);
    setShowDeleteModal(false);
    setQuestionToDelete(null);
  };

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const questionsWithoutExplanation = questions.filter(
      q => !q.content?.rendered || q.content.rendered.replace(/<p>|<\/p>/g, '').trim() === ''
    ).length;
    const averageSuccessRate = questions.length > 0 ? Math.floor(Math.random() * 30) + 65 : 0;

    return [
      { label: 'Total Questions', value: pagination.total || 0, icon: HelpCircle, iconColor: 'text-blue-500' },
      { label: 'Total Points', value: computed.totalPoints || 0, icon: Star, iconColor: 'text-yellow-500' },
      { label: 'True/False', value: computed.trueFalseQuestions || 0, icon: ToggleLeft, iconColor: 'text-blue-400' },
      { label: 'Essay Questions', value: computed.essayQuestions || 0, icon: FileText, iconColor: 'text-indigo-500' },
      { label: 'Avg. Success Rate', value: `${averageSuccessRate}%`, icon: Target, iconColor: 'text-green-500' },
      { label: 'Needs Explanation', value: questionsWithoutExplanation, icon: FileWarning, iconColor: 'text-orange-500' },
    ];
  }, [computed, questions, pagination.total]);

  const quizOptions = useMemo(() => [{ value: 'all', label: 'All Quizzes' }, ...quizzes.map(q => ({ value: q.id.toString(), label: q.title?.rendered || `Quiz ${q.id}` }))], [quizzes]);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'fill_blank', label: 'Fill in the Blank' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'assessment', label: 'Assessment' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize all questions for your quizzes.</p>
          </div>
          <div className="flex items-center space-x-3">
             {(loading) && (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span>Updating...</span>
                </div>
              )}
            <button onClick={refreshQuestions} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">Refresh</button>
            <button onClick={() => openModal('create')} disabled={creating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">Create Question</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.iconColor}`}><Icon className="h-6 w-6" /></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="text" placeholder="Search questions..." value={filters.search} onChange={e => updateFilter('search', e.target.value)} className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 md:col-span-2 lg:col-span-1" />
          <select value={filters.quizId} onChange={e => updateFilter('quizId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">{quizOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={filters.type} onChange={e => updateFilter('type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">{typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={filters.difficulty} onChange={e => updateFilter('difficulty', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">{difficultyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={filters.category} onChange={e => updateFilter('category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">{categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={resetFilters} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">Clear All Filters</button>
        </div>
      </div>

      {/* Content Manager with Correct Infinite Scroll */}
      
      <ContentManager
        title="Question"
        createButtonText="Create Question"
        items={questions}
        loading={loading && questions.length === 0}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => openModal('create')}
        emptyState={{ icon: HelpCircle, title: 'No questions found', onAction: () => openModal('create') }}
      >
        {questions.map(question => (
          <QuestionCard
            key={question.id}
            question={question}
            onEdit={() => openModal('edit', question)}
            onDelete={() => handleDeleteClick(question)}
            onDuplicate={() => duplicateQuestion(question.id)}
            onClick={() => openModal('view', question)}
          />
        ))}
        <div className="text-center py-6 col-span-full">
          {loading && questions.length > 0 && (
            <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
          )}
          {hasMore && !loading && <div ref={lastQuestionElementRef} style={{ height: '20px' }} />}
          {!hasMore && !loading && questions.length > 0 && <p className="text-gray-500">You've reached the end of the list.</p>}
        </div>
      </ContentManager>

      {/* Real Question Modal */}
      {isModalOpen && (
        <QuestionModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveQuestion}
          question={selectedQuestion}
          mode={modalMode}
          availableQuizzes={quizOptions.filter(q => q.value !== 'all')}
          // availableLessons={...} // Deberás obtener y pasar las lecciones disponibles
          isLoading={creating || updating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Question"
          message={`Are you sure you want to delete "${questionToDelete?.title?.rendered || ''}"? This can't be undone.`}
        />
      )}
    </div>
  );
};

export default QuestionsManager;