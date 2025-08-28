import React, { useState, useMemo } from 'react';
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
  const { courses, isLoading, addCourse, removeCourse } = useCourses();
  const [columnFilters, setColumnFilters] = useState([]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

    const titleFilter = columnFilters.find(f => f.id === 'title.rendered')?.value || '';


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
      // --- COLUMNA "PUBLISHED DATE" AÑADIDA DE NUEVO ---
      {
        accessorKey: 'date',
        header: 'Published Date',
        cell: ({ row }) => (
            new Date(row.original.date).toLocaleDateString()
        )
      },
      // --- FIN DE LA COLUMNA AÑADIDA ---
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
      columnFilters,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // ... (el resto del componente no cambia)

  const handleNewCourse = () => { /* ... */ };
  const handleDeleteCourse = (id) => { /* ... */ };
  const handleEditCourse = (id) => { /* ... */ };

   return (
    <div className="wrap">
      <ResourceActionBar
        title="Courses"
        buttonText="New Course"
        onButtonClick={handleNewCourse}
        // ... (props de acciones en lote)
      >
        {/* --- NUEVOS COMPONENTES DE FILTRO --- */}
        {/* Filtro específico para el título */}
        <input
          type="text"
          value={titleFilter}
          onChange={(e) =>
            table.getColumn('title.rendered')?.setFilterValue(e.target.value)
          }
          placeholder="Search by title..."
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
        />

        {/* Filtro específico para el estado (Dropdown) */}
        <select
          value={table.getColumn('status')?.getFilterValue() || ''}
          onChange={e => table.getColumn('status')?.setFilterValue(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
        >
            <option value="">All Statuses</option>
            <option value="publish">Published</option>
            <option value="draft">Draft</option>
        </select>
        
        {/* Aquí podríamos añadir más filtros en el futuro (fechas, on sale, etc.) */}

      </ResourceActionBar>

      <div className="p-4">
        <Table table={table} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default CoursesPage;