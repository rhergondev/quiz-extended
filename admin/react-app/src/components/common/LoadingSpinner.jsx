import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente reutilizable para mostrar estados de carga
 * 
 * @param {Object} props
 * @param {string} [props.size='default'] - Tamaño del spinner ('xs', 'sm', 'default', 'lg', 'xl')
 * @param {string} [props.message] - Mensaje de carga opcional
 * @param {string} [props.variant='default'] - Variante de color ('default', 'primary', 'white')
 * @param {boolean} [props.centered=true] - Si debe centrarse en el contenedor
 * @param {string} [props.className] - Clases CSS adicionales
 * @param {boolean} [props.fullScreen=false] - Si debe ocupar toda la pantalla
 * @param {boolean} [props.overlay=false] - Si debe mostrar un overlay de fondo
 */
const LoadingSpinner = ({
  size = 'default',
  message,
  variant = 'default',
  centered = true,
  className = '',
  fullScreen = false,
  overlay = false
}) => {
  // Configuraciones de tamaño
  const sizeConfig = {
    xs: {
      spinner: 'h-3 w-3',
      text: 'text-xs'
    },
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-sm'
    },
    default: {
      spinner: 'h-6 w-6',
      text: 'text-base'
    },
    lg: {
      spinner: 'h-8 w-8',
      text: 'text-lg'
    },
    xl: {
      spinner: 'h-12 w-12',
      text: 'text-xl'
    }
  };

  // Configuraciones de variante de color
  const variantConfig = {
    default: {
      spinner: 'text-gray-400',
      text: 'text-gray-600'
    },
    primary: {
      spinner: 'text-indigo-600',
      text: 'text-indigo-600'
    },
    white: {
      spinner: 'text-white',
      text: 'text-white'
    }
  };

  const sizeStyles = sizeConfig[size];
  const variantStyles = variantConfig[variant];

  // Clases del contenedor
  const containerClasses = [
    centered && 'flex flex-col items-center justify-center',
    fullScreen && 'fixed inset-0 z-50',
    fullScreen && overlay && 'bg-black bg-opacity-50',
    !fullScreen && centered && 'py-8',
    className
  ].filter(Boolean).join(' ');

  // Clases del contenido
  const contentClasses = [
    'flex flex-col items-center justify-center',
    message ? 'space-y-3' : '',
    fullScreen && 'bg-white rounded-lg p-8 shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Spinner animado */}
        <Loader2 
          className={`${sizeStyles.spinner} ${variantStyles.spinner} animate-spin`}
        />
        
        {/* Mensaje de carga */}
        {message && (
          <p className={`${sizeStyles.text} ${variantStyles.text} font-medium`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;