import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Clock, 
  BarChart3, 
  TrendingUp,
  GraduationCap,
  Target,
  Search,
  RefreshCw
} from 'lucide-react';

import useCourses from '../../hooks/useCourses';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils.js';

import ContentManager from '../common/ContentManager';
import CourseCard from './CourseCard';
import CourseModal from './CourseModal';
import DeleteModal from '../common/DeleteModal';

const CoursesManager = () => {
  // --- LOCAL STATE ---
  const [viewMode, setViewMode] = useState('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      difficulty: 'all',
      status: 'all',
      price: 'all'
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
    difficulty: filters.difficulty !== 'all' ? filters.difficulty : null,
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

  const handleDifficultyChange = useCallback((difficulty) => {
    updateFilter('difficulty', difficulty);
  }, [updateFilter]);

  const handleStatusChange = useCallback((status) => {
    updateFilter('status', status);
  }, [updateFilter]);

  const handlePriceChange = useCallback((price) => {
    updateFilter('price', price);
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
    setShowCreateModal(mode === 'create');
  };

  const closeModal = () => {
    console.log('🔴 Closing modal');
    setIsModalOpen(false);
    setShowCreateModal(false);
    setTimeout(() => {
      setModalMode(null);
      setSelectedCourse(null);
    }, 300);
  };

  const handleSaveCourse = async (courseData, nextAction) => {
    try {
      console.log('💾 Saving course:', courseData, 'Next action:', nextAction);
      
      let result;
      if (modalMode === 'create') {
        result = await createCourse(courseData);
      } else if (modalMode === 'edit') {
        result = await updateCourse(selectedCourse.id, courseData);
      }

      console.log('✅ Course saved successfully:', result);

      // Handle next action
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

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    return [
      {
        label: 'Total Courses',
        value: computed.totalCourses || 0,
        icon: BookOpen,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Published',
        value: computed.publishedCourses || 0,
        icon: BarChart3,
        iconColor: 'text-green-500'
      },
      {
        label: 'Students',
        value: computed.totalStudents || 0,
        icon: Users,
        iconColor: 'text-purple-500'
      },
      {
        label: 'Avg. Price',
        value: `$${computed.averagePrice || 0}`,
        icon: DollarSign,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'Revenue',
        value: `$${computed.totalRevenue || 0}`,
        icon: TrendingUp,
        iconColor: 'text-indigo-500'
      },
      {
        label: 'Completion Rate',
        value: `${computed.averageCompletionRate || 0}%`,
        icon: Target,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'All Categories' },
    { value: 'programming', label: 'Programming' },
    { value: 'design', label: 'Design' },
    { value: 'business', label: 'Business' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'photography', label: 'Photography' },
  ], []);

  const difficultyOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'publish', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'private', label: 'Private' }
  ];

  const priceOptions = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free' },
    { value: 'paid', label: 'Paid' },
    { value: 'premium', label: 'Premium ($100+)' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
            <p className="text-gray-600 mt-1">Create and manage courses with lessons, pricing and enrollment.</p>
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
              {creating ? 'Creating...' : 'Create Course'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input with Debouncing */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search courses..."
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

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={filters.difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {difficultyOptions.map(option => (
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

          {/* Price Filter */}
          <select
            value={filters.price}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {priceOptions.map(option => (
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
        title="Courses"
        description="Manage and organize all your courses"
        createButtonText="Create Course"
        onCreateClick={() => {
          console.log('🟡 ContentManager Create button clicked');
          openModal('create');
        }}
        items={courses}
        loading={loading && courses.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showCreateButton={true}
        showItemCount={true}
        showViewToggle={true}
        emptyState={{ 
          icon: BookOpen, 
          title: 'No courses found',
          description: 'Create your first course to get started',
          actionText: 'Create Course',
          onAction: () => {
            console.log('🟡 EmptyState Create button clicked');
            openModal('create');
          }
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
                  />
                </div>
              );
            }
            
            return (
              <div key={course.id}>
                <CourseCard
                  course={course}
                  onEdit={() => openModal('edit', course)}
                  onDelete={() => handleDeleteClick(course)}
                  onDuplicate={() => handleDuplicate(course)}
                  onClick={() => handleCourseClick(course)}
                />
              </div>
            );
          })}

          {/* Loading state DENTRO del grid con col-span-full */}
          {loading && courses.length > 0 && (
            <div className="flex justify-center py-8 col-span-full">
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                <span>Loading more courses...</span>
              </div>
            </div>
          )}

          {/* End state DENTRO del grid con col-span-full */}
          {!loading && !hasMore && courses.length > 0 && (
            <div className="text-center py-6 col-span-full">
              <p className="text-gray-500">You've reached the end of the list.</p>
            </div>
          )}
      </ContentManager>

      {/* Course Modal */}
      {isModalOpen && (
        <CourseModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveCourse}
          course={selectedCourse}
          mode={modalMode}
          isLoading={creating || updating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Course"
          message={`Are you sure you want to delete "${courseToDelete?.title?.rendered || courseToDelete?.title}"? This action cannot be undone and will also remove all associated lessons.`}
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default CoursesManager;