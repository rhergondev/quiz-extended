import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { settingsService } from '../api/services/settingsService';

const ThemeContext = createContext();

// Default theme (fallback only) - Exportado para uso en SettingsPage
export const DEFAULT_THEME = {
  light: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#f3f4f6',
    secondaryBackground: '#ffffff',
    text: '#111827',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textColorContrast: '#ffffff',
    borderColor: '#3b82f6',
    hoverColor: '#2563eb'
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#fbbf24',
    background: '#1f2937',
    secondaryBackground: '#111827',
    text: '#f9fafb',
    textPrimary: '#f9fafb',
    textSecondary: '#9ca3af',
    textColorContrast: '#ffffff',
    borderColor: '#60a5fa',
    hoverColor: '#3b82f6'
  }
};

// Hook personalizado para usar el contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// Get initial theme from WordPress (injected via wp_localize_script)
const getInitialTheme = () => {
  const wpData = window.qe_data || {};
  const theme = wpData.theme;
  
  // Validate theme structure
  if (theme && 
      theme.light && 
      theme.dark && 
      typeof theme.light === 'object' && 
      typeof theme.dark === 'object') {
    return theme;
  }
  
  // If theme is invalid or missing, use default
  console.warn('Invalid or missing theme in window.qe_data, using DEFAULT_THEME');
  return DEFAULT_THEME;
};

// Detectar si WordPress/Tema está en modo oscuro
const detectWordPressDarkMode = () => {
  // 1. Verificar el dato inyectado por PHP (configuración del admin)
  const wpData = window.qe_data || {};
  if (wpData.isDarkMode !== undefined) {
    return wpData.isDarkMode;
  }
  
  const html = document.documentElement;
  const body = document.body;
  
  // 2. Verificar clases del body de WordPress Admin
  const darkColorSchemes = ['admin-color-midnight', 'admin-color-coffee', 'admin-color-ectoplasm', 'admin-color-ocean', 'admin-color-modern'];
  
  for (const scheme of darkColorSchemes) {
    if (body.classList.contains(scheme)) {
      return true;
    }
  }
  
  // 3. Verificar patrones comunes de modo oscuro en temas de WordPress frontend
  // Clases comunes en html o body
  const darkClassPatterns = [
    'dark-mode', 'dark', 'is-dark', 'is-dark-theme', 'theme-dark',
    'dark-theme', 'night-mode', 'night', 'darkmode', 'color-scheme-dark'
  ];
  
  for (const className of darkClassPatterns) {
    if (html.classList.contains(className) || body.classList.contains(className)) {
      return true;
    }
  }
  
  // 4. Verificar data attributes comunes
  const darkDataAttributes = [
    'data-theme', 'data-color-scheme', 'data-mode', 'data-bs-theme'
  ];
  
  for (const attr of darkDataAttributes) {
    const htmlValue = html.getAttribute(attr);
    const bodyValue = body.getAttribute(attr);
    if (htmlValue === 'dark' || bodyValue === 'dark') {
      return true;
    }
  }
  
  // 5. Verificar localStorage de temas populares de WordPress
  const themeStorageKeys = [
    'theme', 'color-scheme', 'dark-mode', 'darkMode', 'theme-mode',
    'flavor', 'flavor-theme', 'flavor-mode', 'flavor-color-scheme' // Tu tema actual
  ];
  
  for (const key of themeStorageKeys) {
    const value = localStorage.getItem(key);
    if (value === 'dark' || value === 'true' || value === '1') {
      return true;
    }
  }
  
  // 6. Verificar CSS custom property (algunos temas lo usan)
  const colorScheme = getComputedStyle(html).getPropertyValue('color-scheme').trim();
  if (colorScheme === 'dark' || colorScheme.includes('dark')) {
    return true;
  }
  
  return null; // No determinado por WordPress/Tema
};

