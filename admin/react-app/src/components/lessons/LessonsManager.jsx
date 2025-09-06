import React, { useState, useCallback, useMemo } from 'react';
import { 
  PlayCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Users,
  Trophy,
  Target,
  BarChart3,
  TrendingUp,
  Zap,
  FileText,
  Video,
  Lock,
  Unlock,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';

// FIXED: Import the updated hooks with debouncing
import { useLessons } from '../hooks/useLessons.js';
import { useCourses } from '../hooks/useCourses.js';

// Import debounce utilities
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import LessonCard from './LessonCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const LessonsManager = () => {
  // --- LOCAL STATE ---
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    // This will automatically trigger the debounced fetch in useLessons
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
      type: 'all',
      contentType: 'all'
    },
    async (newFilters) => {
      // This will automatically trigger the debounced fetch in useLessons
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
    createLesson,
    deleteLesson,
    duplicateLesson,
    creating,
    refreshLessons
  } = useLessons({
    // Pass current filter values
    search: searchValue,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    type: filters.type !== 'all' ? filters.type : null,
    contentType: filters.contentType !== 'all' ? filters.contentType : null,
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

  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
    updateFilter('type', type);
  }, [updateFilter]);

  const handleContentTypeChange = useCallback((contentType) => {
    setSelectedContentType(contentType);
    updateFilter('contentType', contentType);
  }, [updateFilter]);

  // No more direct search handling - use the debounced version
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCreateLesson = useCallback(async (lessonData) => {
    try {
      const newLesson = await createLesson(lessonData);
      setShowCreateModal(false);
      return newLesson;
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }
  }, [createLesson]);

  const handleDeleteClick = useCallback((lesson) => {
    setLessonToDelete(lesson);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!lessonToDelete) return;
    
    try {
      await deleteLesson(lessonToDelete.id);
      setShowDeleteModal(false);
      setLessonToDelete(null);
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  }, [lessonToDelete, deleteLesson]);

  const handleDuplicate = useCallback(async (lesson) => {
    try {
      await duplicateLesson(lesson.id);
    } catch (error) {
      console.error('Error duplicating lesson:', error);
    }
  }, [duplicateLesson]);

  const handleLessonClick = useCallback((lesson) => {
    console.log('Navigate to lesson details:', lesson.id);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshLessons();
  }, [refreshLessons]);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalLessons = computed.totalLessons || 0;
    const averageDuration = computed.averageDuration || 0;
    const totalDuration = computed.totalDuration || 0;
    const lessonsWithVideo = computed.lessonsWithVideo || 0;
    const freeLessons = computed.freeLessons || 0;
    const premiumLessons = computed.premiumLessons || 0;

    return [
      {
        label: 'Total Lessons',
        value: totalLessons,
        icon: PlayCircle,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Avg. Duration',
        value: averageDuration > 0 ? `${averageDuration}min` : 'N/A',
        icon: Clock,
        iconColor: 'text-green-500'
      },
      {
        label: 'Total Duration',
        value: totalDuration > 0 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m` : 'N/A',
        icon: BarChart3,
        iconColor: 'text-purple-500'
      },
      {
        label: 'Video Lessons',
        value: lessonsWithVideo,
        icon: Video,
        iconColor: 'text-red-500'
      },
      {
        label: 'Free Lessons',
        value: freeLessons,
        icon: Unlock,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Premium Lessons',
        value: premiumLessons,
        icon: Lock,
        iconColor: 'text-yellow-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    ...courses.map(course => ({
      value: course.id.toString(),
      label: course.title?.rendered || course.title || `Course ${course.id}`
    }))
  ], [courses]);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'video', label: 'Video' },
    { value: 'text', label: 'Text' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'live', label: 'Live Session' }
  ];

  const contentTypeOptions = [
    { value: 'all', label: 'All Access Types' },
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lesson Management</h1>
            <p className="text-gray-600 mt-1">Create and manage your lessons</p>
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
              {creating ? 'Creating...' : 'Create Lesson'}
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

          {/* Content Type Filter */}
          <select
            value={selectedContentType}
            onChange={(e) => handleContentTypeChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {contentTypeOptions.map(option => (
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
        items={lessons}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onEdit={handleLessonClick}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleLessonClick}
          />
        )}
        emptyState={{
          icon: PlayCircle,
          title: 'No lessons found',
          description: 'Get started by creating your first lesson.',
          actionLabel: 'Create Lesson',
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
                  Create New Lesson
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Lesson creation form would go here...
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
      {showDeleteModal && lessonToDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Lesson"
          message={`Are you sure you want to delete "${lessonToDelete.title?.rendered || lessonToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Lesson"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default LessonsManager;