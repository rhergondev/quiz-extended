import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * Componente genérico para tarjetas que soporta vista de tarjeta y lista
 * 
 * @param {Object} props
 * @param {Object} props.item - Objeto con los datos del item
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Array} [props.actions] - Array de acciones disponibles
 * @param {string} props.actions[].label - Etiqueta de la acción
 * @param {React.Component} props.actions[].icon - Icono de la acción
 * @param {Function} props.actions[].onClick - Callback de la acción
 * @param {string} [props.actions[].color] - Color de la acción
 * @param {boolean} [props.actions[].divider] - Si mostrar divisor después
 * @param {React.Component} props.children - Contenido principal de la tarjeta
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {React.Component} [props.header] - Contenido del header personalizado
 * @param {React.Component} [props.footer] - Contenido del footer personalizado
 * @param {Function} [props.onClick] - Callback cuando se hace click en la tarjeta
 * @param {boolean} [props.clickable=false] - Si la tarjeta es clickeable
 */
const Card = ({ 
  item,
  viewMode = 'cards',
  actions = [],
  children,
  className = '',
  header,
  footer,
  onClick,
  clickable = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCardClick = (e) => {
    // Evitar que el click en el dropdown dispare el click de la tarjeta
    if (e.target.closest('.dropdown-menu') || e.target.closest('.dropdown-trigger')) {
      return;
    }
    
    if (onClick && clickable) {
      onClick(item);
    }
  };

  const handleActionClick = (action, e) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (action.onClick) {
      action.onClick(item);
    }
  };

  // Clases base para ambos modos
  const baseClasses = `bg-white border border-gray-200 transition-shadow ${
    clickable ? 'cursor-pointer hover:shadow-lg' : 'shadow-sm hover:shadow-md'
  }`;

  // Clases específicas según el modo de vista
  const modeClasses = viewMode === 'cards' 
    ? 'rounded-lg p-6' 
    : 'rounded-md p-4 flex items-center space-x-4';

  return (
    <div 
      className={`${baseClasses} ${modeClasses} ${className}`}
      onClick={handleCardClick}
    >
      {/* Header personalizado */}
      {header && (
        <div className="mb-4">
          {header}
        </div>
      )}

      {/* Contenido principal */}
      <div className={viewMode === 'list' ? 'flex-1' : ''}>
        {children}
      </div>

      {/* Footer personalizado */}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}

      {/* Menú de acciones */}
      {actions.length > 0 && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="dropdown-trigger p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {showDropdown && (
            <>
              {/* Overlay para cerrar el dropdown */}
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown menu */}
              <div className="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  {actions.map((action, index) => (
                    <React.Fragment key={index}>
                      <button
                        onClick={(e) => handleActionClick(action, e)}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-50 ${
                          action.color || 'text-gray-700'
                        }`}
                      >
                        {action.icon && <action.icon className="h-4 w-4" />}
                        <span>{action.label}</span>
                      </button>
                      {action.divider && (
                        <div className="border-t border-gray-100 my-1" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;