// Get initial dark mode: localStorage (user preference) > WordPress > system preference
const getInitialDarkMode = () => {
  // 1. PRIORIDAD: Preferencia del usuario guardada en localStorage
  const storedPreference = localStorage.getItem('qe_dark_mode');
  if (storedPreference !== null) {
    return storedPreference === 'true';
  }
  
  // 2. Si no hay preferencia guardada, detectar de WordPress
  const wpDarkMode = detectWordPressDarkMode();
  if (wpDarkMode !== null) {
    // Guardar como preferencia inicial
    localStorage.setItem('qe_dark_mode', String(wpDarkMode));
    return wpDarkMode;
  }
  
  // 3. Fallback a preferencia del sistema
  if (window.matchMedia) {
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    localStorage.setItem('qe_dark_mode', String(systemPreference));
    return systemPreference;
  }
  
  return false;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme());
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode());
  const [loading, setLoading] = useState(false);

  // Detectar cambios en preferencia de modo oscuro del sistema
  useEffect(() => {
    // Listener para cambios en preferencia del sistema
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemChange = (e) => {
        // Solo aplicar si no hay preferencia manual guardada
        const storedPreference = localStorage.getItem('qe_dark_mode');
        if (storedPreference === null) {
          setIsDarkMode(e.matches);
        }
      };
      
      darkModeQuery.addEventListener('change', handleSystemChange);
      
      return () => {
        darkModeQuery.removeEventListener('change', handleSystemChange);
      };
    }
  }, []);

  // Aplicar tema al DOM cuando cambia el tema o el modo
  useEffect(() => {
    applyThemeToDOM(theme, isDarkMode);
  }, [theme, isDarkMode]);

  // Aplicar tema al DOM usando CSS variables
  const applyThemeToDOM = (themeData, darkMode) => {
    // Validar que themeData tenga la estructura correcta
    if (!themeData || !themeData.light || !themeData.dark) {
      console.error('Invalid theme data in applyThemeToDOM, using DEFAULT_THEME');
      themeData = DEFAULT_THEME;
    }
    
    const root = document.documentElement;
    
    // Seleccionar colores según el modo
    const currentMode = darkMode ? themeData.dark : themeData.light;
    
    // Validar que currentMode existe y tiene las propiedades necesarias
    if (!currentMode || typeof currentMode !== 'object') {
      console.error('Invalid currentMode in applyThemeToDOM');
      return;
    }
    
    // Aplicar colores como CSS variables
    root.style.setProperty('--qe-primary', currentMode.primary || '#3b82f6');
    root.style.setProperty('--qe-secondary', currentMode.secondary || '#8b5cf6');
    root.style.setProperty('--qe-accent', currentMode.accent || '#f59e0b');
    root.style.setProperty('--qe-background', currentMode.background || '#f3f4f6');
    root.style.setProperty('--qe-secondary-background', currentMode.secondaryBackground || '#ffffff');
    root.style.setProperty('--qe-text', currentMode.text || '#111827');
    root.style.setProperty('--qe-text-primary', currentMode.textPrimary || currentMode.text || '#111827');
    root.style.setProperty('--qe-text-secondary', currentMode.textSecondary || (darkMode ? '#9ca3af' : '#6b7280'));
    root.style.setProperty('--qe-text-contrast', currentMode.textColorContrast || '#ffffff');
    root.style.setProperty('--qe-border-color', currentMode.borderColor || currentMode.primary || '#3b82f6');
    
    // Calcular colores derivados
    const primaryRGB = hexToRGB(currentMode.primary || '#3b82f6');
    const secondaryRGB = hexToRGB(currentMode.secondary || '#8b5cf6');
    const accentRGB = hexToRGB(currentMode.accent || '#f59e0b');
    
    // Variaciones de opacidad
    root.style.setProperty('--qe-primary-light', `rgba(${primaryRGB}, 0.1)`);
    root.style.setProperty('--qe-primary-hover', adjustBrightness(currentMode.primary || '#3b82f6', darkMode ? 10 : -10));
    root.style.setProperty('--qe-secondary-light', `rgba(${secondaryRGB}, 0.1)`);
    root.style.setProperty('--qe-secondary-hover', adjustBrightness(currentMode.secondary || '#8b5cf6', darkMode ? 10 : -10));
    root.style.setProperty('--qe-accent-light', `rgba(${accentRGB}, 0.1)`);
    root.style.setProperty('--qe-accent-hover', adjustBrightness(currentMode.accent || '#f59e0b', darkMode ? 10 : -10));
    
    // Modo oscuro
    if (darkMode) {
      root.classList.add('qe-dark-mode');
      root.style.setProperty('--qe-border', '#374151');
      root.style.setProperty('--qe-bg-card', currentMode.secondaryBackground || '#1f2937');
      root.style.setProperty('--qe-bg-hover', '#374151');
      
      // Scrollbar oscuro
      const primaryRGBDark = hexToRGB(currentMode.primary || '#60a5fa');
      root.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.2)');
      root.style.setProperty('--scrollbar-thumb', `rgba(${primaryRGBDark}, 0.4)`);
      root.style.setProperty('--scrollbar-thumb-hover', `rgba(${primaryRGBDark}, 0.6)`);
      root.style.setProperty('--scrollbar-thumb-active', `rgba(${primaryRGBDark}, 0.8)`);
    } else {
      root.classList.remove('qe-dark-mode');
      root.style.setProperty('--qe-border', '#e5e7eb');
      root.style.setProperty('--qe-bg-card', currentMode.secondaryBackground || '#ffffff');
      root.style.setProperty('--qe-bg-hover', '#f9fafb');
      
      // Scrollbar claro
      const primaryRGBLight = hexToRGB(currentMode.primary || '#3b82f6');
      root.style.setProperty('--scrollbar-track', 'rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--scrollbar-thumb', `rgba(${primaryRGBLight}, 0.3)`);
      root.style.setProperty('--scrollbar-thumb-hover', `rgba(${primaryRGBLight}, 0.5)`);
      root.style.setProperty('--scrollbar-thumb-active', `rgba(${primaryRGBLight}, 0.7)`);
    }
  };

  // Actualizar tema (para admin) - guarda en BD
  const updateTheme = useCallback(async (newTheme) => {
    try {
      const response = await settingsService.updateSettings({ theme: newTheme });
      if (response.success) {
        setTheme(newTheme);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating theme:', error);
      return false;
    }
  }, []);

  // Actualizar tema solo en el estado (sin guardar en BD) - para preview en Settings
  const setThemePreview = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  // 🔥 FIX: Toggle modo oscuro - removed isDarkMode dependency to prevent infinite re-renders
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      console.log('toggleDarkMode: setting to', newValue);
      localStorage.setItem('qe_dark_mode', String(newValue));
      return newValue;
    });
  }, []); // No dependencies needed - uses functional setter

  // Establecer modo oscuro directamente y persistir
  const setDarkMode = useCallback((value) => {
    localStorage.setItem('qe_dark_mode', String(value));
    setIsDarkMode(value);
  }, []);

  // 🔥 FIX: Sincronizar con el modo de WordPress - use state getter to avoid dependency
  const syncWithWordPress = useCallback(() => {
    const wpDarkMode = detectWordPressDarkMode();
    if (wpDarkMode !== null) {
      localStorage.setItem('qe_dark_mode', String(wpDarkMode));
      localStorage.setItem('qe_wp_dark_mode', String(wpDarkMode));
      setIsDarkMode(wpDarkMode);
      return wpDarkMode;
    }
    // Use functional setter to get current value without dependency
    setIsDarkMode(current => current);
    return null;
  }, []);

  // Verificar si el usuario tiene una preferencia diferente a WordPress
  const hasCustomPreference = useCallback(() => {
    const storedPreference = localStorage.getItem('qe_dark_mode');
    const wpDarkMode = detectWordPressDarkMode();
    
    if (storedPreference === null || wpDarkMode === null) {
      return false;
    }
    
    return (storedPreference === 'true') !== wpDarkMode;
  }, []);

  // Memoizar getColor para que use siempre los valores actuales
  const getColor = useCallback((colorName, fallback = '#000000') => {
    // Validar que theme tenga la estructura correcta
    if (!theme || !theme.light || !theme.dark) {
      console.warn('Theme is invalid in getColor, using DEFAULT_THEME');
      const currentColors = isDarkMode ? DEFAULT_THEME.dark : DEFAULT_THEME.light;
      return currentColors[colorName] || fallback;
    }
    const currentColors = isDarkMode ? theme.dark : theme.light;
    return currentColors[colorName] || fallback;
  }, [theme, isDarkMode]);

  // Memoizar getCurrentColors
  const getCurrentColors = useCallback(() => {
    if (!theme || !theme.light || !theme.dark) {
      console.warn('Theme is invalid in getCurrentColors, using DEFAULT_THEME');
      return isDarkMode ? DEFAULT_THEME.dark : DEFAULT_THEME.light;
    }
    return isDarkMode ? theme.dark : theme.light;
  }, [theme, isDarkMode]);

  const value = useMemo(() => ({
    theme,
    isDarkMode,
    loading,
    updateTheme,
    setThemePreview,
    toggleDarkMode,
    setDarkMode,
    syncWithWordPress,
    hasCustomPreference,
    getCurrentColors,
    getColor
  }), [theme, isDarkMode, loading, updateTheme, setThemePreview, toggleDarkMode, setDarkMode, syncWithWordPress, hasCustomPreference, getCurrentColors, getColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Utilidades
function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function adjustBrightness(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export default ThemeContext;
