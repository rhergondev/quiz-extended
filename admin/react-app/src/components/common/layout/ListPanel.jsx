import React, { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Componente genérico para el panel de lista (columna izquierda).
 * @param {object} props
 * @param {string} props.title - Título del panel (ej. "Cuestionarios").
 * @param {number} props.itemCount - Número total de ítems.
 * @param {string} props.createButtonText - Texto para el botón de creación.
 * @param {Function} props.onCreate - Callback para el botón de creación.
 * @param {boolean} props.isCreating - Estado de carga para el botón de creación.
 * @param {React.ReactNode} props.children - La lista de ítems a renderizar.
 * @param {React.ReactNode} props.filters - Componentes de filtro y búsqueda.
 * @param {Function} props.onLoadMore - Callback para cargar más ítems (scroll infinito).
 * @param {boolean} props.hasMore - Indica si hay más ítems para cargar.
 * @param {boolean} props.isLoadingMore - Indica si está cargando más ítems.
 */
const ListPanel = ({ 
  title, 
  itemCount, 
  createButtonText, 
  onCreate, 
  isCreating, 
  children, 
  filters,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Configurar Intersection Observer para scroll infinito
  const handleObserver = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    if (!onLoadMore || !sentinelRef.current) return;

    const options = {
      root: scrollContainerRef.current,
      rootMargin: '100px', // Cargar 100px antes de llegar al final
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);
    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, onLoadMore]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      {/* Cabecera con título, botón y filtros */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {title} ({itemCount})
          </h2>
          <button
            onClick={onCreate}
            disabled={isCreating}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {isCreating ? t('common.creating') : createButtonText}
          </button>
        </div>
        {/* Espacio para los filtros y la búsqueda */}
        {filters}
      </div>

      {/* Cuerpo de la lista */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {children}
        
        {/* Sentinel para scroll infinito */}
        {onLoadMore && (
          <div ref={sentinelRef} className="py-4 text-center">
            {isLoadingMore && (
              <p className="text-sm text-gray-500">{t('common.loadingMore')}</p>
            )}
            {!hasMore && !isLoadingMore && itemCount > 0 && (
              <p className="text-sm text-gray-400">{t('common.endOfList')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListPanel;