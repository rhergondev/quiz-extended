import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useCourses } from '../components/hooks/useCourses';
import { useCategories } from '../components/hooks/useCategories';
import ResourceActionBar from '../components/common/ResourceActionBar';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import BatchActions from '../components/common/BatchActions';
import CourseCreateModal from '../components/courses/CourseCreateModal';

const statuses = ["publish", "draft", "disabled"];

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

  // Load dynamic categories
  const { 
    categories, 
    isLoading: categoriesLoading, 
    error: categoriesError,
    refreshCategories 
  } = useCategories();
  
  const [rowSelection, setRowSelection] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [batchOperationStatus, setBatchOperationStatus] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Simplified filter states - only search, status, and category
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: ''
  });

  // Local filter states for UI (these update immediately)
  const [localFilters, setLocalFilters] = useState(filters);

  // Table filters for client-side filtering (only category since it's not server-side)
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  // Debounced search effect - applies server filters after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      const serverFilters = {
        search: localFilters.search.trim(),
        status: localFilters.status || 'publish,draft'
      };
      
      // Only refresh if server filters actually changed
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
      },
      {
        accessorKey: 'date',
        header: 'Published Date',
        cell: ({ row }) => (
          new Date(row.original.date || Date.now()).toLocaleDateString()
        ),
      },
      {
        accessorKey: 'meta._start_date',
        header: 'Start Date',
        cell: ({ row }) => (
            row.original.meta?._start_date 
              ? new Date(row.original.meta._start_date).toLocaleDateString() 
              : 'N/A'
        ),
      },
      {
        accessorKey: 'meta._end_date',
        header: 'End Date',
        cell: ({ row }) => (
            row.original.meta?._end_date 
              ? new Date(row.original.meta._end_date).toLocaleDateString() 
              : 'N/A'
        ),
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
      },
      {
        accessorKey: 'meta._course_category',
        header: 'Category',
        cell: ({ getValue }) => {
          const categoryName = getValue();
          const category = categories.find(cat => cat.name === categoryName);
          
          return (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {categoryName || 'Uncategorized'}
              </span>
              {category && category.count > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {category.count}
                </span>
              )}
            </div>
          );
        },
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
    [categories]
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

  // Get selected rows
  const selectedRows = table.getSelectedRowModel().rows;

  // Course creation handlers
  const handleNewCourse = () => {
    setShowCreateModal(true);
  };

  const handleCourseCreated = async (courseData) => {
    setIsCreating(true);
    try {
      await addCourse(courseData);
      console.log('✅ Course created successfully');
      
      // Refresh categories to update counts
      refreshCategories();
    } catch (error) {
      console.error('❌ Failed to create course:', error);
      throw error; // Re-throw so the modal can handle it
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await removeCourse(id);
      console.log('✅ Course deleted successfully');
      
      // Refresh categories to update counts
      refreshCategories();
    } catch (error) {
      console.error('❌ Failed to delete course:', error);
      alert(`Failed to delete course: ${error.message}`);
    }
  };

  const handleEditCourse = (id) => {
    console.log('Edit course:', id);
    // TODO: Implement edit functionality
  };

  // Batch action handlers
  const handleBatchActionStart = (actionType, count) => {
    setBatchOperationStatus({
      type: actionType,
      status: 'processing',
      count,
      message: `Processing ${actionType} for ${count} courses...`
    });
  };

  const handleBatchActionComplete = (actionType, results) => {
    const { successful = [], failed = [], error } = results;
    
    if (error) {
      setBatchOperationStatus({
        type: actionType,
        status: 'error',
        message: `Batch ${actionType} failed: ${error}`,
        count: failed.length
      });
    } else {
      setBatchOperationStatus({
        type: actionType,
        status: 'success',
        successful: successful.length,
        failed: failed.length,
        message: `Batch ${actionType} completed: ${successful.length} successful${failed.length > 0 ? `, ${failed.length} failed` : ''}`
      });

      // Refresh data after successful operations
      if (successful.length > 0) {
        if (actionType === 'delete') {
          // Remove deleted courses from local state
          refreshCourses({ search: filters.search, status: filters.status });
        } else {
          // For status/category updates, refresh to get updated data
          refreshCourses({ search: filters.search, status: filters.status });
        }
        
        // Clear row selection
        setRowSelection({});
        
        // Refresh categories to update counts
        refreshCategories();
      }
    }

    // Auto-clear status after 5 seconds
    setTimeout(() => {
      setBatchOperationStatus(null);
    }, 5000);
  };

  // Simplified filter handlers
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalFilters(prev => ({ ...prev, search: value }));
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setLocalFilters(prev => ({ ...prev, status: value }));
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setLocalFilters(prev => ({ ...prev, category: value }));
    
    // Apply category filter to table (client-side)
    setColumnFilters(prev => [
      ...prev.filter(filter => filter.id !== 'meta._course_category'),
      ...(value ? [{ id: 'meta._course_category', value }] : [])
    ]);
  };

  const clearAllFilters = () => {
    setLocalFilters({
      search: '',
      status: '',
      category: ''
    });
    setColumnFilters([]);
    setGlobalFilter('');
    
    // Refresh with empty server filters
    refreshCourses({ search: '', status: 'publish,draft' });
  };

  // Check if any filters are active
  const hasActiveFilters = localFilters.search || 
                          (localFilters.status && localFilters.status !== 'publish,draft') || 
                          localFilters.category;

  return (
    <div className="wrap">
      {/* Categories Error Display */}
      {categoriesError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ Could not load categories from database. Using fallback categories.
          </p>
        </div>
      )}

      {/* Batch Operation Status */}
      {batchOperationStatus && (
        <div className={`mb-4 p-4 border rounded-md ${
          batchOperationStatus.status === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : batchOperationStatus.status === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {batchOperationStatus.status === 'processing' && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
              )}
              <span className="text-sm font-medium">{batchOperationStatus.message}</span>
            </div>
            <button
              onClick={() => setBatchOperationStatus(null)}
              className="text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <ResourceActionBar
        title="Courses"
        buttonText={isCreating ? "Creating..." : "New Course"}
        onButtonClick={handleNewCourse}
      >
        {/* Filter Controls and Batch Actions */}
        <div className="space-y-4">
          {/* Main Filter Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-80">
              <input
                type="text"
                value={localFilters.search}
                onChange={handleSearchChange}
                placeholder="Search courses by title or content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400"
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
            </select>

            {/* Dynamic Category Filter */}
            <select
              value={localFilters.category}
              onChange={handleCategoryChange}
              disabled={categoriesLoading}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
            >
              <option value="">
                {categoriesLoading ? 'Loading categories...' : 'All Categories'}
              </option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name} {category.count > 0 && `(${category.count})`}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline focus:outline-none"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Batch Actions Row */}
          <div className="flex justify-between items-center">
            <div>
              <BatchActions
                selectedRows={selectedRows}
                categories={categories}
                onActionStart={handleBatchActionStart}
                onActionComplete={handleBatchActionComplete}
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {localFilters.search && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{localFilters.search}"
                  <button
                    onClick={() => setLocalFilters(prev => ({ ...prev, search: '' }))}
                    className="ml-1.5 text-blue-600 hover:text-blue-800 font-bold"
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
                    className="ml-1.5 text-green-600 hover:text-green-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              {localFilters.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Category: {localFilters.category}
                  <button
                    onClick={() => {
                      setLocalFilters(prev => ({ ...prev, category: '' }));
                      setColumnFilters(prev => prev.filter(filter => filter.id !== 'meta._course_category'));
                    }}
                    className="ml-1.5 text-purple-600 hover:text-purple-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
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
                  • Scroll down to load more
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-4">
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              {!categoriesLoading && categories.length > 0 && (
                <span>• {categories.length} categories available</span>
              )}
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
            {hasActiveFilters ? (
              <>
                Filtered: {table.getRowModel().rows.length} results
                <span className="ml-2 text-blue-600">(from {courses.length} loaded courses)</span>
              </>
            ) : (
              `Showing ${table.getRowModel().rows.length} courses`
            )}
          </div>
          
          {Object.keys(rowSelection).length > 0 && (
            <div className="text-indigo-600 font-medium">
              {Object.keys(rowSelection).length} selected
            </div>
          )}
        </div>
      </div>

      {/* Course Creation Modal */}
      <CourseCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCourseCreated={handleCourseCreated}
        categories={categories}
        isCreating={isCreating}
      />
    </div>
  );
};

export default CoursesPage;