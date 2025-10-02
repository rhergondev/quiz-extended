import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantStyles = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

/**
 * A reusable button component enhanced with variants, sizes, loading
 * state, and icons.
 * Uses `React.forwardRef` to allow passing a ref to the underlying <button> element.
 * @param {object} props - Props for the button component.
 * @param {React.ReactNode} props.children - Button label or content.
 * @param {string} [props.variant='primary'] - Button variant: 'primary', 'secondary', 'danger'.
 * @param {string} [props.size='md'] - Button size: 'sm', 'md', 'lg'.
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
    const loadingText = customLoadingText || t('common.loading');

    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-75 disabled:cursor-not-allowed';
    
    const buttonClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={isLoading || props.disabled}
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