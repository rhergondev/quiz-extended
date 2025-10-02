// src/components/common/SearchInput.jsx (Updated)

import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * A reusable search input component with a right-aligned icon and a clear button.
 *
 * @param {object} props
 * @param {string} props.value - The current value of the search input.
 * @param {Function} props.onChange - Callback function when the input value changes. It receives the event object.
 * @param {Function} props.onClear - Callback function to clear the input.
 * @param {string} [props.placeholder='Search...'] - The placeholder text for the input.
 * @param {boolean} [props.isLoading=false] - If true, shows a loading spinner instead of the search icon.
 * @param {string} [props.className] - Additional CSS classes for the container div.
 */
const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  isLoading = false,
  className = ''
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        // ❇️ CHANGE: Padding adjusted for right-aligned icons
        className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {isLoading ? (
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          // ❇️ MOVED: Search icon is now on the right
          <Search className="h-5 w-5 text-gray-400" />
        )}
      </div>
    </div>
  );
};

export default SearchInput;