import React, { useState, useEffect } from 'react';
import { Palette, Sun, Moon, Save, RotateCcw } from 'lucide-react';
import QEButton from '../components/common/QEButton';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';

const ThemeSettingsPage = () => {
  const [theme, setTheme] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    dark_mode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultTheme = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    dark_mode: false
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await settingsService.getSettings();
      if (settings.theme) {
        setTheme(settings.theme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      toast.error('Error al cargar configuración de tema');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (colorKey, value) => {
    setTheme(prev => ({ ...prev, [colorKey]: value }));
  };

  const handleDarkModeToggle = () => {
    setTheme(prev => ({ ...prev, dark_mode: !prev.dark_mode }));
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
      setTheme(defaultTheme);
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
                  Personaliza los colores del frontend para evitar conflictos con tu tema de WordPress
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              {theme.dark_mode ? (
                <Moon className="w-6 h-6 text-blue-600" />
              ) : (
                <Sun className="w-6 h-6 text-amber-500" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">Modo Oscuro</h3>
                <p className="text-sm text-gray-500">
                  Activa el modo oscuro para todo el frontend del plugin
                </p>
              </div>
            </div>
            <button
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                theme.dark_mode ? 'qe-toggle-active' : 'qe-toggle-inactive'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  theme.dark_mode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Color Pickers */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colores Personalizados
            </h3>

            <ColorPicker
              label="Color Primario"
              description="Usado en botones principales, enlaces y elementos destacados"
              value={theme.primary}
              onChange={(value) => handleColorChange('primary', value)}
            />

            <ColorPicker
              label="Color Secundario"
              description="Usado en elementos secundarios y acentos alternativos"
              value={theme.secondary}
              onChange={(value) => handleColorChange('secondary', value)}
            />

            <ColorPicker
              label="Color de Acento"
              description="Usado para alertas, notificaciones y elementos de atención"
              value={theme.accent}
              onChange={(value) => handleColorChange('accent', value)}
            />

            <ColorPicker
              label="Color de Fondo"
              description="Color de fondo principal de las tarjetas y contenedores"
              value={theme.background}
              onChange={(value) => handleColorChange('background', value)}
            />
          </div>

          {/* Preview */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                style={{ backgroundColor: theme.primary }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón Primario
              </button>
              <button
                style={{ backgroundColor: theme.secondary }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón Secundario
              </button>
              <button
                style={{ backgroundColor: theme.accent }}
                className="px-4 py-2 text-white rounded font-medium hover:opacity-90 transition-opacity"
              >
                Botón de Acento
              </button>
              <div
                style={{ backgroundColor: theme.background }}
                className="px-4 py-2 text-gray-900 rounded border-2 border-gray-300 text-center font-medium"
              >
                Tarjeta
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los colores de éxito (verde) y error (rojo) se mantienen fijos para consistencia visual y accesibilidad.
            </p>
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
