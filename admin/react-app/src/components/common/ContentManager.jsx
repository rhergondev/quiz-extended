import React, { useState } from 'react';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import StatisticsBar from './StatisticsBar.jsx';
import ViewModeToggle from './ViewModeToggle.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';

/**
 * Componente genérico para gestores de contenido (Lessons, Courses, etc.)
 * 
 * @param {Object} props
 * @param {string} props.title - Título principal del gestor
 * @param {string} [props.description] - Descripción del gestor
 * @param {string} props.createButtonText - Texto del botón de crear
 * @param {Function} props.onCreateClick - Callback para crear nuevo elemento
 * @param {Array} props.statistics - Array de estadísticas para mostrar
 * @param {Array} props.items - Array de elementos a mostrar
 * @param {boolean} [props.loading=false] - Estado de carga
 * @param {string} [props.viewMode='cards'] - Modo de vista actual
 * @param {Function} [props.onViewModeChange] - Callback para cambiar modo de vista
 * @param {Array} [props.viewModes] - Modos de vista disponibles
 * @param {React.Component} props.children - Contenido principal (lista/grid de elementos)
 * @param {React.Component} [props.emptyStateComponent] - Componente de estado vacío personalizado
 * @param {React.Component} [props.filtersComponent] - Componente de filtros personalizado
 * @param {Object} [props.emptyState] - Configuración del estado vacío
 * @param {React.Component} [props.emptyState.icon] - Icono del estado vacío
 * @param {string} [props.emptyState.title] - Título del estado vacío
 * @param {string} [props.emptyState.description] - Descripción del estado vacío
 * @param {string} [props.emptyState.actionText] - Texto del botón del estado vacío
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {boolean} [props.showStatistics=true] - Si mostrar la barra de estadísticas
 * @param {boolean} [props.showViewToggle=true] - Si mostrar el toggle de vista
 * @param {boolean} [props.showCreateButton=true] - Si mostrar el botón de crear
 * @param {boolean} [props.showItemCount=true] - Si mostrar el contador de elementos
 */
const ContentManager = ({
  title,
  description,
  createButtonText,
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
  // Configuración por defecto del estado vacío
  const defaultEmptyState = {
    title: `No ${title.toLowerCase()} found`,
    description: `You haven't created any ${title.toLowerCase()} yet.`,
    actionText: createButtonText,
    ...emptyState
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
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
              {createButtonText}
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
              `${items.length} ${title.toLowerCase()}${items.length !== 1 ? 's' : ''} found`
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
          <LoadingSpinner size="lg" message={`Loading ${title.toLowerCase()}...`} />
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
              <LoadingSpinner size="sm" message={`Loading more ${title.toLowerCase()}...`} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentManager;