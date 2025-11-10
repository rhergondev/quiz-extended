import React from 'react';

/**
 * QEButton
 * A theme-aware button that prefers CSS variables defined by ThemeContext/theme.css
 * Props:
 * - variant: 'primary' | 'secondary' | 'accent' | 'ghost' | 'success' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - children, className, style, onClick, disabled, ...rest
 */
const VARIANT_CLASS = {
  primary: 'qe-btn-primary',
  secondary: 'qe-btn-secondary',
  accent: 'qe-btn-accent',
  ghost: 'qe-btn-ghost',
  success: 'qe-btn-success'
};

const SIZE_CLASS = {
  sm: 'qe-btn-sm',
  md: 'qe-btn-md',
  lg: 'qe-btn-lg'
};

const QEButton = ({ variant = 'primary', size = 'md', className = '', style = {}, children, disabled, ...rest }) => {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  return (
    <button
      type="button"
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
      style={style}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default QEButton;
