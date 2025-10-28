import React from 'react';

/**
 * QEButton
 * A theme-aware button that prefers CSS variables defined by ThemeContext/theme.css
 * Props:
 * - variant: 'primary' | 'secondary' | 'accent' | 'ghost' (default: 'primary')
 * - children, className, style, onClick, disabled, ...rest
 */
const VARIANT_CLASS = {
  primary: 'qe-btn-primary',
  secondary: 'qe-btn-secondary',
  accent: 'qe-btn-accent',
  ghost: 'qe-btn-ghost'
};

const QEButton = ({ variant = 'primary', className = '', style = {}, children, disabled, ...rest }) => {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;

  return (
    <button
      type="button"
      className={`${variantClass} ${className}`.trim()}
      style={style}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default QEButton;
