import React from 'react';
import { Sun, Moon, Trash2, Copy, Download } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import QEButton from '../QEButton';

/**
 * Header compartido para todos los Managers
 * Incluye toggle de dark mode y acciones batch
 */
const ManagerHeader = ({ 
  selectedCount = 0,
  onDeleteSelected,
  onDuplicateSelected,
  onExportSelected,
  batchActionsConfig = {} // { showDelete, showDuplicate, showExport }
}) => {
  const { isDarkMode, toggleDarkMode, getColor } = useTheme();

  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  };

  const {
    showDelete = true,
    showDuplicate = true,
    showExport = false
  } = batchActionsConfig;

  const hasBatchActions = selectedCount > 0 && (showDelete || showDuplicate || showExport);

  return (
    <div 
      className="flex items-center justify-between px-6 py-4"
      style={{ 
        borderBottom: `1px solid ${pageColors.cardBorder}`,
        backgroundColor: pageColors.bgCard,
        boxShadow: pageColors.shadowSm
      }}
    >
      {/* Lado izquierdo: Contador de selección o vacío */}
      <div className="flex items-center gap-4">
        {selectedCount > 0 && (
          <span className="text-sm font-medium" style={{ color: pageColors.text }}>
            {selectedCount} {selectedCount === 1 ? 'seleccionada' : 'seleccionadas'}
          </span>
        )}
      </div>

      {/* Lado derecho: Batch actions + Dark mode toggle */}
      <div className="flex items-center gap-2">
        {/* Batch Actions */}
        {hasBatchActions && (
          <>
            {showDuplicate && onDuplicateSelected && (
              <QEButton
                variant="ghost"
                size="sm"
                onClick={onDuplicateSelected}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </QEButton>
            )}
            
            {showExport && onExportSelected && (
              <QEButton
                variant="ghost"
                size="sm"
                onClick={onExportSelected}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </QEButton>
            )}

            {showDelete && onDeleteSelected && (
              <QEButton
                variant="ghost"
                size="sm"
                onClick={onDeleteSelected}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </QEButton>
            )}

            {/* Separador visual */}
            <div 
              className="w-px h-6 mx-2" 
              style={{ backgroundColor: pageColors.border }}
            />
          </>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-xl transition-all duration-200"
          style={{
            backgroundColor: pageColors.inputBg,
            border: `1px solid ${pageColors.cardBorder}`,
            color: pageColors.text,
            boxShadow: pageColors.shadowSm
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.inputBg;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ManagerHeader;
