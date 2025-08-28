import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useCourses } from '../components/hooks/useCourses';
import ResourceActionBar from '../components/common/ResourceActionBar';
import Table from '../components/common/Table';
import Button from '../components/common/Button';

// Random data generators for testing
const courseNames = [
  "Introduction to React Development",
  "Advanced JavaScript Patterns",
  "WordPress Plugin Development",
  "Modern CSS Grid & Flexbox",
  "Node.js Backend Fundamentals",
  "Database Design Principles",
  "API Development with REST",
  "Frontend Testing Strategies",
  "DevOps for Developers",
  "Mobile-First Responsive Design",
  "TypeScript Essentials",
  "GraphQL Complete Guide",
  "Docker for Web Developers",
  "Security Best Practices",
  "Performance Optimization",
  "Agile Development Methods",
  "UI/UX Design Principles",
  "Cloud Computing Basics",
  "Machine Learning Intro",
  "Data Structures & Algorithms"
];

const categories = [
  "Web Development",
  "Backend Development", 
  "Frontend Development",
  "Full Stack",
  "DevOps",
  "Design",
  "Data Science",
  "Mobile Development",
  "Security"
];

const difficulties = ["Beginner", "Intermediate", "Advanced"];
const statuses = ["publish", "draft"];

const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomCourse = () => {
  const courseName = getRandomElement(courseNames);
  const basePrice = getRandomNumber(29, 299);
  const hasDiscount = Math.random() > 0.7;
  const salePrice = hasDiscount ? Math.floor(basePrice * 0.8) : null;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + getRandomNumber(1, 60));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + getRandomNumber(30, 180));

  return {
    title: courseName,
    content: `Complete course covering ${courseName.toLowerCase()}. This comprehensive program includes hands-on projects, real-world examples, and expert guidance.`,
    status: getRandomElement(statuses),
    meta: {
      _price: basePrice.toString(),
      _sale_price: salePrice ? salePrice.toString() : '',
      _start_date: startDate.toISOString().split('T')[0],
      _end_date: endDate.toISOString().split('T')[0],
      _course_category: getRandomElement(categories),
      _difficulty_level: getRandomElement(difficulties),
      _duration_weeks: getRandomNumber(4, 16).toString(),
      _max_students: getRandomNumber(20, 100).toString(),
    }
  };
};

const CoursesPage = () => {
  const { 
    courses, 
    isLoading, 
    isLoadingMore, 
    hasMore,
    pagination,
    loadMoreCourses,
    refreshCourses,
    addCourse, 
    removeCourse 
  } = useCourses();
  
  const [rowSelection, setRowSelection] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Enhanced filter states
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    difficulty: '',
    priceRange: { min: '', max: '' },
    dateRange: { start: '', end: '' },
    enrollmentRange: { min: '', max: '' }
  });

  // Local filter states for UI (these update immediately)
  const [localFilters, setLocalFilters] = useState(filters);

  // Table filters for client-side filtering
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  // Debounced search effect - applies filters to server after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      const serverFilters = {
        search: localFilters.search.trim(),
        status: localFilters.status || 'publish,draft'
      };
      
      // Only refresh if filters actually changed
      const hasChanged = JSON.stringify(serverFilters) !== JSON.stringify({
        search: filters.search,
        status: filters.status
      });
      
      if (hasChanged) {
        setFilters(prev => ({ ...prev, ...serverFilters }));
        refreshCourses(serverFilters);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localFilters.search, localFilters.status, refreshCourses]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="w-4 h-4 text-indigo-600 bg-gray-100 rounded border-gray-300 focus:ring-indigo-500"
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="w-4 h-4 text-indigo-600 bg-gray-100 rounded border-gray-300 focus:ring-indigo-500"
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler(),
            }}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'title.rendered',
        id: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-800">
              {row.original.title?.rendered || row.original.title || 'No Title'}
            </span>
            {row.original.meta?._sale_price && 
             parseFloat(row.original.meta._sale_price) < parseFloat(row.original.meta._price) && (
              <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 border border-green-800 rounded-full">
                On Sale
              </span>
            )}
            {row.original.meta?._difficulty_level && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                row.original.meta._difficulty_level === 'Beginner' 
                  ? 'bg-blue-100 text-blue-800'
                  : row.original.meta._difficulty_level === 'Intermediate'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {row.original.meta._difficulty_level}
              </span>
            )}
          </div>
        ),
        filterFn: 'includesString',
      },
      {
        accessorKey: 'enrolled_users_count',
        header: 'Enrolled',
        cell: ({ getValue }) => (
          <span className="text-gray-600">{getValue() || 0}</span>
        ),
        filterFn: 'inNumberRange',
      },
      {
        accessorKey: 'date',
        header: 'Published Date',
        cell: ({ row }) => (
          new Date(row.original.date || Date.now()).toLocaleDateString()
        ),
        filterFn: 'dateBetween',
      },
      {
        accessorKey: 'meta._start_date',
        header: 'Start Date',
        cell: ({ row }) => (
            row.original.meta?._start_date 
              ? new Date(row.original.meta._start_date).toLocaleDateString() 
              : 'N/A'
        ),
        filterFn: 'dateBetween',
      },
      {
        accessorKey: 'meta._end_date',
        header: 'End Date',
        cell: ({ row }) => (
            row.original.meta?._end_date 
              ? new Date(row.original.meta._end_date).toLocaleDateString() 
              : 'N/A'
        ),
        filterFn: 'dateBetween',
      },
      {
        accessorKey: 'meta._price',
        header: 'Price',
        cell: ({ row }) => {
          const price = row.original.meta?._price;
          const salePrice = row.original.meta?._sale_price;
          
          if (!price) return 'Free';
          
          return (
            <div className="flex items-center space-x-2">
              {salePrice && parseFloat(salePrice) < parseFloat(price) ? (
                <>
                  <span className="line-through text-gray-500">${price}</span>
                  <span className="font-bold text-green-600">${salePrice}</span>
                </>
              ) : (
                <span className="font-semibold">${price}</span>
              )}
            </div>
          );
        },
        filterFn: 'inNumberRange',
      },
      {
        accessorKey: 'meta._course_category',
        header: 'Category',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">{getValue() || 'Uncategorized'}</span>
        ),
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              row.original.status === 'publish'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {row.original.status}
          </span>
        ),
        filterFn: 'equalsString',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={() => handleEditCourse(row.original.id)}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => handleDeleteCourse(row.original.id)}>
              Delete
            </Button>
          </div>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: courses,
    columns,
    state: {
      columnFilters,
      globalFilter,
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Enhanced handlers
  const handleNewCourse = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const randomCourse = generateRandomCourse();
      await addCourse(randomCourse);
      console.log('✅ Random course created:', randomCourse.title);
    } catch (error) {
      console.error('❌ Failed to create course:', error);
      alert(`Failed to create course: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBulkCreateCourses = async (count = 5) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const promises = [];
      for (let i = 0; i < count; i++) {
        const randomCourse = generateRandomCourse();
        promises.push(addCourse(randomCourse));
      }
      await Promise.all(promises);
      console.log(`✅ Created ${count} random courses successfully!`);
    } catch (error) {
      console.error('❌ Failed to create bulk courses:', error);
      alert(`Failed to create courses: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await removeCourse(id);
      console.log('✅ Course deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete course:', error);
      alert(`Failed to delete course: ${error.message}`);
    }
  };

  const handleEditCourse = (id) => {
    console.log('Edit course:', id);
    // TODO: Implement edit functionality
  };

  // Filter handlers
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setLocalFilters(prev => ({ ...prev, status: value }));
  };

  const handleCategoryFilter = (category) => {
    setColumnFilters(prev => [
      ...prev.filter(filter => filter.id !== 'meta._course_category'),
      ...(category ? [{ id: 'meta._course_category', value: category }] : [])
    ]);
  };

  const handleDifficultyFilter = (difficulty) => {
    setColumnFilters(prev => [
      ...prev.filter(filter => filter.id !== 'meta._difficulty_level'),
      ...(difficulty ? [{ id: 'meta._difficulty_level', value: difficulty }] : [])
    ]);
  };

  const handlePriceRangeFilter = (min, max) => {
    setColumnFilters(prev => [
      ...prev.filter(filter => filter.id !== 'meta._price'),
      ...(min || max ? [{ id: 'meta._price', value: [Number(min) || 0, Number(max) || Infinity] }] : [])
    ]);
  };

  const handleEnrollmentRangeFilter = (min, max) => {
    setColumnFilters(prev => [
      ...prev.filter(filter => filter.id !== 'enrolled_users_count'),
      ...(min || max ? [{ id: 'enrolled_users_count', value: [Number(min) || 0, Number(max) || Infinity] }] : [])
    ]);
  };

  const clearAllFilters = () => {
    setLocalFilters({
      search: '',
      status: '',
      category: '',
      difficulty: '',
      priceRange: { min: '', max: '' },
      dateRange: { start: '', end: '' },
      enrollmentRange: { min: '', max: '' }
    });
    setColumnFilters([]);
    setGlobalFilter('');
    
    // Also refresh with empty filters
    refreshCourses({ search: '', status: 'publish,draft' });
  };

  const applyQuickFilter = (preset) => {
    switch (preset) {
      case 'published':
        setLocalFilters(prev => ({ ...prev, status: 'publish', search: '' }));
        break;
      case 'draft':
        setLocalFilters(prev => ({ ...prev, status: 'draft', search: '' }));
        break;
      case 'on-sale':
        setColumnFilters([{ id: 'meta._sale_price', value: 'has_value' }]);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setColumnFilters([{ id: 'date', value: [thirtyDaysAgo, new Date()] }]);
        break;
      case 'expensive':
        handlePriceRangeFilter('100', '');
        break;
      case 'cheap':
        handlePriceRangeFilter('', '50');
        break;
      default:
        clearAllFilters();
        break;
    }
  };

  return (
    <div className="wrap">
      <ResourceActionBar
        title="Courses"
        buttonText={isCreating ? "Creating..." : "New Random Course"}
        onButtonClick={handleNewCourse}
      >
        {/* Enhanced Filter Controls */}
        <div className="space-y-4">
          {/* Primary Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Global Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                value={localFilters.search}
                onChange={handleSearchChange}
                placeholder="Search courses..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Status Filter */}
            <select
              value={localFilters.status}
              onChange={handleStatusChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="publish">Published</option>
              <option value="draft">Draft</option>
              <option value="publish,draft">Both</option>
            </select>

            {/* Category Filter */}
            <select
              value={table.getColumn('meta._course_category')?.getFilterValue() || ''}
              onChange={e => handleCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={table.getColumn('meta._difficulty_level')?.getFilterValue() || ''}
              onChange={e => handleDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Levels</option>
              {difficulties.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>

          {/* Secondary Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Filter Presets */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Quick filters:</span>
              <button
                onClick={() => applyQuickFilter('published')}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Published
              </button>
              <button
                onClick={() => applyQuickFilter('draft')}
                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Drafts
              </button>
              <button
                onClick={() => applyQuickFilter('on-sale')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                On Sale
              </button>
              <button
                onClick={() => applyQuickFilter('expensive')}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                $100+
              </button>
              <button
                onClick={() => applyQuickFilter('cheap')}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Under $50
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Price:</span>
              <input
                type="number"
                placeholder="Min $"
                value={localFilters.priceRange.min}
                onChange={(e) => {
                  const newRange = { ...localFilters.priceRange, min: e.target.value };
                  setLocalFilters(prev => ({ ...prev, priceRange: newRange }));
                  handlePriceRangeFilter(newRange.min, newRange.max);
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max $"
                value={localFilters.priceRange.max}
                onChange={(e) => {
                  const newRange = { ...localFilters.priceRange, max: e.target.value };
                  setLocalFilters(prev => ({ ...prev, priceRange: newRange }));
                  handlePriceRangeFilter(newRange.min, newRange.max);
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Enrollment Range Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Enrolled:</span>
              <input
                type="number"
                placeholder="Min"
                value={localFilters.enrollmentRange.min}
                onChange={(e) => {
                  const newRange = { ...localFilters.enrollmentRange, min: e.target.value };
                  setLocalFilters(prev => ({ ...prev, enrollmentRange: newRange }));
                  handleEnrollmentRangeFilter(newRange.min, newRange.max);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={localFilters.enrollmentRange.max}
                onChange={(e) => {
                  const newRange = { ...localFilters.enrollmentRange, max: e.target.value };
                  setLocalFilters(prev => ({ ...prev, enrollmentRange: newRange }));
                  handleEnrollmentRangeFilter(newRange.min, newRange.max);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Bulk Actions for Testing */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => handleBulkCreateCourses(5)}
                disabled={isCreating}
                className="text-sm"
              >
                + 5 Courses
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => handleBulkCreateCourses(10)}
                disabled={isCreating}
                className="text-sm"
              >
                + 10 Courses
              </Button>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              Clear All
            </button>
          </div>

          {/* Active Filters Display */}
          {(columnFilters.length > 0 || localFilters.search || (localFilters.status && localFilters.status !== 'publish,draft')) && (
            <div className="flex flex-wrap gap-2">
              {localFilters.search && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{localFilters.search}"
                  <button
                    onClick={() => setLocalFilters(prev => ({ ...prev, search: '' }))}
                    className="ml-1.5 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {localFilters.status && localFilters.status !== 'publish,draft' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Status: {localFilters.status}
                  <button
                    onClick={() => setLocalFilters(prev => ({ ...prev, status: '' }))}
                    className="ml-1.5 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {columnFilters.map((filter) => (
                <span
                  key={filter.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {filter.id.replace('meta._', '').replace('_', ' ')}: {
                    typeof filter.value === 'string' 
                      ? filter.value 
                      : Array.isArray(filter.value) 
                        ? `${filter.value[0]} - ${filter.value[1]}`
                        : 'Range'
                  }
                  <button
                    onClick={() => table.getColumn(filter.id)?.setFilterValue('')}
                    className="ml-1.5 text-gray-600 hover:text-gray-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </ResourceActionBar>

      <div className="p-4">
        {/* Pagination Info */}
        {pagination.total > 0 && (
          <div className="mb-4 text-sm text-gray-600 flex justify-between items-center">
            <div>
              Showing {table.getRowModel().rows.length} of {courses.length} courses 
              (Total: {pagination.total})
              {hasMore && (
                <span className="ml-2 text-indigo-600">
                  (scroll down for more)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
          </div>
        )}

        <Table 
          table={table} 
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreCourses}
        />
        
        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-700 flex justify-between items-center">
          <div>
            {(columnFilters.length > 0 || localFilters.search) ? (
              <>
                Filtered: {table.getRowModel().rows.length} results
                <span className="ml-2 text-blue-600">(from {courses.length} loaded courses)</span>
              </>
            ) : (
              `Showing ${table.getRowModel().rows.length} courses`
            )}
          </div>
          
          {Object.keys(rowSelection).length > 0 && (
            <div className="text-indigo-600">
              {Object.keys(rowSelection).length} selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;