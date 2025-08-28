import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useCourses } from '../components/hooks/useCourses';
import ResourceActionBar from '../components/common/ResourceActionBar';
import Table from '../components/common/Table';
import Button from '../components/common/Button';

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

  // Local filter states for the UI
  const [titleFilter, setTitleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = {
        search: titleFilter.trim(),
        status: statusFilter || 'publish,draft'
      };
      
      refreshCourses(filters);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [titleFilter, statusFilter]); // Remove refreshCourses from dependencies

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
      },
      {
        accessorKey: 'title.rendered',
        header: 'Title',
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-800">
              {row.original.title.rendered || 'No Title'}
            </span>
            {row.original.meta?._sale_price && parseFloat(row.original.meta._sale_price) < parseFloat(row.original.meta._price) && (
              <span className="px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 border border-green-800 rounded-full">
                On Sale
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'enrolled_users_count',
        header: 'Enrolled',
      },
      {
        accessorKey: 'date',
        header: 'Published Date',
        cell: ({ row }) => (
            new Date(row.original.date).toLocaleDateString()
        )
      },
      {
        accessorKey: 'meta._start_date',
        header: 'Start Date',
        cell: ({ row }) => (
            row.original.meta?._start_date ? new Date(row.original.meta._start_date).toLocaleDateString() : 'N/A'
        )
      },
      {
        accessorKey: 'meta._end_date',
        header: 'End Date',
        cell: ({ row }) => (
            row.original.meta?._end_date ? new Date(row.original.meta._end_date).toLocaleDateString() : 'N/A'
        )
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
      },
    ],
    []
  );

  const table = useReactTable({
    data: courses,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    // Remove getFilteredRowModel since we're filtering on the server
    // getFilteredRowModel: getFilteredRowModel(),
  });

  const handleNewCourse = () => {
    console.log('Create new course');
    // Implement course creation logic
  };
  
  const handleDeleteCourse = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await removeCourse(id);
      } catch (error) {
        alert('Failed to delete course: ' + error.message);
      }
    }
  };
  
  const handleEditCourse = (id) => {
    console.log('Edit course:', id);
    // Implement course editing logic
  };

  const handleTitleFilterChange = (e) => {
    setTitleFilter(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  return (
    <div className="wrap">
      <ResourceActionBar
        title="Courses"
        buttonText="New Course"
        onButtonClick={handleNewCourse}
      >
        {/* Title search filter */}
        <input
          type="text"
          value={titleFilter}
          onChange={handleTitleFilterChange}
          placeholder="Search by title..."
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />

        {/* Status dropdown filter */}
        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="publish">Published</option>
          <option value="draft">Draft</option>
        </select>
      </ResourceActionBar>

      <div className="p-4">
        {/* Show pagination info */}
        {pagination.total > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {courses.length} of {pagination.total} courses
            {hasMore && (
              <span className="ml-2 text-indigo-600">
                (scroll down for more)
              </span>
            )}
          </div>
        )}

        <Table 
          table={table} 
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreCourses}
        />
      </div>
    </div>
  );
};

export default CoursesPage;