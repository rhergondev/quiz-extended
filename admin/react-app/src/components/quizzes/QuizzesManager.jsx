import React, { useState, useCallback, useMemo } from 'react';
import { 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Users,
  Trophy,
  Target,
  BarChart3,
  TrendingUp,
  Zap,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';

// FIXED: Import the updated hook with debouncing
import { useQuizzes } from '../hooks/useQuizzes.js';
import { useCourses } from '../hooks/useCourses.js';

// Import debounce utilities
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import QuizCard from './QuizCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const QuizzesManager = () => {
  // --- LOCAL STATE ---
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    // This will automatically trigger the debounced fetch in useQuizzes
    console.log('🔍 Search triggered:', searchTerm);
  }, 500);

  // --- DEBOUNCED FILTERS ---
  const {
    filters,
    isFiltering,
    updateFilter,
    resetFilters
  } = useFilterDebounce(
    {
      courseId: 'all',
      difficulty: 'all',
      category: 'all'
    },
    async (newFilters) => {
      // This will automatically trigger the debounced fetch in useQuizzes
      console.log('🔧 Filters changed:', newFilters);
    },
    300
  );

  // --- HOOKS WITH PROPER DEBOUNCING ---
  const { 
    quizzes, 
    loading, 
    error, 
    pagination,
    computed,
    createQuiz,
    deleteQuiz,
    duplicateQuiz,
    creating,
    refreshQuizzes
  } = useQuizzes({
    // Pass current filter values
    search: searchValue,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
    category: filters.category !== 'all' ? filters.category : null,
    autoFetch: true,
    debounceMs: 500 // Configure debounce delay
  });

  const { courses } = useCourses({
    autoFetch: true,
    debounceMs: 300
  });

  // --- EVENT HANDLERS (NO MORE DIRECT API CALLS) ---
  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
    updateFilter('courseId', courseId);
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

  const handleCreateQuiz = useCallback(async (quizData) => {
    try {
      const newQuiz = await createQuiz(quizData);
      setShowCreateModal(false);
      return newQuiz;
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  }, [createQuiz]);

  const handleDeleteClick = useCallback((quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!quizToDelete) return;
    
    try {
      await deleteQuiz(quizToDelete.id);
      setShowDeleteModal(false);
      setQuizToDelete(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  }, [quizToDelete, deleteQuiz]);

  const handleDuplicate = useCallback(async (quiz) => {
    try {
      await duplicateQuiz(quiz.id);
    } catch (error) {
      console.error('Error duplicating quiz:', error);
    }
  }, [duplicateQuiz]);

  const handleQuizClick = useCallback((quiz) => {
    console.log('Navigate to quiz details:', quiz.id);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshQuizzes();
  }, [refreshQuizzes]);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalQuizzes = computed.totalQuizzes || 0;
    const averageTimeLimit = computed.averageTimeLimit || 0;
    const averageQuestions = quizzes.length > 0 ? 
      Math.round(quizzes.reduce((sum, quiz) => {
        const questionIds = quiz.meta?._quiz_question_ids || [];
        return sum + (Array.isArray(questionIds) ? questionIds.length : 0);
      }, 0) / quizzes.length) : 0;

    const totalAttempts = computed.totalAttempts || 0;
    const averageScore = 75; // This would come from API
    const averagePassRate = 80; // This would come from API

    return [
      {
        label: 'Total Quizzes',
        value: totalQuizzes,
        icon: HelpCircle,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Avg. Time Limit',
        value: averageTimeLimit > 0 ? `${averageTimeLimit}min` : 'No limit',
        icon: Clock,
        iconColor: 'text-green-500'
      },
      {
        label: 'Avg. Questions',
        value: averageQuestions > 0 ? averageQuestions : '--',
        icon: BarChart3,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Total Attempts',
        value: computed.totalAttempts || totalAttempts,
        icon: Users,
        iconColor: 'text-purple-400'
      },
      {
        label: 'Avg. Score',
        value: `${averageScore}%`,
        icon: Trophy,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'Pass Rate',
        value: `${averagePassRate}%`,
        icon: TrendingUp,
        iconColor: 'text-green-500'
      }
    ];
  }, [quizzes, computed]);

  // --- FILTER OPTIONS ---
  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    ...courses.map(course => ({
      value: course.id.toString(),
      label: course.title?.rendered || course.title || `Course ${course.id}`
    }))
  ], [courses]);

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'practice', label: 'Practice' },
    { value: 'exam', label: 'Exam' },
    { value: 'homework', label: 'Homework' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
            <p className="text-gray-600 mt-1">Create and manage your quizzes</p>
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
              {creating ? 'Creating...' : 'Create Quiz'}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input with Debouncing */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search quizzes..."
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

          {/* Course Filter */}
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {courseOptions.map(option => (
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
        items={quizzes}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            onEdit={handleQuizClick}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleQuizClick}
          />
        )}
        emptyState={{
          icon: HelpCircle,
          title: 'No quizzes found',
          description: 'Get started by creating your first quiz.',
          actionLabel: 'Create Quiz',
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
                  Create New Quiz
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Quiz creation form would go here...
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
      {showDeleteModal && quizToDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Quiz"
          message={`Are you sure you want to delete "${quizToDelete.title?.rendered || quizToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Quiz"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default QuizzesManager;