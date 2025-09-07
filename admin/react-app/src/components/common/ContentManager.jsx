import React, { useState } from 'react';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import StatisticsBar from './StatisticsBar.jsx';
import ViewModeToggle from './ViewModeToggle.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Componente genérico para gestores de contenido (Lessons, Courses, etc.)
 */
const ContentManager = ({
  title = 'Items', // 🔧 FIX: Valor por defecto
  description,
  createButtonText = 'Create Item', // 🔧 FIX: Valor por defecto
  onCreateClick,
  statistics = [],
  items = [],
  loading = false,
  viewMode = 'cards',
  onViewModeChange,
  viewModes = [
    { value: 'cards', label: 'Cards' },
    { value: 'list', label: 'List' }
  ],
  children,
  emptyStateComponent,
  filtersComponent,
  emptyState,
  className = '',
  showStatistics = true,
  showViewToggle = true,
  showCreateButton = true,
  showItemCount = true
}) => {
  // 🔧 FIX: Asegurar que title sea una string válida
  const safeTitle = title || 'Item';
  const safeTitleLower = safeTitle.toLowerCase();

  // Configuración por defecto del estado vacío
  const defaultEmptyState = {
    title: `No ${safeTitleLower} found`,
    description: `You haven't created any ${safeTitleLower} yet.`,
    actionText: createButtonText || `Create ${safeTitle}`,
    ...emptyState
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{safeTitle}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {showCreateButton && (
          <div className="flex items-center space-x-3">
            <button
              onClick={onCreateClick}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createButtonText || `Create ${safeTitle}`}
            </button>
          </div>
        )}
      </div>

      {/* Filtros personalizados */}
      {filtersComponent && (
        <div className="bg-white shadow rounded-lg border border-gray-200">
          {filtersComponent}
        </div>
      )}

      {/* Barra de estadísticas */}
      {showStatistics && statistics.length > 0 && (
        <StatisticsBar stats={statistics} />
      )}

      {/* Controles inferiores */}
      <div className="flex justify-between items-center">
        {/* Contador de elementos */}
        {showItemCount && (
          <div className="text-sm text-gray-600">
            {loading ? (
              'Loading...'
            ) : (
              `${items.length} ${safeTitleLower}${items.length !== 1 ? 's' : ''} found`
            )}
          </div>
        )}

        {/* Toggle de vista */}
        {showViewToggle && onViewModeChange && (
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={onViewModeChange}
            modes={viewModes}
          />
        )}
      </div>

      {/* Contenido principal */}
      {loading && items.length === 0 ? (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" message={`Loading ${safeTitleLower}...`} />
        </div>
      ) : items.length === 0 ? (
        emptyStateComponent || (
          <EmptyState
            icon={defaultEmptyState.icon}
            title={defaultEmptyState.title}
            description={defaultEmptyState.description}
            actionText={defaultEmptyState.actionText}
            onAction={onCreateClick}
          />
        )
      ) : (
        <>
          {/* Grid/Lista de elementos */}
          <div className={
            viewMode === 'cards'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {children}
          </div>

          {/* Loading indicator para cargas adicionales */}
          {loading && items.length > 0 && (
            <div className="text-center py-4">
              <LoadingSpinner size="sm" message={`Loading more ${safeTitleLower}...`} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentManager;