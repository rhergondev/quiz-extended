import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Componente reutilizable para la barra de búsqueda y filtros desplegables.
 * @param {object} props
 * @param {object} props.searchConfig - Configuración para el input de búsqueda.
 * @param {object[]} props.filtersConfig - Array de configuraciones para los selectores de filtro.
 */
const FilterBar = ({ searchConfig, filtersConfig = [] }) => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Cierra el popover si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-2">
      {/* Search Input */}
      <div className="relative flex-grow">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="w-5 h-5 text-gray-400" />
        </span>
        <input
          type="text"
          value={searchConfig.value}
          onChange={searchConfig.onChange}
          placeholder={searchConfig.placeholder || t('common.search')}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
        {searchConfig.isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            </div>
        )}
      </div>

      {/* Filter Button and Popover */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 text-gray-600 font-medium text-sm flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('common.filters')}
        </button>

        {isFilterOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
            <div className="p-4 space-y-4">
              <h4 className="font-semibold text-gray-800">{t('common.filterBy')}</h4>
              {filtersConfig.filter(filter => filter && filter.value !== undefined && filter.options).map((filter, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{filter.label || `Filter ${index + 1}`}</label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    disabled={filter.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(filter.options || []).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;