import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Eye, 
  EyeOff, 
  Clock, 
  Video,
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  ChevronDown,
  Users
} from 'lucide-react';

// Hook imports
import { useLessons } from '../hooks/useLessons.js';
import { useCourses } from '../hooks/useCourses.js';

// Component imports
import LessonCreateModal from './LessonCreateModal.jsx';
import LessonCard from './LessonCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import EmptyState from '../common/EmptyState.jsx';

const LessonsManager = () => {
  // --- STATE ---
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'

  // --- HOOKS ---
  const { 
    lessons, 
    loading, 
    error, 
    pagination,
    computed,
    fetchLessons,
    createLesson,
    deleteLesson,
    duplicateLesson,
    creating 
  } = useLessons({
    courseId: selectedCourse !== 'all' ? selectedCourse : null,
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

  // FIX: Definir selectedCourseId
  const selectedCourseId = useMemo(() => {
    if (selectedCourse === 'all') return null;
    const numericId = parseInt(selectedCourse, 10);
    return isNaN(numericId) ? null : numericId;
  }, [selectedCourse]);

  const computedWithQuizzes = useMemo(() => {
    // Count lessons with quizzes (assuming quiz data is in lesson meta)
    const lessonsWithQuizzes = lessons.filter(lesson => 
      lesson.meta?._has_quiz === 'yes' || lesson.meta?._lesson_type === 'quiz'
    ).length;

    return {
      ...computed,
      lessonsWithQuizzes
    };
  }, [lessons, computed]);

  // --- EVENT HANDLERS ---
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    // El hook useLessons se re-ejecutará automáticamente cuando cambie courseId
  };

const handleCreateLesson = async (lessonData) => {
  try {
    console.log('Creating lesson with data:', lessonData);
    await createLesson(lessonData);
    setShowCreateModal(false);
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error; 
  }
};


  const handleDeleteClick = (lesson) => {
    setLessonToDelete(lesson);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (lessonToDelete) {
      try {
        await deleteLesson(lessonToDelete.id);
        setShowDeleteModal(false);
        setLessonToDelete(null);
        // Refresh is automatic with the hook
      } catch (error) {
        console.error('Error deleting lesson:', error);
      }
    }
  };

  const handleDuplicate = async (lesson) => {
    try {
      await duplicateLesson(lesson.id);
      // Refresh is automatic with the hook
    } catch (error) {
      console.error('Error duplicating lesson:', error);
    }
  };

  // --- RENDER ---
  if (loading && lessons.length === 0) {
    return <LoadingSpinner message="Loading lessons..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lessons Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your course lessons
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Lesson
          </button>
        </div>
      </div>

      {/* Course Selector */}
      <div className="bg-white shadow rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="course-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filter by Course:
          </label>
          <div className="relative min-w-0 flex-1 max-w-xs">
            <select
              id="course-select"
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={coursesLoading}
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title?.rendered || course.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          {selectedCourse !== 'all' && (
            <span className="text-sm text-gray-500">
              Showing lessons for selected course
            </span>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Total Lessons */}
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
                    {computedWithQuizzes.totalLessons}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Published */}
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
                    {computedWithQuizzes.publishedLessons}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Drafts */}
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
                    {computedWithQuizzes.draftLessons}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Free Lessons */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Free Lessons
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {computedWithQuizzes.freeLessons}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Duration
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Math.floor(computedWithQuizzes.totalDuration / 60)}h {computedWithQuizzes.totalDuration % 60}m
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Count */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Video className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Video Lessons
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {computedWithQuizzes.lessonsByType?.video || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes Count - NEW */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HelpCircle className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    With Quizzes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {computedWithQuizzes.lessonsWithQuizzes}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm text-red-700">
            Error loading lessons: {error.message}
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {pagination.total > 0 && (
            <>Showing {lessons.length} of {pagination.total} lessons</>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">View:</span>
          <div className="inline-flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lessons found"
          description={
            selectedCourse !== 'all'
              ? "This course doesn't have any lessons yet."
              : "You haven't created any lessons yet."
          }
          actionText="Create First Lesson"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className={
          viewMode === 'cards'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              viewMode={viewMode}
              onEdit={(lesson) => console.log('Edit lesson:', lesson)}
              onDelete={handleDeleteClick}
              onDuplicate={handleDuplicate}
              courses={courses}
            />
          ))}
        </div>
      )}

      {/* Loading indicator for additional loads */}
      {loading && lessons.length > 0 && (
        <div className="text-center py-4">
          <LoadingSpinner size="sm" message="Loading more lessons..." />
        </div>
      )}

      {/* Create Lesson Modal */}
      <LessonCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLessonCreated={handleCreateLesson}
        courses={validCourses}
        selectedCourseId={selectedCourseId}
        isCreating={creating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setLessonToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Lesson"
        message={`Are you sure you want to delete the lesson "${lessonToDelete?.title?.rendered || lessonToDelete?.title || 'this lesson'}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default LessonsManager;