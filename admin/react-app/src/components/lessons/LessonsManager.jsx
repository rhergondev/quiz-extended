import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  RefreshCw,
  BookOpen,
  Video,
  FileText,
  Award,
  Clock,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import useLessons from '../hooks/useLessons.js';
import { useCourses } from '../hooks/useCourses.js';
import LessonsList from './LessonsList.jsx';
import LessonsCreateModal from './lessonsCreateModal.jsx';
import BatchActions from '../common/batchActions.jsx';

const LessonManager = ({ 
  showCourseSelection = true,
  title = "Lessons",
  courseId = null,
  maxHeight = "calc(100vh - 200px)"
}) => {
  // State for UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Hooks
  const { 
    courses,
    isLoading: coursesLoading 
  } = useCourses();

  const { 
    lessons,
    loading,
    creating,
    error,
    pagination,
    hasMore,
    filters,
    computed,
    createLesson,
    deleteLesson,
    duplicateLesson,
    refreshLessons,
    loadMoreLessons,
    setSearch,
    setStatusFilter,
    setLessonTypeFilter,
    setContentTypeFilter,
    resetFilters
  } = useLessons({
    courseId: selectedCourseId,
    autoFetch: true,
    initialFilters: {
      search: '',
      status: 'publish,draft,private'
    }
  });

  // Update selected course when courseId prop changes
  useEffect(() => {
    if (courseId && courseId !== selectedCourseId) {
      setSelectedCourseId(courseId);
    }
  }, [courseId, selectedCourseId]);

  // Handle lesson creation
  const handleCreateLesson = async (lessonData) => {
    try {
      await createLesson(lessonData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }
  };

  // Handle lesson deletion
  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        await deleteLesson(lessonId);
      } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('Error deleting lesson. Please try again.');
      }
    }
  };

  // Handle lesson duplication
  const handleDuplicateLesson = async (lessonId) => {
    try {
      await duplicateLesson(lessonId);
    } catch (error) {
      console.error('Error duplicating lesson:', error);
      alert('Error duplicating lesson. Please try again.');
    }
  };

  // Handle course selection change
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId ? parseInt(courseId) : null);
    setSelectedRows([]); // Clear selection when changing course
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // Handle filter changes
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleLessonTypeFilterChange = (e) => {
    setLessonTypeFilter(e.target.value);
  };

  const handleContentTypeFilterChange = (e) => {
    setContentTypeFilter(e.target.value);
  };

  // Handle batch action completion
  const handleBatchActionComplete = () => {
    setSelectedRows([]);
    refreshLessons();
  };

  // Get selected course info
  const selectedCourse = selectedCourseId 
    ? courses.find(course => course.id === selectedCourseId)
    : null;

  // Filter courses to show only those with valid titles
  const validCourses = courses.filter(course => 
    course.title && (course.title.rendered || course.title)
  ).map(course => ({
    ...course,
    title: course.title.rendered || course.title
  }));

  return (
    <div className="lesson-manager">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCourse 
                    ? `Managing lessons for "${selectedCourse.title}"`
                    : 'Manage your lessons across all courses'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => refreshLessons()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lesson
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Lessons
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {computed.totalLessons}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Eye className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Published
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {computed.publishedLessons}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <EyeOff className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Drafts
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {computed.draftLessons}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Award className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Premium
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {computed.premiumLessons}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Duration
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {Math.round(computed.totalDuration / 60)}h
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Video className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Videos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {computed.lessonsByType?.video || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="bg-white shadow rounded-lg border border-gray-200 mb-6">
          <div className="p-6">
            {/* Course Selection */}
            {showCourseSelection && (
              <div className="mb-4">
                <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  id="course-select"
                  value={selectedCourseId || ''}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={coursesLoading}
                >
                  <option value="">All Courses</option>
                  {validCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search lessons..."
                    value={filters.search}
                    onChange={handleSearchChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>

                {/* Batch Actions */}
                {selectedRows.length > 0 && (
                  <BatchActions
                    selectedRows={selectedRows}
                    onActionComplete={handleBatchActionComplete}
                    onActionStart={() => {}}
                    type="lessons"
                  />
                )}
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status-filter"
                      value={filters.status}
                      onChange={handleStatusFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="publish,draft,private">All Status</option>
                      <option value="publish">Published Only</option>
                      <option value="draft">Drafts Only</option>
                      <option value="private">Private Only</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Type
                    </label>
                    <select
                      id="type-filter"
                      value={filters.lessonType}
                      onChange={handleLessonTypeFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Types</option>
                      <option value="video">Video</option>
                      <option value="text">Text</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                      <option value="live">Live Session</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="content-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <select
                      id="content-filter"
                      value={filters.contentType}
                      onChange={handleContentTypeFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Content</option>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading lessons
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lessons List */}
        <div className="bg-white shadow rounded-lg border border-gray-200">
          <LessonsList
            lessons={lessons}
            isLoading={loading}
            onEdit={(lesson) => {
              // TODO: Implement lesson editing
              console.log('Edit lesson:', lesson);
            }}
            onDelete={handleDeleteLesson}
            onDuplicate={handleDuplicateLesson}
            showCourseColumn={!selectedCourseId}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onLoadMore={hasMore ? loadMoreLessons : null}
          />
        </div>

        {/* Pagination Info */}
        {lessons.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing {lessons.length} of {pagination.total} lessons
            </div>
            {hasMore && (
              <button
                onClick={loadMoreLessons}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
              >
                Load more lessons
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Lesson Modal */}
      <LessonsCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLessonCreated={handleCreateLesson}
        courses={validCourses}
        selectedCourseId={selectedCourseId}
        isCreating={creating}
      />
    </div>
  );
};

export default LessonManager;