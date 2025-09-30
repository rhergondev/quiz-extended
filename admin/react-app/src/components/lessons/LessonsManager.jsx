import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Play, 
  FileText, 
  HelpCircle,
  Users,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw
} from 'lucide-react';

import { useLessons } from '../hooks/useLessons';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

import ContentManager from '../common/ContentManager';
import LessonCard from './LessonCard';
import LessonModal from './LessonModal';
import DeleteModal from '../common/DeleteModal';

const LessonsManager = () => {
  // --- LOCAL STATE ---
  const [viewMode, setViewMode] = useState('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    console.log('🔍 Lesson search triggered:', searchTerm);
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
      lessonType: 'all',
      status: 'all',
      difficulty: 'all'
    },
    async (newFilters) => {
      console.log('🔧 Lesson filters changed:', newFilters);
    },
    300
  );

  // --- HOOKS WITH PROPER DEBOUNCING ---
  const { 
    lessons, 
    loading, 
    error, 
    pagination,
    computed,
    creating, 
    updating,
    deleting,
    createLesson, 
    updateLesson, 
    deleteLesson, 
    duplicateLesson, 
    fetchLessons
  } = useLessons({
    search: searchValue,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    lessonType: filters.lessonType !== 'all' ? filters.lessonType : null,
    status: filters.status !== 'all' ? filters.status : null,
    autoFetch: true,
    debounceMs: 500
  });

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const hasMore = pagination.hasMore;
  
  const lastLessonElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log('📄 Loading more lessons...');
        fetchLessons(false);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchLessons]);

  // --- EVENT HANDLERS ---
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCourseChange = useCallback((courseId) => {
    updateFilter('courseId', courseId);
  }, [updateFilter]);

  const handleLessonTypeChange = useCallback((lessonType) => {
    updateFilter('lessonType', lessonType);
  }, [updateFilter]);

  const handleStatusChange = useCallback((status) => {
    updateFilter('status', status);
  }, [updateFilter]);

  const handleRefresh = useCallback(() => {
    fetchLessons(true);
  }, [fetchLessons]);

  // --- MODAL HANDLERS ---
  const openModal = (mode, lesson = null) => {
    console.log('🔵 Opening modal:', mode, lesson);
    setModalMode(mode);
    setSelectedLesson(lesson);
    setIsModalOpen(true);
    setShowCreateModal(mode === 'create');
  };

  const closeModal = () => {
    console.log('🔴 Closing modal');
    setIsModalOpen(false);
    setShowCreateModal(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedLesson(null);
    }, 300);
  };

  const handleSaveLesson = async (lessonData, nextAction) => {
    try {
      console.log('💾 Saving lesson:', lessonData, 'Next action:', nextAction);
      
      let result;
      if (modalMode === 'create') {
        result = await createLesson(lessonData);
      } else if (modalMode === 'edit') {
        result = await updateLesson(selectedLesson.id, lessonData);
      }

      console.log('✅ Lesson saved successfully:', result);

      // Handle next action
      if (nextAction === 'close') {
        closeModal();
      } else if (nextAction === 'create') {
        setSelectedLesson(null);
        setModalMode('create');
      } else if (nextAction === 'edit' && result?.id) {
        setSelectedLesson(result);
        setModalMode('edit');
      }

      return result;

    } catch (error) {
      console.error('❌ Error saving lesson:', error);
      throw error;
    }
  };

  const handleDeleteClick = useCallback((lesson) => {
    console.log('🗑️ Delete clicked for lesson:', lesson);
    setLessonToDelete(lesson);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!lessonToDelete) return;

    try {
      console.log('🗑️ Confirming delete for lesson:', lessonToDelete.id);
      await deleteLesson(lessonToDelete.id);
      setShowDeleteModal(false);
      setLessonToDelete(null);
      console.log('✅ Lesson deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting lesson:', error);
    }
  };

  const handleDuplicate = useCallback(async (lesson) => {
    try {
      await duplicateLesson(lesson.id);
    } catch (error) {
      console.error('Error duplicating lesson:', error);
    }
  }, [duplicateLesson]);

  const handleLessonClick = useCallback((lesson) => {
    openModal('view', lesson);
  }, []);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    return [
      {
        label: 'Total Lessons',
        value: computed.totalLessons || 0,
        icon: BookOpen,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Published',
        value: computed.publishedLessons || 0,
        icon: CheckCircle,
        iconColor: 'text-green-500'
      },
      {
        label: 'Draft',
        value: computed.draftLessons || 0,
        icon: AlertCircle,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'Total Steps',
        value: computed.totalSteps || 0,
        icon: Target,
        iconColor: 'text-purple-500'
      },
      {
        label: 'Avg. Steps/Lesson',
        value: computed.averageStepsPerLesson || 0,
        icon: TrendingUp,
        iconColor: 'text-indigo-500'
      },
      {
        label: 'Avg. Duration',
        value: `${computed.averageDuration || 0} min`,
        icon: Clock,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    { value: '1', label: 'JavaScript Fundamentals' },
    { value: '2', label: 'React Development' },
    { value: '3', label: 'Node.js Backend' },
    { value: '4', label: 'WordPress Development' },
  ], []);

  const lessonTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'video', label: 'Video' },
    { value: 'text', label: 'Text' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'interactive', label: 'Interactive' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'publish', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'private', label: 'Private' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lesson Management</h1>
            <p className="text-gray-600 mt-1">Create and manage interactive lessons with multiple content types.</p>
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
              <RefreshCw className="h-4 w-4 mr-2 inline" />
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
              {creating ? 'Creating...' : 'Create Lesson'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input with Debouncing */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search lessons..."
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
            value={filters.courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {courseOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Lesson Type Filter */}
          <select
            value={filters.lessonType}
            onChange={(e) => handleLessonTypeChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {lessonTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map(option => (
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

      {/* Content Manager with Infinite Scroll */}
      <ContentManager
        title="Lessons"
        description="Manage and organize all your lessons"
        createButtonText="Create Lesson"
        onCreateClick={() => {
          console.log('🟡 ContentManager Create button clicked');
          openModal('create');
        }}
        items={lessons}
        loading={loading && lessons.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCreateButton={true}
        showItemCount={true}
        showViewToggle={true}
        emptyState={{ 
          icon: BookOpen, 
          title: 'No lessons found',
          description: 'Create your first lesson to get started',
          actionText: 'Create Lesson',
          onAction: () => {
            console.log('🟡 EmptyState Create button clicked');
            openModal('create');
          }
        }}
      >
          {lessons.map((lesson, index) => {
            // Ref para el último elemento (infinite scroll)
            if (index === lessons.length - 1) {
              return (
                <div key={lesson.id} ref={lastLessonElementRef}>
                  <LessonCard
                    lesson={lesson}
                    onEdit={() => openModal('edit', lesson)}
                    onDelete={() => handleDeleteClick(lesson)}
                    onDuplicate={() => handleDuplicate(lesson)}
                    onClick={() => handleLessonClick(lesson)}
                  />
                </div>
              );
            }
            
            return (
              <div key={lesson.id}> {/* 🔧 AGREGADO: Wrapper div como en QuizCard */}
                <LessonCard
                  lesson={lesson}
                  onEdit={() => openModal('edit', lesson)}
                  onDelete={() => handleDeleteClick(lesson)}
                  onDuplicate={() => handleDuplicate(lesson)}
                  onClick={() => handleLessonClick(lesson)}
                />
              </div>
            );
          })}

          {/* 🔧 CORREGIDO: Loading state DENTRO del grid con col-span-full */}
          {loading && lessons.length > 0 && (
            <div className="flex justify-center py-8 col-span-full">
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                <span>Loading more lessons...</span>
              </div>
            </div>
          )}

          {/* 🔧 CORREGIDO: End state DENTRO del grid con col-span-full */}
          {!loading && !hasMore && lessons.length > 0 && (
            <div className="text-center py-6 col-span-full">
              <p className="text-gray-500">You've reached the end of the list.</p>
            </div>
          )}
      </ContentManager>

      {/* Lesson Modal */}
      {isModalOpen && (
        <LessonModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveLesson}
          lesson={selectedLesson}
          mode={modalMode}
          availableCourses={courseOptions.filter(c => c.value !== 'all')}
          isLoading={creating || updating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Lesson"
          message={`Are you sure you want to delete "${lessonToDelete?.title?.rendered || lessonToDelete?.title}"? This action cannot be undone.`}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default LessonsManager;