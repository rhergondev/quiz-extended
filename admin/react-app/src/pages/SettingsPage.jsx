// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Save, Settings, Percent, Hash } from 'lucide-react';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';

/**
 * Settings page for admin panel
 * Allows administrators to configure global settings for the plugin
 */
const SettingsPage = () => {
  const [scoreFormat, setScoreFormat] = useState('percentage');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Cargar la configuración actual al montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const format = await settingsService.getScoreFormat();
        setScoreFormat(format);
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
      await settingsService.updateScoreFormat(scoreFormat);
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

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* Score Format Section */}
        <div className="p-6 border-b border-gray-200">
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

        {/* Save Button */}
        <div className="p-6 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
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
