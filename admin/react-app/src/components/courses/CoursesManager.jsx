// admin/react-app/src/components/courses/CoursesManager.jsx

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp,
  Award,
  Target
} from 'lucide-react';

import useCourses from '../../hooks/useCourses';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';
import * as courseService from '../../api/services/courseService';

import ContentManager from '../common/ContentManager';
import CourseCard from './CourseCard';
import CourseModal from './CourseModal';
import DeleteModal from '../common/DeleteModal';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';
import { useTranslation } from 'react-i18next';

const CoursesManager = () => {
  const { t } = useTranslation();

  // --- LOCAL STATE ---
  const [viewMode, setViewMode] = useState('cards');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  
  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'view'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    console.log('🔍 Course search triggered:', searchTerm);
  }, 500);

  // --- DEBOUNCED FILTERS ---
  const {
    filters,
    isFiltering,
    updateFilter,
    resetFilters
  } = useFilterDebounce(
    {
      category: 'all',
      status: 'all'
    },
    async (newFilters) => {
      console.log('🔧 Course filters changed:', newFilters);
    },
    300
  );

  // --- HOOKS WITH PROPER DEBOUNCING ---
  const { 
    courses, 
    loading, 
    error, 
    pagination,
    computed,
    creating, 
    updating,
    deleting,
    createCourse, 
    updateCourse, 
    deleteCourse, 
    duplicateCourse, 
    fetchCourses
  } = useCourses({
    search: searchValue,
    category: filters.category !== 'all' ? filters.category : null,
    status: filters.status !== 'all' ? filters.status : null,
    autoFetch: true,
    debounceMs: 500
  });

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const hasMore = pagination.hasMore;
  
  const lastCourseElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log('📄 Loading more courses...');
        fetchCourses(false);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchCourses]);

  // --- EVENT HANDLERS ---
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCategoryChange = useCallback((category) => {
    updateFilter('category', category);
  }, [updateFilter]);

  const handleStatusChange = useCallback((status) => {
    updateFilter('status', status);
  }, [updateFilter]);

  const handleRefresh = useCallback(() => {
    fetchCourses(true);
  }, [fetchCourses]);

  // --- MODAL HANDLERS ---
  const openModal = (mode, course = null) => {
    console.log('🔵 Opening modal:', mode, course);
    setModalMode(mode);
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log('🔴 Closing modal');
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedCourse(null);
    }, 300);
  };

  const handleSaveCourse = async (courseData, nextAction) => {
    try {
      console.log('💾 CoursesManager - Saving course:', courseData);
      
      let result;
      if (modalMode === 'create') {
        result = await createCourse(courseData);
        console.log('✅ Course created:', result);
        
        // 🔥 FIX: Refrescar para obtener datos embebidos
        if (result?.id) {
          const refreshedCourse = await courseService.getOne(result.id);
          result = refreshedCourse;
        }
      } else if (modalMode === 'edit') {
        result = await updateCourse(selectedCourse.id, courseData);
        console.log('✅ Course updated:', result);
        
        // 🔥 FIX: Refrescar para obtener datos embebidos
        if (result?.id) {
          const refreshedCourse = await courseService.getOne(result.id);
          result = refreshedCourse;
        }
      }

      if (nextAction === 'close') {
        closeModal();
      } else if (nextAction === 'create') {
        setSelectedCourse(null);
        setModalMode('create');
      } else if (nextAction === 'edit' && result?.id) {
        setSelectedCourse(result);
        setModalMode('edit');
      }

      return result;
    } catch (error) {
      console.error('❌ Error saving course:', error);
      throw error;
    }
  };

  const handleDeleteClick = useCallback((course) => {
    console.log('🗑️ Delete clicked for course:', course);
    setCourseToDelete(course);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      console.log('🗑️ Confirming delete for course:', courseToDelete.id);
      await deleteCourse(courseToDelete.id);
      setShowDeleteModal(false);
      setCourseToDelete(null);
      console.log('✅ Course deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting course:', error);
    }
  };

  const handleDuplicate = useCallback(async (course) => {
    try {
      await duplicateCourse(course.id);
    } catch (error) {
      console.error('Error duplicating course:', error);
    }
  }, [duplicateCourse]);

  const handleCourseClick = useCallback((course) => {
    openModal('view', course);
  }, []);

  // --- STATISTICS CARDS ---
  const statsCards = useMemo(() => {
    return [
      {
        label: t('courses.stats.totalCourses'),
        value: computed.totalCourses || 0,
        icon: BookOpen,
        iconColor: 'text-blue-500'
      },
      {
        label: t('courses.stats.totalStudents'),
        value: computed.totalStudents || 0,
        icon: Users,
        iconColor: 'text-purple-500'
      },
      {
        label: t('courses.stats.averagePrice'),
        value: computed.averagePrice ? `$${computed.averagePrice}` : '$0',
        icon: DollarSign,
        iconColor: 'text-green-500'
      },
      {
        label: t('courses.stats.totalRevenue'),
        value: computed.totalRevenue ? `$${computed.totalRevenue.toLocaleString()}` : '$0',
        icon: TrendingUp,
        iconColor: 'text-indigo-500'
      },
      {
        label: t('courses.stats.featuredCourses'),
        value: computed.featuredCount || 0,
        icon: Award,
        iconColor: 'text-yellow-500'
      },
      {
        label: t('courses.stats.completionRate'),
        value: `${computed.averageCompletionRate || 0}%`,
        icon: Target,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed, t]);

  // --- FILTER OPTIONS ---
  const categoryOptions = useMemo(() => [
    { value: 'all', label: t('courses.category.all') },
    { value: 'programming', label: t('courses.category.programming') },
    { value: 'design', label: t('courses.category.design') },
    { value: 'business', label: t('courses.category.business') },
    { value: 'marketing', label: t('courses.category.marketing') },
    { value: 'photography', label: t('courses.category.photography') }
  ], [t]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('courses.status.all') },
    { value: 'publish', label: t('courses.status.publish') },
    { value: 'draft', label: t('courses.status.draft') },
    { value: 'private', label: t('courses.status.private') }
  ], [t]);

  // --- SEARCH CONFIG ---
  const searchConfig = {
    value: searchValue,
    onChange: handleSearchChangeWrapper,
    onClear: clearSearch,
    placeholder: t('courses.searchPlaceholder'),
    isLoading: isSearching,
  };

  // --- FILTERS CONFIG ---
  const filtersConfig = [
    {
      label: t('courses.category.label'),
      value: filters.category,
      onChange: handleCategoryChange,
      options: categoryOptions,
      placeholder: t('courses.category.all')
    },
    {
      label: t('courses.status.label'),
      value: filters.status,
      onChange: handleStatusChange,
      options: statusOptions,
      placeholder: t('courses.status.all')
    }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <PageHeader
        title={t('courses.title')}
        description={t('courses.description')}
        stats={statsCards}
        primaryAction={{
          text: t('courses.createCourse'),
          onClick: () => openModal('create'),
          isLoading: creating,
          icon: BookOpen
        }}
        isLoading={isFiltering || isSearching}
      />

      {/* Filter Bar */}
      <FilterBar
        searchConfig={searchConfig}
        filtersConfig={filtersConfig}
        onRefresh={handleRefresh}
        onReset={resetFilters}
        isLoading={loading}
      />

      {/* Content Manager with Infinite Scroll */}
      <ContentManager
        title={t('courses.title')}
        description={t('courses.description')}
        createButtonText={t('courses.createCourse')}
        onCreateClick={() => openModal('create')}
        items={courses}
        loading={loading && courses.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCreateButton={false} // Ya está en PageHeader
        showItemCount={true}
        showViewToggle={true}
        emptyState={{ 
          icon: BookOpen, 
          title: t('courses.noCourses'),
          description: t('courses.noCoursesDescription'),
          actionText: t('courses.createCourse'),
          onAction: () => openModal('create')
        }}
      >
        {/* Courses Grid/List */}
        {courses.map((course, index) => {
          // Ref para el último elemento (infinite scroll)
          if (index === courses.length - 1) {
            return (
              <div key={course.id} ref={lastCourseElementRef}>
                <CourseCard
                  course={course}
                  onEdit={() => openModal('edit', course)}
                  onDelete={() => handleDeleteClick(course)}
                  onDuplicate={() => handleDuplicate(course)}
                  onClick={() => handleCourseClick(course)}
                  viewMode={viewMode}
                />
              </div>
            );
          } else {
            return (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => openModal('edit', course)}
                onDelete={() => handleDeleteClick(course)}
                onDuplicate={() => handleDuplicate(course)}
                onClick={() => handleCourseClick(course)}
                viewMode={viewMode}
              />
            );
          }
        })}

        {/* Loading more indicator */}
        {loading && courses.length > 0 && (
          <div className="col-span-full text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">{t('common.loadingMore')}</p>
          </div>
        )}

        {/* End of list indicator */}
        {!loading && !hasMore && courses.length > 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-sm text-gray-500">{t('common.endOfList')}</p>
          </div>
        )}
      </ContentManager>

      {/* Course Modal */}
      <CourseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveCourse}
        course={selectedCourse}
        mode={modalMode}
        isLoading={creating || updating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t('courses.messages.deleteConfirmTitle')}
        message={t('courses.messages.deleteConfirmMessage', { 
          title: courseToDelete?.title?.rendered || courseToDelete?.title || ''
        })}
        isDeleting={deleting}
      />
    </div>
  );
};

export default CoursesManager;