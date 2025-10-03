// admin/react-app/src/components/lessons/LessonsManager.jsx

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
  RefreshCw,
  Video,
  FileImage,
  Download
} from 'lucide-react';

// Hooks
import useLessons from '../../hooks/useLessons.js';
import useCourses from '../../hooks/useCourses.js';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';
import { useTranslation } from 'react-i18next';

// Components
import ContentManager from '../common/ContentManager';
import LessonCard from './LessonCard';
import LessonModal from './LessonModal';
import DeleteModal from '../common/DeleteModal';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';

const LessonsManager = () => {
  const { t } = useTranslation();

  // ============================================================
  // LOCAL STATE
  // ============================================================
  
  const [viewMode, setViewMode] = useState('cards');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ============================================================
  // SEARCH & FILTERS WITH DEBOUNCE
  // ============================================================
  
  const { searchValue, isSearching, handleSearchChange, clearSearch } = 
    useSearchInput('', () => {}, 500);
  
  const { filters, isFiltering, updateFilter, resetFilters } = useFilterDebounce(
    { 
      courseId: 'all', 
    },
    () => {}, 
    300
  );

  // ============================================================
  // DATA FETCHING HOOKS
  // ============================================================
  
  // Fetch lessons
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
    courseId: filters.courseId !== 'all' ? parseInt(filters.courseId) : null,
    lessonType: filters.lessonType !== 'all' ? filters.lessonType : null,
    status: filters.status !== 'all' ? filters.status : null,
    autoFetch: true,
    perPage: 20
  });

  // Fetch courses for dropdown
  const { 
    courses, 
    loading: coursesLoading 
  } = useCourses({
    status: 'publish,draft',
    autoFetch: true,
    perPage: 100
  });

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  
  // Transform courses into options for dropdown
  const courseOptions = useMemo(() => {
    if (!courses) return [{ value: 'all', label: t('lessons.course.all') }];
    
    return [
      { value: 'all', label: t('lessons.course.all') },
      ...courses.map(course => ({
        value: course.id.toString(),
        label: course.title?.rendered || course.title || `Course #${course.id}`
      }))
    ];
  }, [courses, t]);

  // Lesson type options
  const lessonTypeOptions = useMemo(() => [
    { value: 'all', label: t('lessons.lessonType.all') },
    { value: 'video', label: t('lessons.lessonType.video') },
    { value: 'text', label: t('lessons.lessonType.text') },
    { value: 'mixed', label: t('lessons.lessonType.mixed') },
    { value: 'quiz', label: t('lessons.lessonType.quiz') },
    { value: 'interactive', label: t('lessons.lessonType.interactive') }
  ], [t]);


  // Statistics cards
  const statsCards = useMemo(() => {
    // Count lessons by type
    const videoLessons = lessons.filter(l => l.lesson_type === 'video').length;
    const textLessons = lessons.filter(l => l.lesson_type === 'text').length;
    const mixedLessons = lessons.filter(l => l.lesson_type === 'mixed').length;
    
    // Calculate total steps
    const totalSteps = lessons.reduce((sum, lesson) => 
      sum + (lesson.steps_count || 0), 0
    );
    
    // Average steps per lesson
    const averageSteps = lessons.length > 0 
      ? Math.round(totalSteps / lessons.length) 
      : 0;

    return [
      { 
        label: t('lessons.stats.totalLessons'), 
        value: pagination.total || lessons.length || 0, 
        icon: BookOpen, 
        iconColor: 'text-blue-500' 
      },
      { 
        label: t('lessons.stats.videoLessons'), 
        value: videoLessons, 
        icon: Video, 
        iconColor: 'text-purple-500' 
      },
      { 
        label: t('lessons.stats.textLessons'), 
        value: textLessons, 
        icon: FileText, 
        iconColor: 'text-green-500' 
      },
      { 
        label: t('lessons.stats.mixedLessons'), 
        value: mixedLessons, 
        icon: FileImage, 
        iconColor: 'text-orange-500' 
      },
      { 
        label: t('lessons.stats.totalSteps'), 
        value: totalSteps, 
        icon: Target, 
        iconColor: 'text-indigo-500' 
      },
      { 
        label: t('lessons.stats.averageSteps'), 
        value: averageSteps, 
        icon: TrendingUp, 
        iconColor: 'text-teal-500' 
      }
    ];
  }, [lessons, pagination, t]);

  // ============================================================
  // INFINITE SCROLL
  // ============================================================
  
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

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCourseChange = useCallback((courseId) => {
    console.log('📚 Course filter changed:', courseId);
    updateFilter('courseId', courseId);
  }, [updateFilter]);

  const handleLessonTypeChange = useCallback((lessonType) => {
    console.log('🎬 Lesson type filter changed:', lessonType);
    updateFilter('lessonType', lessonType);
  }, [updateFilter]);

  const handleStatusChange = useCallback((status) => {
    console.log('📝 Status filter changed:', status);
    updateFilter('status', status);
  }, [updateFilter]);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing lessons...');
    fetchLessons(true);
  }, [fetchLessons]);

  // ============================================================
  // MODAL HANDLERS
  // ============================================================
  
  const openModal = useCallback((mode, lesson = null) => {
    console.log('🔵 Opening modal:', mode, lesson);
    setModalMode(mode);
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    console.log('🔴 Closing modal');
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedLesson(null);
    }, 300);
  }, []);

  const handleSaveLesson = async (lessonData, nextAction) => {
    try {
      console.log('💾 Saving lesson:', lessonData, 'Next action:', nextAction);
      
      let result;
      if (modalMode === 'create') {
        result = await createLesson(lessonData);
        console.log('✅ Lesson created:', result);
      } else if (modalMode === 'edit') {
        result = await updateLesson(selectedLesson.id, lessonData);
        console.log('✅ Lesson updated:', result);
      }

      // Handle next action
      if (nextAction === 'close') {
        closeModal();
      } else if (nextAction === 'reset') {
        setSelectedLesson(null);
        setModalMode('create');
      }

      return result;

    } catch (error) {
      console.error('❌ Error saving lesson:', error);
      throw error;
    }
  };

  // ============================================================
  // DELETE HANDLERS
  // ============================================================
  
  const handleDeleteClick = useCallback((lesson) => {
    console.log('🗑️ Delete clicked for lesson:', lesson);
    setLessonToDelete(lesson);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!lessonToDelete) return;
    
    try {
      console.log('🗑️ Deleting lesson:', lessonToDelete.id);
      await deleteLesson(lessonToDelete.id);
      console.log('✅ Lesson deleted successfully');
      
      setShowDeleteModal(false);
      setLessonToDelete(null);
    } catch (error) {
      console.error('❌ Error deleting lesson:', error);
    }
  };

  const handleDuplicate = async (lesson) => {
    try {
      console.log('📋 Duplicating lesson:', lesson.id);
      await duplicateLesson(lesson.id);
      console.log('✅ Lesson duplicated successfully');
    } catch (error) {
      console.error('❌ Error duplicating lesson:', error);
    }
  };

  const handleLessonClick = useCallback((lesson) => {
    console.log('👁️ View lesson:', lesson);
    openModal('view', lesson);
  }, [openModal]);

  // ============================================================
  // FILTER CONFIGURATION
  // ============================================================
  
  const searchConfig = {
    placeholder: t('lessons.searchPlaceholder'),
    value: searchValue,
    onChange: handleSearchChangeWrapper,
    onClear: clearSearch,
    isSearching: isSearching
  };

  const filtersConfig = [
    {
      label: t('lessons.course.label'),
      value: filters.courseId,
      options: courseOptions,
      onChange: handleCourseChange,
      loading: coursesLoading
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="space-y-6 p-6">
      
      {/* Page Header with Stats */}
      <PageHeader
        title={t('lessons.title')}
        description={t('lessons.description')}
        stats={statsCards}
        isLoading={loading && lessons.length === 0}
        primaryAction={{
          text: t('lessons.addNew'),
          onClick: () => openModal('create'),
          isLoading: creating,
          icon: BookOpen
        }}
        secondaryAction={{
          text: t('common.refresh'),
          onClick: handleRefresh,
          isLoading: loading,
          icon: RefreshCw
        }}
      />

      {/* Filters and Search */}
      <FilterBar
        searchConfig={searchConfig}
        filtersConfig={filtersConfig}
        onResetFilters={resetFilters}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Content Manager with Cards */}
      <ContentManager
        title={t('lessons.title')}
        description={t('lessons.description')}
        createButtonText={t('lessons.addNew')}
        onCreateClick={() => openModal('create')}
        items={lessons}
        loading={loading && lessons.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCreateButton={false}
        showItemCount={true}
        showViewToggle={true}
        showStatistics={false}
        emptyState={{ 
          icon: BookOpen, 
          title: t('lessons.noLessons'),
          description: lessons.length === 0 && !loading
            ? t('lessons.noLessonsDescription')
            : t('common.noResults'),
          actionText: t('lessons.addNew'),
          onAction: () => openModal('create')
        }}
      >
        {lessons.map((lesson, index) => {
          const cardProps = {
            lesson,
            courses,
            onEdit: () => openModal('edit', lesson),
            onDelete: () => handleDeleteClick(lesson),
            onDuplicate: () => handleDuplicate(lesson),
            onClick: () => handleLessonClick(lesson),
            viewMode: viewMode
          };

          if (index === lessons.length - 1) {
            return (
              <div key={lesson.id} ref={lastLessonElementRef}>
                <LessonCard {...cardProps} />
              </div>
            );
          }
          
          return (
            <div key={lesson.id}>
              <LessonCard {...cardProps} />
            </div>
          );
        })}

        {/* Loading state */}
        {loading && lessons.length > 0 && (
          <div className="flex justify-center py-8 col-span-full">
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span>{t('lessons.loadingMoreLessons')}</span>
            </div>
          </div>
        )}

        {/* End of list */}
        {!loading && !hasMore && lessons.length > 0 && (
          <div className="text-center py-6 col-span-full">
            <p className="text-gray-500">{t('common.endOfList')}</p>
          </div>
        )}
      </ContentManager>

      {/* ============================================================
          MODALS
          ============================================================ */}
      
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
          onClose={() => {
            setShowDeleteModal(false);
            setLessonToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title={t('lessons.messages.deleteConfirmTitle')}
          message={t('lessons.messages.deleteConfirmMessage', { 
            title: lessonToDelete?.title?.rendered || lessonToDelete?.title || ''
          })}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default LessonsManager;