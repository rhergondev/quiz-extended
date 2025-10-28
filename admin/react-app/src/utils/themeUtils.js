/**
 * Utilidades para trabajar con el tema personalizado
 * Estas funciones ayudan a usar los colores del tema en lugar de clases hardcodeadas
 */

/**
 * Obtiene los estilos en línea para aplicar color del tema
 * @param {string} colorType - 'primary', 'secondary', 'accent', 'background'
 * @param {string} property - 'background', 'color', 'borderColor'
 * @returns {Object} Objeto de estilos inline
 */
export const getThemeStyle = (colorType = 'primary', property = 'backgroundColor') => {
  const varName = `--qe-${colorType}`;
  
  switch (property) {
    case 'background':
    case 'backgroundColor':
      return { backgroundColor: `var(${varName})` };
    case 'color':
      return { color: `var(${varName})` };
    case 'border':
    case 'borderColor':
      return { borderColor: `var(${varName})` };
    default:
      return {};
  }
};

/**
 * Obtiene múltiples propiedades de estilo del tema
 * @param {Object} config - {bg: 'primary', text: 'secondary', border: 'accent'}
 * @returns {Object} Objeto de estilos inline combinados
 */
export const getThemeStyles = (config) => {
  const styles = {};
  
  if (config.bg) {
    styles.backgroundColor = `var(--qe-${config.bg})`;
  }
  if (config.text) {
    styles.color = `var(--qe-${config.text})`;
  }
  if (config.border) {
    styles.borderColor = `var(--qe-${config.border})`;
  }
  
  return styles;
};

/**
 * Obtiene el nombre de la variable CSS del tema
 * @param {string} colorType - 'primary', 'secondary', 'accent', etc.
 * @param {string} variant - '', 'light', 'hover'
 * @returns {string} Nombre de la variable CSS
 */
export const getThemeVar = (colorType, variant = '') => {
  const suffix = variant ? `-${variant}` : '';
  return `var(--qe-${colorType}${suffix})`;
};

/**
 * Genera clases CSS personalizadas para botones con el tema
 * Retorna un string con clases de Tailwind más estilos inline
 */
export const getButtonStyles = (variant = 'primary') => {
  return {
    className: 'px-6 py-2 text-white rounded-lg transition-colors duration-200',
    style: {
      backgroundColor: `var(--qe-${variant})`,
    },
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = `var(--qe-${variant}-hover)`;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = `var(--qe-${variant})`;
    }
  };
};

/**
 * Hook personalizado para obtener clases de utilidad del tema
 */
export const useThemeClasses = () => {
  return {
    // Botones
    btnPrimary: 'qe-btn-primary',
    btnSecondary: 'qe-btn-secondary',
    btnAccent: 'qe-btn-accent',
    
    // Backgrounds
    bgPrimary: 'qe-bg-primary',
    bgSecondary: 'qe-bg-secondary',
    bgAccent: 'qe-bg-accent',
    bgCard: 'qe-bg-card',
    
    // Texto
    textPrimary: 'qe-text-primary',
    textSecondary: 'qe-text-secondary',
    textAccent: 'qe-text-accent',
    
    // Bordes
    borderPrimary: 'qe-border-primary',
    borderSecondary: 'qe-border-secondary',
    borderAccent: 'qe-border-accent',
  };
};
