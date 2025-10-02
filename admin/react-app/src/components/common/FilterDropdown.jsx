import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * An advanced, reusable dropdown component for filtering.
 * Supports static options, dynamic fetching, and internal search.
 */
const FilterDropdown = ({
  label,
  value,
  onChange,
  options: staticOptions,
  fetchOptions,
  placeholder = 'Select an option',
  isLoading: parentIsLoading = false,
  showSearch = false,
  className = '',
  refreshTrigger 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalOptions, setInternalOptions] = useState(staticOptions || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (fetchOptions && typeof fetchOptions === 'function') {
      setIsLoading(true);
      setError(null);
      fetchOptions()
        .then(data => {
          if (Array.isArray(data)) {
            setInternalOptions(data);
          }
        })
        .catch(err => {
          console.error(`Error fetching options:`, err);
          setError('Could not load options.');
        })
        .finally(() => setIsLoading(false));
    } else if (staticOptions) {
      setInternalOptions(staticOptions);
    }
  }, [fetchOptions, staticOptions, refreshTrigger]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = useMemo(() => {
    const allOptions = internalOptions;
    const selected = allOptions.find(opt => opt.value === value);
    return selected ? selected.label : placeholder;
  }, [value, internalOptions, placeholder]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return internalOptions;
    }
    return internalOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, internalOptions]);
  
  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const totalLoading = parentIsLoading || isLoading;

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={totalLoading}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
      >
        <span className="block truncate">{totalLoading ? 'Loading...' : selectedLabel}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          {showSearch && (
            <div className="p-2 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-sm border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                  {searchTerm ? (
                    <button type="button" onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <Search className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          )}
          <ul className="py-1">
            {error ? (
              <li className="text-red-500 text-sm px-4 py-2">{error}</li>
            ) : filteredOptions.length === 0 ? (
              <li className="text-gray-500 text-sm px-4 py-2">No options found.</li>
            ) : (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-900 ${
                    value === option.value ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;