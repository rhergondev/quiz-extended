import React from 'react';

/**
 * Componente genérico para toggle entre diferentes modos de vista
 * 
 * @param {Object} props
 * @param {string} props.currentMode - Modo actual seleccionado
 * @param {Function} props.onModeChange - Callback cuando cambia el modo
 * @param {Array} props.modes - Array de modos disponibles
 * @param {string} props.modes[].value - Valor del modo
 * @param {string} props.modes[].label - Etiqueta a mostrar
 * @param {React.Component} [props.modes[].icon] - Icono opcional del modo
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {string} [props.size='sm'] - Tamaño del toggle ('xs', 'sm', 'md', 'lg')
 */
const ViewModeToggle = ({ 
  currentMode, 
  onModeChange, 
  modes = [],
  className = '',
  size = 'sm'
}) => {
  if (!modes.length) return null;

  const sizeClasses = {
    xs: 'p-1 text-xs',
    sm: 'p-2 text-sm', 
    md: 'p-3 text-base',
    lg: 'p-4 text-lg'
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  };

  return (
    <div className={`flex items-center border border-gray-200 rounded-lg p-1 ${className}`}>
      {modes.map((mode) => {
        const IconComponent = mode.icon;
        const isActive = currentMode === mode.value;
        
        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={`${sizeClasses[size]} rounded flex items-center space-x-1 transition-colors ${
              isActive
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            title={`Switch to ${mode.label} view`}
          >
            {IconComponent && (
              <IconComponent className={iconSizes[size]} />
            )}
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewModeToggle;