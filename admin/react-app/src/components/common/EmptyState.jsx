import React from 'react';
import Button from './Button.jsx';

/**
 * Componente reutilizable para mostrar estados vacíos en la aplicación
 * Se usa cuando no hay datos que mostrar en listas, tablas, etc.
 * 
 * @param {Object} props
 * @param {React.Component} props.icon - Icono a mostrar (componente de lucide-react)
 * @param {string} props.title - Título principal del estado vacío
 * @param {string} props.description - Descripción del estado vacío
 * @param {string} [props.actionText] - Texto del botón de acción (opcional)
 * @param {Function} [props.onAction] - Función a ejecutar al hacer clic en el botón (opcional)
 * @param {string} [props.actionVariant='primary'] - Variante del botón de acción
 * @param {string} [props.size='default'] - Tamaño del componente ('small', 'default', 'large')
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {React.ReactNode} [props.children] - Contenido adicional personalizado
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionVariant = 'primary',
  size = 'default',
  className = '',
  children
}) => {
  // Configurar tamaños
  const sizeConfig = {
    small: {
      container: 'py-6',
      icon: 'h-8 w-8',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'space-y-3'
    },
    default: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-4'
    },
    large: {
      container: 'py-20',
      icon: 'h-16 w-16',
      title: 'text-2xl',
      description: 'text-lg',
      spacing: 'space-y-6'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={`text-center ${config.container} ${className}`}>
      <div className={`mx-auto ${config.spacing}`}>
        {/* Icono */}
        {Icon && (
          <div className="mx-auto flex items-center justify-center">
            <Icon 
              className={`${config.icon} text-gray-400`}
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* Título */}
        <div>
          <h3 className={`${config.title} font-semibold text-gray-900`}>
            {title}
          </h3>
          
          {/* Descripción */}
          {description && (
            <p className={`mt-2 ${config.description} text-gray-500 max-w-sm mx-auto`}>
              {description}
            </p>
          )}
        </div>

        {/* Contenido personalizado */}
        {children}

        {/* Botón de acción */}
        {actionText && onAction && (
          <div>
            <Button
              variant={actionVariant}
              onClick={onAction}
              className="inline-flex items-center"
            >
              {actionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;