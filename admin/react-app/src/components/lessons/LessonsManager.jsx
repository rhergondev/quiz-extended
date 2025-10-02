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

import useLessons from '../../hooks/useLessons.js';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

import ContentManager from '../common/ContentManager';
import LessonCard from './LessonCard';
import LessonModal from './LessonModal';
import DeleteModal from '../common/DeleteModal';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

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

  const isLoadingTaxonomies = false; 

  const searchConfig = {
    value: searchValue,
    onChange: handleSearchChangeWrapper,
    onClear: clearSearch,
    placeholder: 'Search lessons...',
    isLoading: isSearching,
  };

  const filtersConfig = [
    {
      label: 'Course',
      value: filters.courseId,
      onChange: (value) => updateFilter('courseId', value),
      options: courseOptions, // Example with dynamic options
      placeholder: 'All Courses',
      isLoading: isLoadingTaxonomies,
      showSearch: true,
    },
    {
      label: 'Lesson Type',
      value: filters.lessonType,
      onChange: (value) => updateFilter('lessonType', value),
      options: lessonTypeOptions,
      placeholder: 'All Types',
    },
    {
      label: 'Status',
      value: filters.status,
      onChange: (value) => updateFilter('status', value),
      options: statusOptions,
      placeholder: 'All Statuses',
    },
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <PageHeader
        title={t('lessons.title')}
        description="Create and manage interactive lessons with multiple content types."
        stats={statsCards}
        isLoading={loading && lessons.length > 0} // Show a generic loading indicator when refreshing
        primaryAction={{
          text: t('lessons.addNew'),
          onClick: () => openModal('create'),
          isLoading: creating,
        }}
        secondaryAction={{
          text: t('common.refresh'),
          onClick: handleRefresh,
          isLoading: loading,
          icon: RefreshCw,
        }}
      />

      {/* Filters and Search */}
        <FilterBar
        searchConfig={searchConfig}
        filtersConfig={filtersConfig}
        onResetFilters={resetFilters}
      />


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