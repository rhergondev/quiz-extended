import React from 'react';

/**
 * Un componente de botón reutilizable con variantes de estilo.
 * Acepta todas las props de un botón HTML estándar.
 *
 * @param {object} props
 * @param {('primary'|'secondary'|'danger')} [props.variant='primary'] - La variante de estilo del botón.
 * @param {React.ReactNode} props.children - El contenido del botón (texto, icono, etc.).
 * @param {string} [props.className] - Clases de Tailwind adicionales para personalizar.
 */
const Button = ({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) => {
  // --- Estilos base del botón ---
  const baseStyles =
    'px-4 py-2 rounded-md font-semibold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  // --- Variantes de estilo ---
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary:
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const buttonClasses = `${baseStyles} ${variants[variant]} ${className}`;

  return (
    <button type={type} className={buttonClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;