import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xs: 'px-2 py-1 text-xs',
};

/**
 * A reusable button component enhanced with variants, sizes, loading
 * state, and icons.
 * Uses `React.forwardRef` to allow passing a ref to the underlying <button> element.
 * @param {object} props - Props for the button component.
 * @param {React.ReactNode} props.children - Button label or content.
 * @param {string} [props.variant='primary'] - Button variant: 'primary', 'secondary', 'danger'.
 * @param {string} [props.size='md'] - Button size: 'xs', 'sm', 'md', 'lg'.
 * @param {string} [props.type='button'] - Button type attribute.
 * @param {string} [props.className] - Additional custom classes.
 * @param {boolean} [props.isLoading=false] - Loading state.
 * @param {string} [props.loadingText] - Custom loading text.
 * @param {React.Component} [props.iconLeft] - Icon component to display on the left.
 * @param {React.Component} [props.iconRight] - Icon component to display on the right.
 * @param {object} ref - Ref forwarded to the button element.
 * @returns {JSX.Element} The rendered button component.
 */
const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      type = 'button',
      className = '',
      isLoading = false,
      loadingText: customLoadingText,
      iconLeft: IconLeft,
      iconRight: IconRight,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    const { getColor, isDarkMode } = useTheme();
    const loadingText = customLoadingText || t('common.loading');

    const pageColors = {
      primary: getColor('primary', '#3b82f6'),
      accent: getColor('accent', '#f59e0b'),
      text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
      textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
      inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
      border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    };

    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-75 disabled:cursor-not-allowed';

    // Generar estilos dinámicos según el variant
    const getVariantStyle = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: pageColors.primary,
            color: '#ffffff',
            borderColor: pageColors.primary,
          };
        case 'secondary':
          return {
            backgroundColor: pageColors.inputBg,
            color: pageColors.text,
            border: `1px solid ${pageColors.border}`,
          };
        case 'danger':
          return {
            backgroundColor: '#dc2626',
            color: '#ffffff',
            borderColor: '#dc2626',
          };
        default:
          return {
            backgroundColor: pageColors.primary,
            color: '#ffffff',
            borderColor: pageColors.primary,
          };
      }
    };

    const variantStyle = getVariantStyle();
    
    const buttonClasses = `${baseStyles} ${sizeStyles[size]} ${className}`;

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        style={variantStyle}
        disabled={isLoading || props.disabled}
        onMouseEnter={(e) => {
          if (!isLoading && !props.disabled) {
            if (variant === 'secondary') {
              e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading && !props.disabled) {
            e.currentTarget.style.backgroundColor = variantStyle.backgroundColor;
          }
        }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={`animate-spin h-4 w-4 ${loadingText ? 'mr-2' : ''}`} />
            {loadingText}
          </>
        ) : (
          <>
            {IconLeft && <IconLeft className="h-4 w-4 mr-2" />}
            {children}
            {IconRight && <IconRight className="h-4 w-4 ml-2" />}
          </>
        )}
      </button>
    );
  }
);

export default Button;