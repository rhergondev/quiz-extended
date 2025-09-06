import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Eye, 
  EyeOff, 
  Clock, 
  Video,
  HelpCircle,
  Users,
  ChevronDown
} from 'lucide-react';

// Hook imports
import { useLessons } from '../hooks/useLessons.js';
import { useCourses } from '../hooks/useCourses.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import LessonCreateModal from './LessonCreateModal.jsx';
import LessonCard from './LessonCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const LessonsManager = () => {
  // --- STATE ---
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- HOOKS ---
  const { 
    lessons, 
    loading, 
    error, 
    pagination,
    computed,
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

  const selectedCourseId = useMemo(() => {
    if (selectedCourse === 'all') return null;
    const numericId = parseInt(selectedCourse, 10);
    return isNaN(numericId) ? null : numericId;
  }, [selectedCourse]);

  // --- STATISTICS ---
  const statistics = useMemo(() => [
    {
      label: 'Total Lessons',
      value: computed.totalLessons,
      icon: BookOpen,
      iconColor: 'text-gray-400'
    },
    {
      label: 'Published',
      value: computed.publishedLessons,
      icon: Eye,
      iconColor: 'text-green-400'
    },
    {
      label: 'Draft',
      value: computed.draftLessons,
      icon: EyeOff,
      iconColor: 'text-yellow-400'
    },
    {
      label: 'Avg. Duration',
      value: computed.averageDuration ? `${computed.averageDuration}m` : '--',
      icon: Clock,
      iconColor: 'text-blue-400'
    },
    {
      label: 'Videos',
      value: computed.lessonsByType.video || 0,
      icon: Video,
      iconColor: 'text-red-400'
    },
    {
      label: 'Quizzes',
      value: computed.lessonsByType.quiz || 0,
      icon: HelpCircle,
      iconColor: 'text-purple-400'
    },
    {
      label: 'Students',
      value: '--',
      icon: Users,
      iconColor: 'text-indigo-400'
    }
  ], [computed]);

  // --- EVENT HANDLERS ---
  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
  }, []);

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

  // --- FILTER COMPONENT ---
  const renderFilters = () => (
    <div className="p-4">
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
        {selectedCourse !== 'all' && (
          <span className="text-sm text-gray-500">
            Showing lessons for selected course
          </span>
        )}
      </div>
    </div>
  );

  // --- EMPTY STATE CONFIG ---
  const emptyStateConfig = {
    icon: BookOpen,
    title: "No lessons found",
    description: selectedCourse !== 'all'
      ? "This course doesn't have any lessons yet."
      : "You haven't created any lessons yet.",
    actionText: "Create First Lesson"
  };

  // --- RENDER ---
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading lessons</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <ContentManager
        title="Lessons Manager"
        description="Manage and organize your course lessons"
        createButtonText="Create Lesson"
        onCreateClick={() => setShowCreateModal(true)}
        statistics={statistics}
        items={lessons}
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
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            viewMode={viewMode}
            onEdit={(lesson) => console.log('Edit lesson:', lesson)}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            courses={validCourses}
          />
        ))}
      </ContentManager>

      {/* Modals */}
      <LessonCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLessonCreated={handleCreateLesson}
        courses={validCourses}
        selectedCourseId={selectedCourseId}
        isCreating={creating}
      />

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
    </>
  );
};

export default LessonsManager;