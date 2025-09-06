import React, { useState, useMemo, useCallback } from 'react';
import { 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Target,
  BarChart3,
  Zap,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  Search,
  Plus
} from 'lucide-react';

// Hook imports
import { useQuestions } from '../components/hooks/useQuestions.js';
import { useQuizzes } from '../components/hooks/useQuizzes.js';

// Component imports
import QuestionCard from '../components/questions/QuestionCard.jsx';
import ContentManager from '../components/common/ContentManager.jsx';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal.jsx';

const QuestionsPage = () => {
  // --- STATE ---
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- HOOKS ---
  const { 
    questions, 
    loading, 
    error, 
    pagination,
    computed,
    createQuestion,
    deleteQuestion,
    duplicateQuestion,
    creating 
  } = useQuestions({
    search: searchTerm,
    quizId: selectedQuiz !== 'all' ? selectedQuiz : null,
    type: selectedType !== 'all' ? selectedType : null,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : null,
    category: selectedCategory !== 'all' ? selectedCategory : null,
    autoFetch: true
  });

  const { quizzes, loading: quizzesLoading } = useQuizzes({
    status: 'publish,draft',
    perPage: 100
  });

  // --- COMPUTED VALUES ---
  const validQuizzes = useMemo(() => {
    return quizzes.filter(quiz => 
      quiz.title && (quiz.title.rendered || quiz.title)
    ).map(quiz => ({
      ...quiz,
      title: quiz.title.rendered || quiz.title
    }));
  }, [quizzes]);

  const questionTypes = useMemo(() => [
    'all',
    'multiple_choice',
    'true_false',
    'short_answer',
    'essay',
    'fill_blank'
  ], []);

  const difficulties = useMemo(() => [
    'all',
    'easy',
    'medium', 
    'hard'
  ], []);

  const categories = useMemo(() => [
    'all',
    'general',
    'technical',
    'behavioral',
    'analytical',
    'logical'
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
    // Calcular estadísticas basadas en las preguntas actuales
    const typeDistribution = questions.reduce((acc, question) => {
      const type = question.meta?._question_type || 'multiple_choice';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const totalPoints = questions.reduce((sum, question) => {
      return sum + parseInt(question.meta?._points || '1');
    }, 0);

    const averagePoints = questions.length > 0 
      ? Math.round((totalPoints / questions.length) * 10) / 10
      : 0;

    // Simular estadísticas de rendimiento
    const averageSuccessRate = Math.floor(Math.random() * 40) + 60; // 60-100%

    return [
      {
        label: 'Total Questions',
        value: computed.totalQuestions || questions.length,
        icon: HelpCircle,
        iconColor: 'text-gray-400'
      },
      {
        label: 'Published',
        value: computed.publishedQuestions || questions.filter(q => q.status === 'publish').length,
        icon: Eye,
        iconColor: 'text-green-400'
      },
      {
        label: 'Draft',
        value: computed.draftQuestions || questions.filter(q => q.status === 'draft').length,
        icon: EyeOff,
        iconColor: 'text-yellow-400'
      },
      {
        label: 'Avg. Points',
        value: averagePoints > 0 ? averagePoints : '--',
        icon: Zap,
        iconColor: 'text-purple-400'
      },
      {
        label: 'Success Rate',
        value: `${averageSuccessRate}%`,
        icon: Target,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Multiple Choice',
        value: typeDistribution.multiple_choice || 0,
        icon: CheckCircle,
        iconColor: 'text-green-500'
      },
      {
        label: 'Performance',
        value: computed.performanceScore || '--',
        icon: TrendingUp,
        iconColor: 'text-indigo-400'
      }
    ];
  }, [questions, computed]);

  // --- EVENT HANDLERS ---
  const handleQuizChange = useCallback((quizId) => {
    setSelectedQuiz(quizId);
  }, []);

  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
  }, []);

  const handleDifficultyChange = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

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

  // --- HELPER FUNCTIONS ---
  const getTypeLabel = (type) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'short_answer':
        return 'Short Answer';
      case 'essay':
        return 'Essay';
      case 'fill_blank':
        return 'Fill in Blank';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
    }
  };

  // --- FILTER COMPONENT ---
  const renderFilters = () => (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Questions
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by question text..."
              className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Quiz Filter */}
        <div className="relative">
          <label htmlFor="quiz-select" className="block text-sm font-medium text-gray-700 mb-1">
            Quiz
          </label>
          <div className="relative">
            <select
              id="quiz-select"
              value={selectedQuiz}
              onChange={(e) => handleQuizChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
              disabled={quizzesLoading}
            >
              <option value="all">All Quizzes</option>
              {validQuizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Type Filter */}
        <div className="relative">
          <label htmlFor="type-select" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="relative">
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="all">All Types</option>
              {questionTypes.slice(1).map((type) => (
                <option key={type} value={type}>
                  {getTypeLabel(type)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="relative">
          <label htmlFor="difficulty-select" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <div className="relative">
            <select
              id="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="all">All Levels</option>
              {difficulties.slice(1).map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="all">All Categories</option>
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedQuiz !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all' || searchTerm) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedQuiz !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {validQuizzes.find(q => q.id.toString() === selectedQuiz)?.title || 'Quiz'}
              <button
                onClick={() => setSelectedQuiz('all')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedType !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {getTypeLabel(selectedType)}
              <button
                onClick={() => setSelectedType('all')}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedDifficulty !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {selectedDifficulty}
              <button
                onClick={() => setSelectedDifficulty('all')}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {selectedCategory}
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );

  // --- EMPTY STATE CONFIG ---
  const emptyStateConfig = {
    icon: HelpCircle,
    title: "No questions found",
    description: (selectedQuiz !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all' || searchTerm)
      ? "No questions match your current filters."
      : "You haven't created any questions yet.",
    actionText: "Create First Question"
  };

  // --- RENDER ---
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading questions</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ContentManager
        title="Questions Manager"
        description="Manage and organize your quiz questions"
        createButtonText="Create Question"
        onCreateClick={() => setShowCreateModal(true)}
        statistics={statistics}
        items={questions}
        loading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filtersComponent={renderFilters()}
        emptyState={emptyStateConfig}
        showStatistics={true}
        showViewToggle={true}
        showCreateButton={true}
        showItemCount={true}
      >
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            viewMode={viewMode}
            onEdit={(question) => console.log('Edit question:', question)}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleQuestionClick}
            quizzes={validQuizzes}
            showQuiz={true}
            showStats={true}
          />
        ))}
      </ContentManager>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setQuestionToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Question"
        message={`Are you sure you want to delete this question? This action cannot be undone and will affect any quizzes that include this question.`}
      />
    </div>
  );
};

export default QuestionsPage;