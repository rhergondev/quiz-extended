import React, { useState } from 'react';
import { ChevronDownIcon, FunnelIcon } from 'lucide-react';

export const AdvancedFilters = ({ 
  table, 
  onFilterChange, 
  availableColumns = [],
  savedFilters = [],
  onSaveFilter,
  onLoadFilter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleSaveCurrentFilter = () => {
    if (!filterName) return;
    
    const currentFilters = {
      columnFilters: table.getState().columnFilters,
      globalFilter: table.getState().globalFilter,
      sorting: table.getState().sorting,
    };
    
    onSaveFilter(filterName, currentFilters);
    setFilterName('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <FunnelIcon className="w-4 h-4 mr-2" />
        Advanced Filters
        <ChevronDownIcon className={`ml-2 w-4 h-4 transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Filters</h3>
            
            {/* Column-specific filters */}
            <div className="space-y-4">
              {availableColumns.map((column) => (
                <ColumnFilter 
                  key={column.id} 
                  column={column} 
                  table={table}
                />
              ))}
            </div>

            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Filters</h4>
                <div className="space-y-2">
                  {savedFilters.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => onLoadFilter(filter)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save Current Filter */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleSaveCurrentFilter}
                  disabled={!filterName}
                  className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ColumnFilter = ({ column, table }) => {
  const columnDef = column.columnDef;
  const filterValue = column.getFilterValue();

  // Different filter types based on column data type
  const renderFilter = () => {
    switch (columnDef.meta?.filterType) {
      case 'dateRange':
        return <DateRangeFilter column={column} />;
      case 'numberRange':
        return <NumberRangeFilter column={column} />;
      case 'multiSelect':
        return <MultiSelectFilter column={column} />;
      case 'boolean':
        return <BooleanFilter column={column} />;
      default:
        return <TextFilter column={column} />;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {columnDef.header}
      </label>
      {renderFilter()}
    </div>
  );
};

const DateRangeFilter = ({ column }) => {
  const filterValue = column.getFilterValue() || [null, null];
  
  return (
    <div className="flex space-x-2">
      <input
        type="date"
        value={filterValue[0]?.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const newValue = [
            e.target.value ? new Date(e.target.value) : null,
            filterValue[1]
          ];
          column.setFilterValue(newValue[0] || newValue[1] ? newValue : undefined);
        }}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
      />
      <input
        type="date"
        value={filterValue[1]?.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const newValue = [
            filterValue[0],
            e.target.value ? new Date(e.target.value) : null
          ];
          column.setFilterValue(newValue[0] || newValue[1] ? newValue : undefined);
        }}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
};

const NumberRangeFilter = ({ column }) => {
  const filterValue = column.getFilterValue() || ['', ''];
  
  return (
    <div className="flex space-x-2">
      <input
        type="number"
        placeholder="Min"
        value={filterValue[0]}
        onChange={(e) => {
          const val = e.target.value;
          column.setFilterValue([val, filterValue[1]]);
        }}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
      />
      <input
        type="number"
        placeholder="Max"
        value={filterValue[1]}
        onChange={(e) => {
          const val = e.target.value;
          column.setFilterValue([filterValue[0], val]);
        }}
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
};

const MultiSelectFilter = ({ column }) => {
  const [selectedValues, setSelectedValues] = useState(column.getFilterValue() || []);
  const uniqueValues = Array.from(column.getFacetedUniqueValues().keys()).sort();

  const handleToggle = (value) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    setSelectedValues(newSelected);
    column.setFilterValue(newSelected.length ? newSelected : undefined);
  };

  return (
    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded">
      {uniqueValues.map((value) => (
        <label key={value} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedValues.includes(value)}
            onChange={() => handleToggle(value)}
            className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 truncate">{value}</span>
          <span className="ml-auto text-xs text-gray-500">
            ({column.getFacetedUniqueValues().get(value)})
          </span>
        </label>
      ))}
    </div>
  );
};

const TextFilter = ({ column }) => {
  const filterValue = column.getFilterValue() || '';
  
  return (
    <input
      type="text"
      value={filterValue}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder={`Filter ${column.id}...`}
      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
    />
  );
};

const BooleanFilter = ({ column }) => {
  const filterValue = column.getFilterValue();
  
  return (
    <select
      value={filterValue ?? 'all'}
      onChange={(e) => {
        const value = e.target.value;
        column.setFilterValue(value === 'all' ? undefined : value === 'true');
      }}
      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
    >
      <option value="all">All</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
};