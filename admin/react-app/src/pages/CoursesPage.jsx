import React, { useState, useMemo, useCallback } from 'react';
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
  DollarSign,
  Star,
  ChevronDown,
  Search,
  Plus
} from 'lucide-react';

// Hook imports
import { useCourses } from '../components/hooks/useCourses.js';

// Component imports
import CourseCard from '../components/courses/CourseCard.jsx';
import ContentManager from '../components/common/ContentManager.jsx';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal.jsx';
import QEButton from '../components/common/QEButton';

const CoursesPage = () => {
  // --- STATE ---
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  // --- HOOKS ---
  const { 
    courses, 
    loading, 
    error, 
    pagination,
    computed,
    createCourse,
    deleteCourse,
    duplicateCourse,
    creating 
  } = useCourses({
    search: searchTerm,
    type: selectedType !== 'all' ? selectedType : null,
    category: selectedCategory !== 'all' ? selectedCategory : null,
    status: selectedStatus !== 'all' ? selectedStatus : 'publish,draft,private', // 🎯 Admin: mostrar todos por defecto
    autoFetch: true
  });

  // --- COMPUTED VALUES ---
  const difficulties = useMemo(() => [
    'all',
    'beginner',
    'intermediate', 
    'advanced',
    'expert'
  ], []);

  const types = useMemo(() => [
    'all',
    'online',
    'hybrid',
    'workshop',
    'masterclass'
  ], []);

  const categories = useMemo(() => [
    'all',
    'programming',
    'design',
    'business',
    'marketing',
    'data-science'
  ], []);

  const statuses = useMemo(() => [
    'all',
    'publish',
    'draft',
    'private',
    'pending'
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
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
        iconColor: 'qe-icon-primary'
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
        iconColor: 'qe-icon-secondary'
      },
      {
        label: 'Paid Courses',
        value: paidCourses,
        icon: Trophy,
        iconColor: 'qe-icon-accent'
      },
      {
        label: 'Featured',
        value: featuredCourses,
        icon: Star,
        iconColor: 'text-orange-500'
      }
    ];
  }, [computed]);

  // --- EVENT HANDLERS ---
  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleDifficultyChange = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleStatusChange = useCallback((status) => {
    setSelectedStatus(status);
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

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

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedStatus('all');
    setSearchTerm('');
  }, []);

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center space-x-3">
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 qe-border-primary mr-2"></div>
                Loading...
              </div>
            )}
            <QEButton
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              variant="primary"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Course'}
            </QEButton>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statistics.map((stat, index) => {
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
      <div className="rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
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
            {types.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty === 'all' ? 'All Difficulties' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
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

export default CoursesPage;