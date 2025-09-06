import React, { useState, useCallback, useMemo } from 'react';
import { 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Target,
  BarChart3,
  Zap,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  FileText,
  List,
  ToggleLeft,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';

// FIXED: Import the updated hooks with debouncing
import { useQuestions } from '../hooks/useQuestions.js';
import { useQuizzes } from '../hooks/useQuizzes.js';

// Import debounce utilities
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import QuestionCard from './QuestionCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const QuestionsManager = () => {
  // --- LOCAL STATE ---
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    // This will automatically trigger the debounced fetch in useQuestions
    console.log('🔍 Question search triggered:', searchTerm);
  }, 500);

  // --- DEBOUNCED FILTERS ---
  const {
    filters,
    isFiltering,
    updateFilter,
    resetFilters
  } = useFilterDebounce(
    {
      quizId: 'all',
      type: 'all',
      difficulty: 'all',
      category: 'all'
    },
    async (newFilters) => {
      // This will automatically trigger the debounced fetch in useQuestions
      console.log('🔧 Question filters changed:', newFilters);
    },
    300
  );

  // --- HOOKS WITH PROPER DEBOUNCING ---
  const { 
    questions, 
    loading, 
    error, 
    pagination,
    computed,
    createQuestion,
    deleteQuestion,
    duplicateQuestion,
    creating,
    refreshQuestions
  } = useQuestions({
    // Pass current filter values
    search: searchValue,
    quizId: filters.quizId !== 'all' ? filters.quizId : null,
    type: filters.type !== 'all' ? filters.type : null,
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
    category: filters.category !== 'all' ? filters.category : null,
    autoFetch: true,
    debounceMs: 500 // Configure debounce delay
  });

  const { quizzes } = useQuizzes({
    autoFetch: true,
    debounceMs: 300
  });

  // --- EVENT HANDLERS (NO MORE DIRECT API CALLS) ---
  const handleQuizChange = useCallback((quizId) => {
    setSelectedQuiz(quizId);
    updateFilter('quizId', quizId);
  }, [updateFilter]);

  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
    updateFilter('type', type);
  }, [updateFilter]);

  const handleDifficultyChange = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
    updateFilter('difficulty', difficulty);
  }, [updateFilter]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    updateFilter('category', category);
  }, [updateFilter]);

  // No more direct search handling - use the debounced version
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCreateQuestion = useCallback(async (questionData) => {
    try {
      const newQuestion = await createQuestion(questionData);
      setShowCreateModal(false);
      return newQuestion;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }, [createQuestion]);

  const handleDeleteClick = useCallback((question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!questionToDelete) return;
    
    try {
      await deleteQuestion(questionToDelete.id);
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  }, [questionToDelete, deleteQuestion]);

  const handleDuplicate = useCallback(async (question) => {
    try {
      await duplicateQuestion(question.id);
    } catch (error) {
      console.error('Error duplicating question:', error);
    }
  }, [duplicateQuestion]);

  const handleQuestionClick = useCallback((question) => {
    console.log('Navigate to question details:', question.id);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshQuestions();
  }, [refreshQuestions]);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalQuestions = computed.totalQuestions || 0;
    const averagePoints = computed.averagePoints || 1;
    const totalPoints = computed.totalPoints || 0;
    const multipleChoiceQuestions = computed.multipleChoiceQuestions || 0;
    const trueFalseQuestions = computed.trueFalseQuestions || 0;
    const essayQuestions = computed.essayQuestions || 0;

    return [
      {
        label: 'Total Questions',
        value: totalQuestions,
        icon: HelpCircle,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Avg. Points',
        value: averagePoints,
        icon: Star,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'Total Points',
        value: totalPoints,
        icon: Target,
        iconColor: 'text-green-500'
      },
      {
        label: 'Multiple Choice',
        value: multipleChoiceQuestions,
        icon: List,
        iconColor: 'text-purple-500'
      },
      {
        label: 'True/False',
        value: trueFalseQuestions,
        icon: ToggleLeft,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Essay',
        value: essayQuestions,
        icon: FileText,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const quizOptions = useMemo(() => [
    { value: 'all', label: 'All Quizzes' },
    ...quizzes.map(quiz => ({
      value: quiz.id.toString(),
      label: quiz.title?.rendered || quiz.title || `Quiz ${quiz.id}`
    }))
  ], [quizzes]);

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
    { value: 'hard', label: 'Hard' },
    { value: 'expert', label: 'Expert' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'theoretical', label: 'Theoretical' },
    { value: 'practical', label: 'Practical' },
    { value: 'assessment', label: 'Assessment' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Management</h1>
            <p className="text-gray-600 mt-1">Create and manage your questions</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Loading indicator */}
            {(loading || isSearching || isFiltering) && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                {isSearching ? 'Searching...' : isFiltering ? 'Filtering...' : 'Loading...'}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Question'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.iconColor}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Input with Debouncing */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search questions..."
              value={searchValue}
              onChange={handleSearchChangeWrapper}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="sr-only">Clear search</span>
                ×
              </button>
            )}
          </div>

          {/* Quiz Filter */}
          <select
            value={selectedQuiz}
            onChange={(e) => handleQuizChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {quizOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {difficultyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Content Manager */}
      <ContentManager
        items={questions}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onEdit={handleQuestionClick}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleQuestionClick}
          />
        )}
        emptyState={{
          icon: HelpCircle,
          title: 'No questions found',
          description: 'Get started by creating your first question.',
          actionLabel: 'Create Question',
          onAction: () => setShowCreateModal(true)
        }}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Create New Question
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Question creation form would go here...
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && questionToDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Question"
          message={`Are you sure you want to delete "${questionToDelete.title?.rendered || questionToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Question"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default QuestionsManager;