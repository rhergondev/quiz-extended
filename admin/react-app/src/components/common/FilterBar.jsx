// src/components/common/FilterBar.jsx (Corrected for Alignment)

import React from 'react';
import SearchInput from './SearchInput';
import FilterDropdown from './FilterDropdown';
import Button from './Button';
import { X } from 'lucide-react';

/**
 * A reusable component that renders a search input and a set of filter dropdowns.
 * (All comments in English as requested)
 */
const FilterBar = ({
  searchConfig,
  filtersConfig = [],
  onResetFilters,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* ❇️ FIX: Added 'items-end' to vertically align all filter components 
        at their bottom edge, solving the height difference.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        
        {/* Search Input */}
        {searchConfig && (
          <div className="md:col-span-2 lg:col-span-2">
            <SearchInput
              value={searchConfig.value}
              onChange={searchConfig.onChange}
              onClear={searchConfig.onClear}
              placeholder={searchConfig.placeholder || 'Search...'}
              isLoading={searchConfig.isLoading}
            />
          </div>
        )}

        {/* Dynamic Filter Dropdowns */}
        {filtersConfig.map((filter) => (
          <FilterDropdown
            key={filter.label}
            label={filter.label}
            value={filter.value}
            onChange={filter.onChange}
            options={filter.options}
            placeholder={filter.placeholder}
            isLoading={filter.isLoading}
            fetchOptions={filter.fetchOptions}
            showSearch={filter.showSearch}
          />
        ))}
      </div>

      {/* Clear Filters Button */}
      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          outline
          size="sm"
          onClick={onResetFilters}
          iconLeft={X}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;