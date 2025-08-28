import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

/**
 * A generic and reusable "headless" table component with infinite scroll support.
 * Renders a table based on the table instance provided by @tanstack/react-table.
 *
 * @param {object} props
 * @param {import('@tanstack/react-table').Table} props.table - The TanStack table instance.
 * @param {boolean} [props.isLoading=false] - If true, shows a loading state.
 * @param {boolean} [props.isLoadingMore=false] - If true, shows loading more indicator.
 * @param {boolean} [props.hasMore=false] - If true, indicates more data is available.
 * @param {function} [props.onLoadMore] - Function to call when more data should be loaded.
 */
const Table = ({ 
  table, 
  isLoading = false, 
  isLoadingMore = false, 
  hasMore = false, 
  onLoadMore 
}) => {
  // Set up infinite scroll
  const { containerRef } = useInfiniteScroll(
    onLoadMore || (() => {}), 
    hasMore, 
    isLoadingMore,
    100 // threshold: trigger when 100px from bottom
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  // Check if we have data to display
  const hasData = table.getRowModel().rows.length > 0;

  if (!hasData && !isLoadingMore) {
    return (
      <div className="flex justify-center items-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No data available.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="overflow-auto shadow-md sm:rounded-lg"
      style={{ 
        maxHeight: '600px', // Set a fixed height for the scrollable container
        overflowY: 'auto'
      }}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                  style={{ 
                    paddingLeft: header.id === 'select' ? '1rem' : undefined, 
                    paddingRight: header.id === 'select' ? '1rem' : undefined 
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                  style={{ 
                    paddingLeft: cell.column.id === 'select' ? '1rem' : undefined, 
                    paddingRight: cell.column.id === 'select' ? '1rem' : undefined 
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center items-center p-4 bg-white border-t">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-gray-500">Loading more courses...</span>
          </div>
        </div>
      )}
      
      {/* End of data indicator */}
      {!hasMore && hasData && !isLoadingMore && (
        <div className="flex justify-center items-center p-4 bg-gray-50 border-t">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-500">All courses loaded</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;