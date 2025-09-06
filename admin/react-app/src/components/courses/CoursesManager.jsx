import React, { useState, useCallback, useMemo } from 'react';
import { 
  BookOpen, 
  Eye, 
  EyeOff, 
  Clock, 
  Users,
  Trophy,
  Target,
  BarChart3,
  TrendingUp,
  Zap,
  DollarSign,
  Star,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';

// FIXED: Import the updated hooks with debouncing
import { useCourses } from '../hooks/useCourses.js';

// Import debounce utilities - FIXED PATH
import { useSearchInput, useFilterDebounce } from '../../utils/debounceUtils.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import CourseCard from './CourseCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const CoursesManager = () => {
  // --- LOCAL STATE ---
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    // This will automatically trigger the debounced fetch in useCourses
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
      type: 'all',
      category: 'all',
      difficulty: 'all',
      status: 'all'
    },
    async (newFilters) => {
      // This will automatically trigger the debounced fetch in useCourses
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
    createCourse,
    deleteCourse,
    duplicateCourse,
    creating,
    refreshCourses
  } = useCourses({
    // Pass current filter values
    search: searchValue,
    type: filters.type !== 'all' ? filters.type : null,
    category: filters.category !== 'all' ? filters.category : null,
    status: filters.status !== 'all' ? filters.status : null,
    autoFetch: true,
    debounceMs: 500 // Configure debounce delay
  });

  // --- EVENT HANDLERS (NO MORE DIRECT API CALLS) ---
  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
    updateFilter('type', type);
  }, [updateFilter]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    updateFilter('category', category);
  }, [updateFilter]);

  const handleDifficultyChange = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
    updateFilter('difficulty', difficulty);
  }, [updateFilter]);

  const handleStatusChange = useCallback((status) => {
    setSelectedStatus(status);
    updateFilter('status', status);
  }, [updateFilter]);

  // No more direct search handling - use the debounced version
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleCreateCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await createCourse(courseData);
      setShowCreateModal(false);
      return newCourse;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }, [createCourse]);

  const handleDeleteClick = useCallback((course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!courseToDelete) return;
    
    try {
      await deleteCourse(courseToDelete.id);
      setShowDeleteModal(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  }, [courseToDelete, deleteCourse]);

  const handleDuplicate = useCallback(async (course) => {
    try {
      await duplicateCourse(course.id);
    } catch (error) {
      console.error('Error duplicating course:', error);
    }
  }, [duplicateCourse]);

  const handleCourseClick = useCallback((course) => {
    console.log('Navigate to course details:', course.id);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshCourses();
  }, [refreshCourses]);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalCourses = computed.totalCourses || 0;
    const averagePrice = computed.averagePrice || 0;
    const totalRevenue = computed.totalRevenue || 0;
    const freeCourses = computed.freeCourses || 0;
    const paidCourses = computed.paidCourses || 0;
    const featuredCourses = computed.featuredCourses || 0;

    return [
      {
        label: 'Total Courses',
        value: totalCourses,
        icon: BookOpen,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Average Price',
        value: averagePrice > 0 ? `$${averagePrice}` : 'Free',
        icon: DollarSign,
        iconColor: 'text-green-500'
      },
      {
        label: 'Total Revenue',
        value: `$${totalRevenue.toLocaleString()}`,
        icon: TrendingUp,
        iconColor: 'text-purple-500'
      },
      {
        label: 'Free Courses',
        value: freeCourses,
        icon: Target,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Paid Courses',
        value: paidCourses,
        icon: Trophy,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'Featured',
        value: featuredCourses,
        icon: Star,
        iconColor: 'text-orange-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'masterclass', label: 'Masterclass' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'programming', label: 'Programming' },
    { value: 'design', label: 'Design' },
    { value: 'business', label: 'Business' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'data-science', label: 'Data Science' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'publish', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'private', label: 'Private' },
    { value: 'pending', label: 'Pending Review' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
            <p className="text-gray-600 mt-1">Create and manage your courses</p>
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
              {creating ? 'Creating...' : 'Create Course'}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
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
            value={selectedDifficulty}
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
            value={selectedStatus}
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

      {/* Content Manager */}
      <ContentManager
        items={courses}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(course) => (
          <CourseCard
            key={course.id}
            course={course}
            onEdit={handleCourseClick}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleCourseClick}
          />
        )}
        emptyState={{
          icon: BookOpen,
          title: 'No courses found',
          description: 'Get started by creating your first course.',
          actionLabel: 'Create Course',
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
                  Create New Course
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Course creation form would go here...
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
      {showDeleteModal && courseToDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Course"
          message={`Are you sure you want to delete "${courseToDelete.title?.rendered || courseToDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Course"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default CoursesManager;