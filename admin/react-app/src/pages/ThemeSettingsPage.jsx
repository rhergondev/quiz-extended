import React, { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Save, RotateCcw } from 'lucide-react';
import QEButton from '../components/common/QEButton';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';
import { DEFAULT_THEME } from '../contexts/ThemeContext';

const ThemeSettingsPage = () => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [previewMode, setPreviewMode] = useState('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await settingsService.getSettings();
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
              text: settings.theme.text || DEFAULT_THEME.light.text
            },
            dark: DEFAULT_THEME.dark
          };
          setTheme(migratedTheme);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      toast.error('Error al cargar configuración de tema');
    } finally {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateTheme(theme);
      toast.success('Tema actualizado correctamente');
      // Recargar para aplicar cambios
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Error al guardar el tema');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres restaurar los colores por defecto?')) {
      setTheme(DEFAULT_THEME);
    }
  };

  const ColorPicker = ({ label, value, onChange, description }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-20 rounded border-2 border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          placeholder="#000000"
        />
        <div
          className="h-12 w-32 rounded border-2 border-gray-300"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuración de Tema
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Personaliza los colores para modo claro y oscuro. El plugin detectará automáticamente la preferencia del usuario.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Mode Selector for Preview */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Modo de Edición</h3>
                <p className="text-sm text-gray-500">
                  Selecciona qué modo quieres configurar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setPreviewMode('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  previewMode === 'light'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Sun className="w-4 h-4" />
                Claro
              </button>
              <button
                onClick={() => setPreviewMode('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  previewMode === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Moon className="w-4 h-4" />
                Oscuro
              </button>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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

            <ColorPicker
              label="Color Primario"
              description="Usado en botones principales, enlaces y elementos destacados"
              value={theme[previewMode].primary}
              onChange={(value) => handleColorChange(previewMode, 'primary', value)}
            />

            <ColorPicker
              label="Color Secundario"
              description="Usado en elementos secundarios y acentos alternativos"
              value={theme[previewMode].secondary}
              onChange={(value) => handleColorChange(previewMode, 'secondary', value)}
            />

            <ColorPicker
              label="Color de Acento"
              description="Usado para alertas, notificaciones y elementos de atención"
              value={theme[previewMode].accent}
              onChange={(value) => handleColorChange(previewMode, 'accent', value)}
            />

            <ColorPicker
              label="Color de Fondo"
              description="Color de fondo principal de las tarjetas y contenedores"
              value={theme[previewMode].background}
              onChange={(value) => handleColorChange(previewMode, 'background', value)}
            />

            <ColorPicker
              label="Color de Texto"
              description="Color principal del texto"
              value={theme[previewMode].text}
              onChange={(value) => handleColorChange(previewMode, 'text', value)}
            />
          </div>

          {/* Preview */}
          <div 
            className="mt-8 p-6 rounded-lg border-2"
            style={{ 
              backgroundColor: theme[previewMode].background,
              borderColor: theme[previewMode].primary
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: theme[previewMode].text }}
            >
              Vista Previa - Modo {previewMode === 'light' ? 'Claro' : 'Oscuro'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                style={{ backgroundColor: theme[previewMode].primary }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón Primario
              </button>
              <button
                style={{ backgroundColor: theme[previewMode].secondary }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón Secundario
              </button>
              <button
                style={{ backgroundColor: theme[previewMode].accent }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón de Acento
              </button>
              <div
                style={{ 
                  backgroundColor: theme[previewMode].background,
                  color: theme[previewMode].text,
                  borderColor: theme[previewMode].primary
                }}
                className="px-4 py-2 rounded border-2 text-center font-medium"
              >
                Texto de Ejemplo
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sun className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Detección Automática:</strong> El plugin detectará automáticamente si el usuario prefiere el modo oscuro basándose en:
                </p>
                <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc space-y-1">
                  <li>La configuración de esquema de color del panel de WordPress</li>
                  <li>La preferencia del sistema operativo (prefers-color-scheme)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
            <QEButton
              onClick={handleReset}
              variant="secondary"
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar por Defecto
            </QEButton>
            <QEButton
              onClick={handleSave}
              variant="primary"
              className="flex items-center gap-2 px-6 py-2 rounded-lg"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </QEButton>
          </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPage;
