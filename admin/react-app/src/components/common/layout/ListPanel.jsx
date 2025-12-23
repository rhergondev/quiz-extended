import React, { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import QEButton from '../QEButton';

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
  const { getColor, isDarkMode } = useTheme();
  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  };

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
    <div 
      className="rounded-2xl flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: pageColors.bgCard,
        border: `1px solid ${pageColors.cardBorder}`,
        boxShadow: pageColors.shadow,
      }}
    >
      {/* Cabecera con título, botón y filtros */}
      <div className="p-5" style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: pageColors.text }}>
              {title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: pageColors.textMuted }}>
              {itemCount} elementos
            </p>
          </div>
          <QEButton
            variant="primary"
            size="md"
            onClick={onCreate}
            disabled={isCreating}
          >
            {isCreating ? t('common.creating') : createButtonText}
          </QEButton>
        </div>
        {/* Espacio para los filtros y la búsqueda */}
        {filters}
      </div>

      {/* Cuerpo de la lista */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2">
        {children}
        
        {/* Sentinel para scroll infinito */}
        {onLoadMore && (
          <div ref={sentinelRef} className="py-4 text-center">
            {isLoadingMore && (
              <p className="text-sm" style={{ color: pageColors.textMuted }}>
                {t('common.loadingMore')}
              </p>
            )}
            {!hasMore && !isLoadingMore && itemCount > 0 && (
              <p className="text-sm" style={{ color: pageColors.textMuted }}>
                {t('common.endOfList')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListPanel;