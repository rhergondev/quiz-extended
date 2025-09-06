import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Hook imports
import { useQuizzes } from '../hooks/useQuizzes.js';
import { useCourses } from '../hooks/useCourses.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import QuizCard from './QuizCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';
// import QuizCreateModal from './QuizCreateModal.jsx'; // TODO: Crear este componente

const QuizzesManager = () => {
  // --- STATE ---
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- HOOKS ---
  const { 
    quizzes, 
    loading, 
    error, 
    pagination,
    computed,
    createQuiz,
    deleteQuiz,
    duplicateQuiz,
    creating 
  } = useQuizzes({
    search: searchTerm,
    courseId: selectedCourse !== 'all' ? selectedCourse : null,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : null,
    category: selectedCategory !== 'all' ? selectedCategory : null,
    autoFetch: true
  });

  const { courses, loading: coursesLoading } = useCourses({
    status: 'publish,draft',
    perPage: 100
  });

  // --- COMPUTED VALUES ---
  const validCourses = useMemo(() => {
    return courses.filter(course => 
      course.title && (course.title.rendered || course.title)
    ).map(course => ({
      ...course,
      title: course.title.rendered || course.title
    }));
  }, [courses]);

  const difficulties = useMemo(() => [
    'all',
    'easy',
    'medium', 
    'hard'
  ], []);

  const categories = useMemo(() => [
    'all',
    'assessment',
    'practice',
    'final_exam',
    'checkpoint',
    'review'
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
    // Calcular estadísticas basadas en los quizzes actuales
    const difficultyDistribution = quizzes.reduce((acc, quiz) => {
      const difficulty = quiz.meta?._difficulty_level || 'medium';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});

    const categoryDistribution = quizzes.reduce((acc, quiz) => {
      const category = quiz.meta?._quiz_category || 'assessment';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Simular estadísticas de rendimiento
    const totalQuestions = quizzes.reduce((sum) => {
      return sum + (Math.floor(Math.random() * 20) + 5); // 5-25 questions per quiz
    }, 0);

    const averageQuestions = quizzes.length > 0 
      ? Math.round(totalQuestions / quizzes.length)
      : 0;

    const totalAttempts = quizzes.reduce((sum) => sum + Math.floor(Math.random() * 100) + 10, 0);
    const averageScore = Math.floor(Math.random() * 30) + 70; // 70-100%
    const averagePassRate = Math.floor(Math.random() * 40) + 60; // 60-100%

    return [
      {
        label: 'Total Quizzes',
        value: computed.totalQuizzes || quizzes.length,
        icon: HelpCircle,
        iconColor: 'text-gray-400'
      },
      {
        label: 'Published',
        value: computed.publishedQuizzes || quizzes.filter(q => q.status === 'publish').length,
        icon: Eye,
        iconColor: 'text-green-400'
      },
      {
        label: 'Draft',
        value: computed.draftQuizzes || quizzes.filter(q => q.status === 'draft').length,
        icon: EyeOff,
        iconColor: 'text-yellow-400'
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

  // --- EVENT HANDLERS ---
  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
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
    // Navegar a la vista de detalle del quiz o abrir modal de edición
    console.log('Navigate to quiz details:', quiz.id);
  }, []);

  // --- HELPER FUNCTIONS ---
  const getCategoryLabel = (category) => {
    switch (category) {
      case 'assessment':
        return 'Assessment';
      case 'practice':
        return 'Practice';
      case 'final_exam':
        return 'Final Exam';
      case 'checkpoint':
        return 'Checkpoint';
      case 'review':
        return 'Review';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
    }
  };

  // --- FILTER COMPONENT ---
  const renderFilters = () => (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Quizzes
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, description..."
              className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Course Filter */}
        <div className="relative">
          <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <div className="relative">
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
              disabled={coursesLoading}
            >
              <option value="all">All Courses</option>
              {validCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
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
                  {getCategoryLabel(category)}
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
      {(selectedCourse !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all' || searchTerm) && (
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
          {selectedCourse !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {validCourses.find(c => c.id.toString() === selectedCourse)?.title || 'Course'}
              <button
                onClick={() => setSelectedCourse('all')}
                className="ml-1 text-green-600 hover:text-green-800"
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
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {getCategoryLabel(selectedCategory)}
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-1 text-purple-600 hover:text-purple-800"
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
    title: "No quizzes found",
    description: (selectedCourse !== 'all' || selectedDifficulty !== 'all' || selectedCategory !== 'all' || searchTerm)
      ? "No quizzes match your current filters."
      : "You haven't created any quizzes yet.",
    actionText: "Create First Quiz"
  };

  // --- RENDER ---
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading quizzes</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <ContentManager
        title="Quizzes Manager"
        description="Manage and organize your assessments and quizzes"
        createButtonText="Create Quiz"
        onCreateClick={() => setShowCreateModal(true)}
        statistics={statistics}
        items={quizzes}
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
        {quizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            viewMode={viewMode}
            onEdit={(quiz) => console.log('Edit quiz:', quiz)}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleQuizClick}
            courses={validCourses}
            showCourse={true}
            showStats={true}
          />
        ))}
      </ContentManager>

      {/* Modals */}
      {/* TODO: Crear QuizCreateModal */}
      {/* <QuizCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onQuizCreated={handleCreateQuiz}
        courses={validCourses}
        isCreating={creating}
      /> */}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setQuizToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Quiz"
        message={`Are you sure you want to delete the quiz "${quizToDelete?.title?.rendered || quizToDelete?.title || 'this quiz'}"? This action cannot be undone and will also delete all associated questions and results.`}
      />
    </>
  );
};

export default QuizzesManager;