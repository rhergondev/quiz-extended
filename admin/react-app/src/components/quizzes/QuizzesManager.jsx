// admin/react-app/src/components/quizzes/QuizzesManager.jsx

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { BookOpen, Clock, Target, Users, TrendingUp, Award } from 'lucide-react';

import { useQuizzes } from '../hooks/useQuizzes.js';
import { useCourses } from '../hooks/useCourses.js'; // Si tienes este hook

import ContentManager from '../common/ContentManager.jsx';
import QuizCard from './QuizCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';
import QuizModal from './QuizModal.jsx';

const QuizzesManager = () => {
  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState('cards');
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);

  // --- FILTERS ---
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    difficulty: 'all',
    category: 'all',
    quizType: 'all'
  });

  // Función para actualizar cualquier filtro
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Función para limpiar los filtros
  const resetFilters = () => {
    setFilters({
      search: '',
      courseId: 'all',
      difficulty: 'all',
      category: 'all',
      quizType: 'all'
    });
  };

  // --- DATA FETCHING HOOKS ---
  const { 
    quizzes, 
    loading, 
    error, 
    pagination, 
    creating, 
    updating,
    createQuiz, 
    updateQuiz, 
    deleteQuiz, 
    duplicateQuiz, 
    fetchQuizzes 
  } = useQuizzes({
    search: filters.search,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
    category: filters.category !== 'all' ? filters.category : null,
    quizType: filters.quizType !== 'all' ? filters.quizType : null,
    autoFetch: true,
  });

  // Obtener cursos (puedes crear este hook o usar datos estáticos)
  // const { courses } = useCourses({ autoFetch: true });
  
  // Por ahora, usamos opciones estáticas
  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    { value: '1', label: 'Course 1' },
    { value: '2', label: 'Course 2' },
  ], []);

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const hasMore = pagination.hasMore;
  
  const lastQuizElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchQuizzes(false); // false = no reset, continuar cargando
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchQuizzes]);

  // --- MODAL HANDLERS ---
  const openModal = (mode, quiz = null) => {
    console.log('🔵 Opening modal:', mode, quiz);
    setModalMode(mode);
    setSelectedQuiz(quiz);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log('🔴 Closing modal');
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedQuiz(null);
    }, 300);
  };

  const handleSaveQuiz = async (quizData, nextAction) => {
    console.log('💾 Saving quiz:', quizData, 'Next action:', nextAction);
    try {
      if (modalMode === 'edit') {
        await updateQuiz(selectedQuiz.id, quizData);
      } else {
        await createQuiz(quizData);
      }
      if (nextAction === 'close') {
        closeModal();
      }
    } catch (err) {
      console.error("Failed to save quiz:", err);
      throw err;
    }
  };

  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;
    await deleteQuiz(quizToDelete.id);
    setShowDeleteModal(false);
    setQuizToDelete(null);
  };

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalQuestions = quizzes.reduce((sum, quiz) => {
      const questionCount = quiz.meta?._quiz_question_ids?.length || 0;
      return sum + questionCount;
    }, 0);

    const averageQuestions = quizzes.length > 0 
      ? Math.round(totalQuestions / quizzes.length) 
      : 0;

    return [
      { 
        label: 'Total Quizzes', 
        value: pagination.total || 0, 
        icon: BookOpen, 
        iconColor: 'text-blue-500' 
      },
      { 
        label: 'Total Questions', 
        value: totalQuestions, 
        icon: Target, 
        iconColor: 'text-green-500' 
      },
      { 
        label: 'Avg. Questions', 
        value: averageQuestions, 
        icon: TrendingUp, 
        iconColor: 'text-purple-500' 
      },
      { 
        label: 'Active Students', 
        value: Math.floor(Math.random() * 500) + 100, 
        icon: Users, 
        iconColor: 'text-indigo-500' 
      },
      { 
        label: 'Avg. Pass Rate', 
        value: `${Math.floor(Math.random() * 30) + 65}%`, 
        icon: Award, 
        iconColor: 'text-yellow-500' 
      },
      { 
        label: 'Avg. Time Limit', 
        value: `${Math.floor(Math.random() * 40) + 30} min`, 
        icon: Clock, 
        iconColor: 'text-red-500' 
      },
    ];
  }, [quizzes, pagination.total]);

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'practice', label: 'Practice' }
  ];

  const quizTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'practice', label: 'Practice' },
    { value: 'exam', label: 'Exam' },
    { value: 'survey', label: 'Survey' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize all quizzes for your courses.</p>
          </div>
          <div className="flex items-center space-x-3">
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span>Updating...</span>
              </div>
            )}
            <button 
              onClick={() => fetchQuizzes(true)} 
              disabled={loading} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Refresh
            </button>
            <button 
              onClick={() => {
                console.log('🟢 Create button clicked');
                openModal('create');
              }}
              disabled={creating} 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.iconColor}`}>
                    <Icon className="h-6 w-6" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input 
            type="text" 
            placeholder="Search quizzes..." 
            value={filters.search} 
            onChange={e => updateFilter('search', e.target.value)} 
            className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 md:col-span-2 lg:col-span-1" 
          />
          <select 
            value={filters.courseId} 
            onChange={e => updateFilter('courseId', e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {courseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select 
            value={filters.difficulty} 
            onChange={e => updateFilter('difficulty', e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {difficultyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select 
            value={filters.category} 
            onChange={e => updateFilter('category', e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select 
            value={filters.quizType} 
            onChange={e => updateFilter('quizType', e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {quizTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={resetFilters} 
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Content Manager with Infinite Scroll */}
      <ContentManager
        title="Quizzes" // Cambié a plural para que sea más claro
        description="Manage and organize all your quizzes"
        createButtonText="Create Quiz"
        onCreateClick={() => {
          console.log('🟡 ContentManager Create button clicked');
          openModal('create');
        }}
        items={quizzes}
        loading={loading && quizzes.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCreateButton={true} // Asegúrate de que esto esté en true
        showItemCount={true}
        showViewToggle={true}
        emptyState={{ 
          icon: BookOpen, 
          title: 'No quizzes found',
          description: 'Create your first quiz to get started',
          actionText: 'Create Quiz',
          onAction: () => {
            console.log('🟡 EmptyState Create button clicked');
            openModal('create');
          }
        }}
      >
        {quizzes.map((quiz, index) => {
          // Ref para el último elemento (infinite scroll)
          if (index === quizzes.length - 1) {
            return (
              <div key={quiz.id} ref={lastQuizElementRef}>
                <QuizCard
                  quiz={quiz}
                  onEdit={() => openModal('edit', quiz)}
                  onDelete={() => handleDeleteClick(quiz)}
                  onDuplicate={() => duplicateQuiz(quiz.id)}
                  onClick={() => openModal('view', quiz)}
                />
              </div>
            );
          }
          
          return (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onEdit={() => openModal('edit', quiz)}
              onDelete={() => handleDeleteClick(quiz)}
              onDuplicate={() => duplicateQuiz(quiz.id)}
              onClick={() => openModal('view', quiz)}
            />
          );
        })}
        
        {/* Loading and End State */}
        <div className="text-center py-6 col-span-full">
          {loading && quizzes.length > 0 && (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          {!hasMore && !loading && quizzes.length > 0 && (
            <p className="text-gray-500">You've reached the end of the list.</p>
          )}
        </div>
      </ContentManager>

      {/* Quiz Modal */}
      {isModalOpen && (
        <QuizModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveQuiz}
          quiz={selectedQuiz}
          mode={modalMode}
          availableCourses={courseOptions.filter(c => c.value !== 'all')}
          availableCategories={categoryOptions.filter(c => c.value !== 'all')}
          isLoading={creating || updating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Quiz"
          message={`Are you sure you want to delete "${quizToDelete?.title?.rendered || ''}"? This can't be undone.`}
        />
      )}
    </div>
  );
};

export default QuizzesManager;