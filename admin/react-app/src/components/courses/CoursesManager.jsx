import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Eye, 
  EyeOff, 
  Clock, 
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';

// Hook imports
import { useCourses } from '../hooks/useCourses.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import CourseCard from './CourseCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';
// import CourseCreateModal from './CourseCreateModal.jsx'; // TODO: Crear este componente

const CoursesManager = () => {
  // --- STATE ---
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
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
    category: selectedCategory !== 'all' ? selectedCategory : null,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : null,
    autoFetch: true
  });

  // --- COMPUTED VALUES ---
  const categories = useMemo(() => [
    'all',
    'policial',
    'ingles',
    'enp',
    'psicotecnicos',
    'guardia-civil'
  ], []);

  const difficulties = useMemo(() => [
    'all',
    'beginner',
    'intermediate', 
    'advanced',
    'expert'
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
    // Calcular estadísticas basadas en los cursos actuales
    const totalRevenue = courses.reduce((sum, course) => {
      const price = parseFloat(course.meta?._price || '0');
      const salePrice = parseFloat(course.meta?._sale_price || '0');
      return sum + (salePrice > 0 && salePrice < price ? salePrice : price);
    }, 0);

    const averagePrice = courses.length > 0 
      ? Math.round(totalRevenue / courses.length)
      : 0;

    const coursesByDifficulty = courses.reduce((acc, course) => {
      const difficulty = course.meta?._difficulty_level || 'beginner';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});

    return [
      {
        label: 'Total Courses',
        value: computed.totalCourses || courses.length,
        icon: BookOpen,
        iconColor: 'text-gray-400'
      },
      {
        label: 'Published',
        value: computed.publishedCourses || courses.filter(c => c.status === 'publish').length,
        icon: Eye,
        iconColor: 'text-green-400'
      },
      {
        label: 'Draft',
        value: computed.draftCourses || courses.filter(c => c.status === 'draft').length,
        icon: EyeOff,
        iconColor: 'text-yellow-400'
      },
      {
        label: 'Avg. Duration',
        value: computed.averageDuration ? `${computed.averageDuration}w` : '--',
        icon: Clock,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Total Revenue',
        value: totalRevenue > 0 ? `${Math.round(totalRevenue)}` : '$0',
        icon: DollarSign,
        iconColor: 'text-green-500'
      },
      {
        label: 'Avg. Price',
        value: averagePrice > 0 ? `${averagePrice}` : 'Free',
        icon: BarChart3,
        iconColor: 'text-purple-400'
      },
      {
        label: 'Total Students',
        value: computed.totalStudents || '--',
        icon: Users,
        iconColor: 'text-indigo-400'
      }
    ];
  }, [courses, computed]);

  // --- EVENT HANDLERS ---
  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleDifficultyChange = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
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
    // Navegar a la vista de detalle del curso o abrir modal de edición
    console.log('Navigate to course details:', course.id);
  }, []);

  // --- FILTER COMPONENT ---
  const renderFilters = () => (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Courses
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, description..."
              className="block w-full pl-10 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="all">All Categories</option>
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="relative">
          <label htmlFor="difficulty-select" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty
          </label>
          <div className="relative">
            <select
              id="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="all">All Levels</option>
              {difficulties.slice(1).map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchTerm) && (
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {selectedCategory}
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          {selectedDifficulty !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {selectedDifficulty}
              <button
                onClick={() => setSelectedDifficulty('all')}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );

  // --- EMPTY STATE CONFIG ---
  const emptyStateConfig = {
    icon: BookOpen,
    title: "No courses found",
    description: (selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchTerm)
      ? "No courses match your current filters."
      : "You haven't created any courses yet.",
    actionText: "Create First Course"
  };

  // --- RENDER ---
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading courses</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <ContentManager
        title="Courses Manager"
        description="Manage and organize your learning courses"
        createButtonText="Create Course"
        onCreateClick={() => setShowCreateModal(true)}
        statistics={statistics}
        items={courses}
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
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            viewMode={viewMode}
            onEdit={(course) => console.log('Edit course:', course)}
            onDelete={handleDeleteClick}
            onDuplicate={handleDuplicate}
            onClick={handleCourseClick}
            showLessons={true}
            showPrice={true}
          />
        ))}
      </ContentManager>

      {/* Modals */}
      {/* TODO: Crear CourseCreateModal */}
      {/* <CourseCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCourseCreated={handleCreateCourse}
        isCreating={creating}
      /> */}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCourseToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete the course "${courseToDelete?.title?.rendered || courseToDelete?.title || 'this course'}"? This action cannot be undone and will also delete all associated lessons.`}
      />
    </>
  );
};

export default CoursesManager;