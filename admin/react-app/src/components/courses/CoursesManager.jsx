// admin/react-app/src/components/courses/CoursesManager.jsx

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  EuroIcon,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';

import useCourses from '../../hooks/useCourses';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import * as courseService from '../../api/services/courseService';

import ContentManager from '../common/ContentManager';
import CourseCard from './CourseCard';
import CourseModal from './CourseModal';
import DeleteModal from '../common/DeleteModal';
import PageHeader from '../common/PageHeader.jsx';
import FilterBar from '../common/FilterBar.jsx';
import ResourceGrid from '../common/ResourceGrid.jsx';
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
  const { searchValue, isSearching, handleSearchChange, clearSearch } = useSearchInput('', () => {}, 500);
  
  // 🔥 CORRECCIÓN: Definir todos los filtros iniciales para que el reseteo funcione.
  const { filters, isFiltering, updateFilter, resetFilters } = useFilterDebounce(
    { category: 'all', status: 'all' },
    () => {}, 300
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

    const { options: taxonomyOptions, isLoading: isLoadingTaxonomies } = useTaxonomyOptions(['qe_category']);


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

    const formatCurrency = (value) => new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
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
        value: formatCurrency(computed.averagePrice),
        icon: EuroIcon,
        iconColor: 'text-green-500'
      },
      {
        label: t('courses.stats.totalRevenue'),
        value: formatCurrency(computed.totalRevenue),
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
    onChange: (e) => handleSearchChange(e.target.value),
    onClear: clearSearch,
    placeholder: t('courses.searchPlaceholder'),
    isLoading: isSearching,
  };

  // --- FILTERS CONFIG ---
  const filtersConfig = [
    {
      label: t('courses.category.label'),
      value: filters.category,
      onChange: (value) => updateFilter('category', value),
      options: taxonomyOptions.qe_category || [],
      placeholder: t('courses.category.all'),
      isLoading: isLoadingTaxonomies,
    },
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
        onResetFilters={resetFilters}
        isLoading={loading}
      />

      {/* Content Manager with Infinite Scroll */}
      <ContentManager
                items={courses}
                loading={loading && courses.length === 0}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                emptyState={{ icon: BookOpen, title: t('courses.noCourses'), onAction: () => openModal('create') }}
            >
                <ResourceGrid
                    items={courses}
                    ItemComponent={CourseCard}
                    lastItemRef={lastCourseElementRef}
                    itemProps={{
                        resourceName: 'course',
                        viewMode: viewMode,
                        onEdit: (course) => openModal('edit', course),
                        onDelete: handleDeleteClick,
                        onDuplicate: handleDuplicate,
                        onClick: handleCourseClick,
                    }}
                />

                {/* Indicadores de carga/fin de lista se quedan aquí */}
                {loading && courses.length > 0 && (
                    <div className="col-span-full text-center py-8">
                        {/* ...spinner... */}
                    </div>
                )}
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