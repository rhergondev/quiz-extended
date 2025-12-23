import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Componente reutilizable para la barra de búsqueda y filtros desplegables.
 * @param {object} props
 * @param {object} props.searchConfig - Configuración para el input de búsqueda.
 * @param {object[]} props.filtersConfig - Array de configuraciones para los selectores de filtro.
 */
const FilterBar = ({ searchConfig, filtersConfig = [] }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // pageColors pattern
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

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
          <Search className="w-5 h-5" style={{ color: pageColors.textMuted }} />
        </span>
        <input
          type="text"
          value={searchConfig.value}
          onChange={searchConfig.onChange}
          placeholder={searchConfig.placeholder || t('common.search')}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
          style={{
            backgroundColor: pageColors.inputBg,
            borderColor: pageColors.border,
            color: pageColors.text
          }}
        />
        {searchConfig.isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: pageColors.accent }}></div>
            </div>
        )}
      </div>

      {/* Filter Button and Popover */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full md:w-auto px-4 py-2 border rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: pageColors.bgCard,
            borderColor: pageColors.border,
            color: pageColors.text
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = pageColors.hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = pageColors.bgCard}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('common.filter')}
        </button>

        {isFilterOpen && (
          <div 
            className="absolute top-full right-0 mt-2 w-72 border rounded-lg shadow-xl z-10"
            style={{
              backgroundColor: pageColors.bgCard,
              borderColor: pageColors.border
            }}
          >
            <div className="p-4 space-y-4">
              <h4 className="font-semibold" style={{ color: pageColors.text }}>{t('common.filter')}</h4>
              {filtersConfig.filter(filter => filter && filter.value !== undefined && filter.options).map((filter, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>{filter.label || `Filter ${index + 1}`}</label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    disabled={filter.isLoading}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={{
                      backgroundColor: pageColors.inputBg,
                      borderColor: pageColors.border,
                      color: pageColors.text
                    }}
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