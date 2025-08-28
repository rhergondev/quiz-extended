// admin/react-app/src/components/common/AdvancedFilterPanel.jsx

import React, { useState } from 'react';
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from 'lucide-react';

const AdvancedFilterPanel = ({ 
  table,
  filters,
  onFiltersChange,
  onClearAllFilters,
  isVisible = false,
  onToggleVisibility 
}) => {
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState('');

  // Available filter options
  const categories = [
    "Web Development", "Backend Development", "Frontend Development",
    "Full Stack", "DevOps", "Design", "Data Science", 
    "Mobile Development", "Security"
  ];
  
  const difficulties = ["Beginner", "Intermediate", "Advanced"];

  // Save current filter configuration
  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    
    const currentState = {
      name: filterName,
      filters: { ...filters },
      columnFilters: table.getState().columnFilters,
      globalFilter: table.getState().globalFilter,
      timestamp: new Date().toISOString()
    };
    
    setSavedFilters(prev => [...prev, currentState]);
    setFilterName('');
    
    // Save to localStorage
    const allSaved = [...savedFilters, currentState];
    localStorage.setItem('courseFilters', JSON.stringify(allSaved));
  };

  // Load saved filter configuration
  const handleLoadFilter = (savedFilter) => {
    onFiltersChange(savedFilter.filters);
    
    // Apply column filters
    savedFilter.columnFilters.forEach(filter => {
      table.getColumn(filter.id)?.setFilterValue(filter.value);
    });
    
    // Apply global filter
    if (savedFilter.globalFilter) {
      table.setGlobalFilter(savedFilter.globalFilter);
    }
  };

  // Delete saved filter
  const handleDeleteSavedFilter = (index) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    localStorage.setItem('courseFilters', JSON.stringify(updated));
  };

  // Load saved filters on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('courseFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved filters:', e);
      }
    }
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <FunnelIcon className="w-4 h-4 mr-2" />
        Advanced Filters
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FunnelIcon className="w-5 h-5 mr-2 text-indigo-600" />
          Advanced Filters
        </h3>
        <button
          onClick={onToggleVisibility}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Published Date Range
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.dateRange?.start || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: { ...filters.dateRange, start: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                dateRange: { ...filters.dateRange, end: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Start Date Range Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Course Start Date Range
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.startDateRange?.start || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                startDateRange: { ...filters.startDateRange, start: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="date"
              value={filters.startDateRange?.end || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                startDateRange: { ...filters.startDateRange, end: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Duration Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Duration (weeks)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.durationRange?.min || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                durationRange: { ...filters.durationRange, min: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.durationRange?.max || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                durationRange: { ...filters.durationRange, max: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Max Students Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Max Students
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.maxStudentsRange?.min || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                maxStudentsRange: { ...filters.maxStudentsRange, min: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxStudentsRange?.max || ''}
              onChange={(e) => onFiltersChange({
                ...filters,
                maxStudentsRange: { ...filters.maxStudentsRange, max: e.target.value }
              })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Multi-select Category Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Categories (Multi-select)
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded">
            {categories.map((category) => (
              <label key={category} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories?.includes(category) || false}
                  onChange={(e) => {
                    const currentCategories = filters.categories || [];
                    const updatedCategories = e.target.checked
                      ? [...currentCategories, category]
                      : currentCategories.filter(c => c !== category);
                    
                    onFiltersChange({
                      ...filters,
                      categories: updatedCategories
                    });
                  }}
                  className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Multi-select Difficulty Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Difficulty Levels
          </label>
          <div className="space-y-2">
            {difficulties.map((difficulty) => (
              <label key={difficulty} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.difficulties?.includes(difficulty) || false}
                  onChange={(e) => {
                    const currentDifficulties = filters.difficulties || [];
                    const updatedDifficulties = e.target.checked
                      ? [...currentDifficulties, difficulty]
                      : currentDifficulties.filter(d => d !== difficulty);
                    
                    onFiltersChange({
                      ...filters,
                      difficulties: updatedDifficulties
                    });
                  }}
                  className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className={`text-sm px-2 py-1 rounded ${
                  difficulty === 'Beginner' 
                    ? 'bg-blue-100 text-blue-800'
                    : difficulty === 'Intermediate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {difficulty}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onFiltersChange({
            ...filters,
            priceRange: { min: '', max: '50' }
          })}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
        >
          Budget Courses (Under $50)
        </button>
        <button
          onClick={() => onFiltersChange({
            ...filters,
            priceRange: { min: '100', max: '' }
          })}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
        >
          Premium Courses ($100+)
        </button>
        <button
          onClick={() => onFiltersChange({
            ...filters,
            durationRange: { min: '', max: '8' }
          })}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Short Courses (≤8 weeks)
        </button>
        <button
          onClick={() => onFiltersChange({
            ...filters,
            durationRange: { min: '12', max: '' }
          })}
          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
        >
          Long Courses (12+ weeks)
        </button>
      </div>

      {/* Save/Load Filters Section */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Saved Filters</h4>
          <button
            onClick={onClearAllFilters}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Clear All Filters
          </button>
        </div>
        
        {/* Save Current Filter */}
        <div className="flex space-x-2 mb-3">
          <input
            type="text"
            placeholder="Filter name..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSaveFilter}
            disabled={!filterName.trim()}
            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>

        {/* Saved Filters List */}
        {savedFilters.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {savedFilters.map((savedFilter, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <button
                  onClick={() => handleLoadFilter(savedFilter)}
                  className="text-sm text-left text-gray-700 hover:text-gray-900 flex-1"
                >
                  {savedFilter.name}
                  <span className="block text-xs text-gray-500">
                    {new Date(savedFilter.timestamp).toLocaleDateString()}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteSavedFilter(index)}
                  className="text-xs text-red-600 hover:text-red-800 ml-2"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilterPanel;