import React, { createContext, useState, useEffect, useContext } from 'react';
import { settingsService } from '../api/services/settingsService';

const ThemeContext = createContext();

// Hook personalizado para usar el contexto
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#111827',
    dark_mode: false
  });
  const [loading, setLoading] = useState(true);

  // Cargar tema desde la API
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await settingsService.getTheme();
        if (response.success && response.data) {
          setTheme(response.data);
          applyThemeToDOM(response.data);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Usar tema por defecto
        applyThemeToDOM(theme);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Aplicar tema al DOM usando CSS variables
  const applyThemeToDOM = (themeData) => {
    const root = document.documentElement;
    
    // Aplicar colores como CSS variables
    root.style.setProperty('--qe-primary', themeData.primary);
    root.style.setProperty('--qe-secondary', themeData.secondary);
    root.style.setProperty('--qe-accent', themeData.accent);
    root.style.setProperty('--qe-background', themeData.background);
    root.style.setProperty('--qe-text', themeData.text || '#111827');
    
    // Calcular colores derivados
    const primaryRGB = hexToRGB(themeData.primary);
    const secondaryRGB = hexToRGB(themeData.secondary);
    const accentRGB = hexToRGB(themeData.accent);
    
    // Variaciones de opacidad
    root.style.setProperty('--qe-primary-light', `rgba(${primaryRGB}, 0.1)`);
    root.style.setProperty('--qe-primary-hover', adjustBrightness(themeData.primary, -10));
    root.style.setProperty('--qe-secondary-light', `rgba(${secondaryRGB}, 0.1)`);
    root.style.setProperty('--qe-secondary-hover', adjustBrightness(themeData.secondary, -10));
    root.style.setProperty('--qe-accent-light', `rgba(${accentRGB}, 0.1)`);
    root.style.setProperty('--qe-accent-hover', adjustBrightness(themeData.accent, -10));
    
    // Modo oscuro
    if (themeData.dark_mode) {
      root.classList.add('qe-dark-mode');
      // En modo oscuro, usar el color de texto personalizado
      root.style.setProperty('--qe-text', themeData.text || '#f3f4f6');
      root.style.setProperty('--qe-text-secondary', '#d1d5db');
      root.style.setProperty('--qe-border', '#374151');
      root.style.setProperty('--qe-bg-card', '#1f2937');
      root.style.setProperty('--qe-bg-hover', '#374151');
    } else {
      root.classList.remove('qe-dark-mode');
      // En modo claro, usar el color personalizado o el por defecto
      root.style.setProperty('--qe-text', themeData.text || '#111827');
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
        const updatedTheme = { ...theme, ...newTheme };
        setTheme(updatedTheme);
        applyThemeToDOM(updatedTheme);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating theme:', error);
      return false;
    }
  };

  // Toggle modo oscuro
  const toggleDarkMode = async () => {
    const newTheme = { ...theme, dark_mode: !theme.dark_mode };
    return await updateTheme(newTheme);
  };

  const value = {
    theme,
    loading,
    updateTheme,
    toggleDarkMode,
    // Helper functions para componentes
    getColor: (colorName) => theme[colorName] || '#000000',
    isDarkMode: () => theme.dark_mode
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
