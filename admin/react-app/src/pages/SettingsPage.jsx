// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Save, Settings, Percent, Hash, Palette, Sun, Moon, RotateCcw } from 'lucide-react';
import QEButton from '../components/common/QEButton';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';
import { DEFAULT_THEME } from '../contexts/ThemeContext';

/**
 * Settings page for admin panel
 * Allows administrators to configure global settings for the plugin
 */
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  // Inicializar con datos de window.qe_data si están disponibles
  const getInitialScoreFormat = () => {
    const wpData = window.qe_data || {};
    return wpData.scoreFormat || 'percentage';
  };
  
  const getInitialTheme = () => {
    const wpData = window.qe_data || {};
    return wpData.theme || DEFAULT_THEME;
  };
  
  const [scoreFormat, setScoreFormat] = useState(getInitialScoreFormat());
  const [theme, setTheme] = useState(getInitialTheme());
  const [previewMode, setPreviewMode] = useState('light');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Cargar la configuración actual al montar (verificar si hay cambios)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.getSettings();
        
        // Solo actualizar si hay diferencias (para evitar re-renders innecesarios)
        const newScoreFormat = settings.score_format || 'percentage';
        if (newScoreFormat !== scoreFormat) {
          setScoreFormat(newScoreFormat);
        }
        
        if (settings.theme) {
          // Verificar si es el nuevo formato
          if (settings.theme.light && settings.theme.dark) {
            setTheme(settings.theme);
          } else {
            // Migrar formato antiguo
            const migratedTheme = {
              light: {
                primary: settings.theme.primary || DEFAULT_THEME.light.primary,
                secondary: settings.theme.secondary || DEFAULT_THEME.light.secondary,
                accent: settings.theme.accent || DEFAULT_THEME.light.accent,
                background: settings.theme.background || DEFAULT_THEME.light.background,
                secondaryBackground: settings.theme.secondaryBackground || DEFAULT_THEME.light.secondaryBackground,
                text: settings.theme.text || DEFAULT_THEME.light.text
              },
              dark: DEFAULT_THEME.dark
            };
            setTheme(migratedTheme);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Error al cargar la configuración');
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'general') {
        await settingsService.updateScoreFormat(scoreFormat);
      } else if (activeTab === 'theme') {
        await settingsService.updateTheme(theme);
      }
      
      toast.success('Configuración guardada correctamente');
      
      // Recargar la página para aplicar cambios globalmente
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
      setLoading(false);
    }
  };

  const handleColorChange = (mode, colorKey, value) => {
    setTheme(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [colorKey]: value
      }
    }));
  };

  const handleResetTheme = () => {
    if (confirm('¿Estás seguro de que quieres restaurar los colores por defecto?')) {
      setTheme(DEFAULT_THEME);
    }
  };

  const ColorPicker = ({ label, value, onChange, description }) => {
    // Validar y normalizar el valor
    const safeValue = value || '#000000';
    const [tempValue, setTempValue] = React.useState(safeValue);
    const [isOpen, setIsOpen] = React.useState(false);
    const colorInputRef = React.useRef(null);
    
    // Actualizar tempValue cuando cambia el valor externo
    React.useEffect(() => {
      setTempValue(safeValue);
    }, [safeValue]);
    
    const handleOpenPicker = () => {
      setTempValue(safeValue);
      setIsOpen(true);
    };
    
    const handleConfirm = () => {
      if (onChange) {
        onChange(tempValue);
      }
      setIsOpen(false);
    };
    
    const handleCancel = () => {
      setTempValue(safeValue);
      setIsOpen(false);
    };
    
    const handleColorChange = (e) => {
      setTempValue(e.target.value);
    };
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
        <div className="flex items-center gap-4">
          {/* Selector de color circular mejorado */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleOpenPicker}
              className="w-12 h-12 rounded-full border-4 border-white shadow-lg cursor-pointer ring-2 ring-gray-200 hover:ring-blue-400 hover:scale-105 transition-all focus:outline-none focus:ring-blue-500 relative"
              style={{ backgroundColor: safeValue }}
              title="Haz clic para elegir un color"
            >
              {/* Ícono de editar superpuesto */}
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-full">
                <Palette className="w-5 h-5 text-white" />
              </span>
            </button>
          </div>
          
          {/* Input de texto */}
          <input
            type="text"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="#000000"
          />
          
          {/* Vista previa del color */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border-2 border-gray-200 shadow-sm"
              style={{ backgroundColor: safeValue }}
            />
            <span className="text-xs text-gray-500 font-mono">{safeValue.toUpperCase()}</span>
          </div>
        </div>
        
        {/* Modal del selector de color */}
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Seleccionar {label}
              </h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Haz clic o arrastra el ratón en el selector para elegir un color
              </p>
              
              {/* Selector de color grande */}
              <div className="mb-6 relative group">
                <input
                  ref={colorInputRef}
                  type="color"
                  value={tempValue}
                  onChange={handleColorChange}
                  onInput={handleColorChange}
                  className="w-full h-48 cursor-crosshair rounded border-2 border-gray-300 hover:qe-border-primary transition-colors"
                />
                {/* Indicador visual flotante */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    Hacer click para elegir
                  </div>
                </div>
              </div>
              
              {/* Vista previa y valor hex */}
              <div className="mb-6 flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded border-2 border-gray-300 shadow-sm"
                  style={{ backgroundColor: tempValue }}
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de color
                  </label>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={handleColorChange}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md qe-input-primary font-mono text-sm"
                  />
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 qe-bg-primary qe-text-on-primary rounded-md qe-hover-primary transition-colors font-medium"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 qe-icon-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        </div>
        <p className="text-gray-600">
          Configura las opciones globales del sistema de gestión de aprendizaje
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'general'
                ? 'qe-text-primary qe-border-primary'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              General
            </div>
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'theme'
                ? 'qe-text-primary qe-border-primary'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Tema y Colores
            </div>
          </button>
        </nav>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Formato de Puntuación
              </h2>
              <p className="text-gray-600 mb-6">
                Selecciona cómo se mostrarán las puntuaciones en toda la plataforma
              </p>

              <div className="space-y-4">
                {/* Percentage Option */}
                <label className="flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                  <input
                    type="radio"
                    name="scoreFormat"
                    value="percentage"
                    checked={scoreFormat === 'percentage'}
                    onChange={(e) => setScoreFormat(e.target.value)}
                    className="mt-1 w-5 h-5 qe-radio-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-5 h-5 qe-icon-primary" />
                      <span className="font-medium text-gray-900">Porcentaje (0-100%)</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Las puntuaciones se mostrarán como porcentajes del 0% al 100%
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      Ejemplo: <span className="font-mono bg-gray-100 px-2 py-1 rounded">75%</span>
                    </div>
                  </div>
                </label>

                {/* Base 10 Option */}
                <label className="flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50">
                  <input
                    type="radio"
                    name="scoreFormat"
                    value="base10"
                    checked={scoreFormat === 'base10'}
                    onChange={(e) => setScoreFormat(e.target.value)}
                    className="mt-1 w-5 h-5 qe-radio-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-5 h-5 qe-icon-primary" />
                      <span className="font-medium text-gray-900">Base 10 (0-10)</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Las puntuaciones se mostrarán en escala del 0 al 10 (estilo español)
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      Ejemplo: <span className="font-mono bg-gray-100 px-2 py-1 rounded">7.5/10</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Theme Settings Tab */}
        {activeTab === 'theme' && (
          <>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Personalización del Tema
                  </h2>
                  <p className="text-gray-600">
                    Configura los colores para el modo claro y oscuro. El plugin detectará automáticamente 
                    la preferencia del usuario desde el sistema o WordPress.
                  </p>
                </div>
                <button
                  onClick={handleResetTheme}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar por defecto
                </button>
              </div>

              {/* Mode Selector for Preview */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-gray-900">Modo de Previsualización</h3>
                      <p className="text-sm text-gray-600">
                        Elige qué modo quieres editar y previsualizar
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setPreviewMode('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        previewMode === 'light'
                          ? 'qe-bg-primary qe-text-on-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      Modo Claro
                    </button>
                    <button
                      onClick={() => setPreviewMode('dark')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        previewMode === 'dark'
                          ? 'qe-bg-primary qe-text-on-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      Modo Oscuro
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Pickers for Selected Mode */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  {previewMode === 'light' ? (
                    <>
                      <Sun className="w-5 h-5 text-yellow-500" />
                      Colores del Modo Claro
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5 text-indigo-500" />
                      Colores del Modo Oscuro
                    </>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <ColorPicker
                    label="Color Principal"
                    description="Color primario de la interfaz"
                    value={theme[previewMode].primary}
                    onChange={(value) => handleColorChange(previewMode, 'primary', value)}
                  />
                  <ColorPicker
                    label="Color Secundario"
                    description="Color para elementos secundarios"
                    value={theme[previewMode].secondary}
                    onChange={(value) => handleColorChange(previewMode, 'secondary', value)}
                  />
                  <ColorPicker
                    label="Color de Acento"
                    description="Color para destacar elementos"
                    value={theme[previewMode].accent}
                    onChange={(value) => handleColorChange(previewMode, 'accent', value)}
                  />
                  <ColorPicker
                    label="Color de Fondo (Sidebars)"
                    description="Color de fondo para barras laterales"
                    value={theme[previewMode].background}
                    onChange={(value) => handleColorChange(previewMode, 'background', value)}
                  />
                  <ColorPicker
                    label="Color de Fondo (Contenido)"
                    description="Color de fondo para el contenido principal"
                    value={theme[previewMode].secondaryBackground}
                    onChange={(value) => handleColorChange(previewMode, 'secondaryBackground', value)}
                  />
                  <ColorPicker
                    label="Color de Texto"
                    description="Color principal del texto"
                    value={theme[previewMode].text}
                    onChange={(value) => handleColorChange(previewMode, 'text', value)}
                  />
                </div>
              </div>

              {/* Preview Section */}
              <div 
                className="p-6 rounded-lg border-2"
                style={{ 
                  backgroundColor: theme[previewMode].background,
                  borderColor: theme[previewMode].primary
                }}
              >
                <h3 
                  className="text-sm font-medium mb-4"
                  style={{ color: theme[previewMode].text }}
                >
                  Vista Previa - Modo {previewMode === 'light' ? 'Claro' : 'Oscuro'}
                </h3>
                <div className="flex gap-3 flex-wrap">
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme[previewMode].primary }}
                  >
                    Botón Principal
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme[previewMode].secondary }}
                  >
                    Botón Secundario
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme[previewMode].accent }}
                  >
                    Botón de Acento
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg border-2 font-medium"
                    style={{
                      backgroundColor: theme[previewMode].background,
                      borderColor: theme[previewMode].primary,
                      color: theme[previewMode].text
                    }}
                  >
                    Texto de Ejemplo
                  </div>
                </div>
              </div>

              {/* Info about automatic detection */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sun className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Detección Automática</h4>
                    <p className="text-sm text-blue-800">
                      El plugin detectará automáticamente si el usuario prefiere el modo oscuro basándose en:
                    </p>
                    <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc space-y-1">
                      <li>La configuración de esquema de color del panel de WordPress</li>
                      <li>La preferencia del sistema operativo del usuario (prefers-color-scheme)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="p-6 bg-gray-50 flex justify-end border-t border-gray-200">
          <QEButton
            onClick={handleSave}
            disabled={loading}
            variant="primary"
            className="flex items-center gap-2 px-6 py-2 rounded-lg"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </QEButton>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 qe-bg-primary-light qe-border-primary rounded-lg p-4">
        <p className="text-sm qe-text-primary">
          <strong>Nota:</strong> Al cambiar el formato de puntuación, se aplicará 
          globalmente a toda la plataforma para todos los usuarios. La página se recargará 
          automáticamente para aplicar los cambios.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
