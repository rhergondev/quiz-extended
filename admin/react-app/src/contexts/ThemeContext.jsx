import React, { createContext, useState, useEffect, useContext } from 'react';
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
    text: '#111827'
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#fbbf24',
    background: '#1f2937',
    secondaryBackground: '#111827',
    text: '#f9fafb'
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
  return wpData.theme || DEFAULT_THEME;
};

// Get initial dark mode from WordPress
const getInitialDarkMode = () => {
  const wpData = window.qe_data || {};
  // Check WordPress preference first, then system preference
  if (wpData.isDarkMode !== undefined) {
    return wpData.isDarkMode;
  }
  // Fallback to system preference
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme());
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode());
  const [loading, setLoading] = useState(false);

  // Detectar cambios en preferencia de modo oscuro del sistema
  useEffect(() => {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Solo escuchar cambios, no establecer el valor inicial (ya lo hicimos arriba)
      const handleChange = (e) => {
        // Solo aplicar si no hay preferencia de WordPress
        const wpData = window.qe_data || {};
        if (wpData.isDarkMode === undefined) {
          setIsDarkMode(e.matches);
        }
      };
      
      darkModeQuery.addEventListener('change', handleChange);
      
      return () => {
        darkModeQuery.removeEventListener('change', handleChange);
      };
    }
  }, []);

  // Aplicar tema al DOM cuando cambia el tema o el modo
  useEffect(() => {
    applyThemeToDOM(theme, isDarkMode);
  }, [theme, isDarkMode]);

  // Aplicar tema al DOM usando CSS variables
  const applyThemeToDOM = (themeData, darkMode) => {
    const root = document.documentElement;
    
    // Seleccionar colores según el modo
    const currentMode = darkMode ? themeData.dark : themeData.light;
    
    // Aplicar colores como CSS variables
    root.style.setProperty('--qe-primary', currentMode.primary);
    root.style.setProperty('--qe-secondary', currentMode.secondary);
    root.style.setProperty('--qe-accent', currentMode.accent);
    root.style.setProperty('--qe-background', currentMode.background);
    root.style.setProperty('--qe-secondary-background', currentMode.secondaryBackground);
    root.style.setProperty('--qe-text', currentMode.text || '#111827');
    
    // Calcular colores derivados
    const primaryRGB = hexToRGB(currentMode.primary);
    const secondaryRGB = hexToRGB(currentMode.secondary);
    const accentRGB = hexToRGB(currentMode.accent);
    
    // Variaciones de opacidad
    root.style.setProperty('--qe-primary-light', `rgba(${primaryRGB}, 0.1)`);
    root.style.setProperty('--qe-primary-hover', adjustBrightness(currentMode.primary, darkMode ? 10 : -10));
    root.style.setProperty('--qe-secondary-light', `rgba(${secondaryRGB}, 0.1)`);
    root.style.setProperty('--qe-secondary-hover', adjustBrightness(currentMode.secondary, darkMode ? 10 : -10));
    root.style.setProperty('--qe-accent-light', `rgba(${accentRGB}, 0.1)`);
    root.style.setProperty('--qe-accent-hover', adjustBrightness(currentMode.accent, darkMode ? 10 : -10));
    
    // Modo oscuro
    if (darkMode) {
      root.classList.add('qe-dark-mode');
      root.style.setProperty('--qe-text-secondary', '#d1d5db');
      root.style.setProperty('--qe-border', '#374151');
      root.style.setProperty('--qe-bg-card', '#1f2937');
      root.style.setProperty('--qe-bg-hover', '#374151');
    } else {
      root.classList.remove('qe-dark-mode');
      root.style.setProperty('--qe-text-secondary', '#6b7280');
      root.style.setProperty('--qe-border', '#e5e7eb');
      root.style.setProperty('--qe-bg-card', '#ffffff');
      root.style.setProperty('--qe-bg-hover', '#f9fafb');
    }
  };

  // Actualizar tema (para admin)
  const updateTheme = async (newTheme) => {
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
  };

  // Toggle modo oscuro
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    theme,
    isDarkMode,
    loading,
    updateTheme,
    toggleDarkMode,
    // Helper functions para componentes
    getCurrentColors: () => isDarkMode ? theme.dark : theme.light,
    getColor: (colorName) => {
      const currentColors = isDarkMode ? theme.dark : theme.light;
      return currentColors[colorName] || '#000000';
    }
  };

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
