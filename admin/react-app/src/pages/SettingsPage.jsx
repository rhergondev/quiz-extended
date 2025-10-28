// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Save, Settings, Percent, Hash, Palette, Sun, Moon, RotateCcw } from 'lucide-react';
import QEButton from '../components/common/QEButton';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';

/**
 * Settings page for admin panel
 * Allows administrators to configure global settings for the plugin
 */
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [scoreFormat, setScoreFormat] = useState('percentage');
  const [theme, setTheme] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    dark_mode: false
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const defaultTheme = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    dark_mode: false
  };

  // Cargar la configuración actual al montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.getSettings();
        setScoreFormat(settings.score_format || 'percentage');
        if (settings.theme) {
          setTheme(settings.theme);
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

  const handleColorChange = (colorKey, value) => {
    setTheme(prev => ({ ...prev, [colorKey]: value }));
  };

  const handleDarkModeToggle = () => {
    setTheme(prev => ({ ...prev, dark_mode: !prev.dark_mode }));
  };

  const handleResetTheme = () => {
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
          <Settings className="w-8 h-8 text-blue-600" />
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
                ? 'text-blue-600 border-blue-600'
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
                ? 'text-blue-600 border-blue-600'
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
                    className="mt-1 w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-5 h-5 text-blue-600" />
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
                    className="mt-1 w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-5 h-5 text-blue-600" />
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
                    Configura los colores y el tema de la interfaz
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

              {/* Dark Mode Toggle */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme.dark_mode ? (
                      <Moon className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Sun className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">Modo Oscuro</h3>
                      <p className="text-sm text-gray-600">
                        Activa el tema oscuro para reducir la fatiga visual
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDarkModeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      theme.dark_mode ? 'qe-toggle-active' : 'qe-toggle-inactive'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme.dark_mode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <ColorPicker
                  label="Color Principal"
                  description="Color primario de la interfaz"
                  value={theme.primary}
                  onChange={(value) => handleColorChange('primary', value)}
                />
                <ColorPicker
                  label="Color Secundario"
                  description="Color para elementos secundarios"
                  value={theme.secondary}
                  onChange={(value) => handleColorChange('secondary', value)}
                />
                <ColorPicker
                  label="Color de Acento"
                  description="Color para destacar elementos"
                  value={theme.accent}
                  onChange={(value) => handleColorChange('accent', value)}
                />
                <ColorPicker
                  label="Color de Fondo"
                  description="Color de fondo de la interfaz"
                  value={theme.background}
                  onChange={(value) => handleColorChange('background', value)}
                />
              </div>

              {/* Preview Section */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Vista Previa</h3>
                <div className="flex gap-3 flex-wrap">
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Botón Principal
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.secondary }}
                  >
                    Botón Secundario
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Botón de Acento
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg border-2 font-medium"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.primary,
                      color: theme.primary
                    }}
                  >
                    Fondo
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
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Al cambiar el formato de puntuación, se aplicará 
          globalmente a toda la plataforma para todos los usuarios. La página se recargará 
          automáticamente para aplicar los cambios.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
