import React from 'react';
import { Pen, Highlighter, Eraser, Trash2, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const DrawingToolbar = ({ 
  isActive,
  tool, 
  onToolChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onClear,
  onClose
}) => {
  const { getColor, isDarkMode } = useTheme();

  if (!isActive) return null;

  const tools = [
    { id: 'pen', icon: Pen, label: 'Lápiz' },
    { id: 'highlighter', icon: Highlighter, label: 'Subrayador' },
    { id: 'eraser', icon: Eraser, label: 'Borrador' }
  ];

  const colors = [
    '#000000', // Negro
    '#ff0000', // Rojo
    '#0000ff', // Azul
    '#00ff00', // Verde
    '#ffff00', // Amarillo
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ffa500'  // Naranja
  ];

  const widths = [
    { value: 1, label: 'Fino' },
    { value: 2, label: 'Medio' },
    { value: 4, label: 'Grueso' }
  ];

  // Dark mode colors
  const bgColor = isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff');
  const textColor = isDarkMode ? '#f9fafb' : getColor('textPrimary', '#1f2937');
  const textMuted = isDarkMode ? '#9ca3af' : getColor('textSecondary', '#6b7280');
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : getColor('borderColor', '#e5e7eb');
  const accentColor = isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6');

  return (
    <div 
      className="fixed top-20 right-4 z-50 rounded-xl shadow-2xl border-2 overflow-hidden"
      style={{
        backgroundColor: bgColor,
        borderColor: accentColor,
        maxWidth: '280px'
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between"
        style={{ 
          backgroundColor: accentColor,
          color: '#ffffff'
        }}
      >
        <span className="font-semibold text-sm">Herramientas de Dibujo</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tools */}
      <div className="p-3 space-y-3">
        {/* Tool Selection */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: textMuted }}>
            Herramienta
          </label>
          <div className="flex gap-2">
            {tools.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => onToolChange(id)}
                className="flex-1 p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1"
                style={{
                  borderColor: tool === id ? accentColor : borderColor,
                  backgroundColor: tool === id ? `${accentColor}20` : 'transparent',
                  color: tool === id ? accentColor : textColor
                }}
                title={label}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection (only for pen and highlighter) */}
        {(tool === 'pen' || tool === 'highlighter') && (
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: textMuted }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? accentColor : borderColor,
                    transform: color === c ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* Line Width */}
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: textMuted }}>
            Grosor
          </label>
          <div className="flex gap-2">
            {widths.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onLineWidthChange(value)}
                className="flex-1 py-2 px-3 rounded-lg border-2 transition-all text-xs font-medium"
                style={{
                  borderColor: lineWidth === value ? accentColor : borderColor,
                  backgroundColor: lineWidth === value ? `${accentColor}20` : 'transparent',
                  color: lineWidth === value ? accentColor : textColor
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Button */}
        <button
          onClick={onClear}
          className="w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff'
          }}
        >
          <Trash2 size={16} />
          Borrar Todo
        </button>
      </div>
    </div>
  );
};

// 🔥 FIX: Memoize DrawingToolbar to prevent unnecessary re-renders
export default React.memo(DrawingToolbar);
