// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { Save, Settings, Percent, Hash, Palette, Sun, Moon, RotateCcw, Mail, Bell, AlertTriangle, MessageSquare, Send, Loader2, CheckCircle, Database, Trash2, HardDrive, X } from 'lucide-react';
import QEButton from '../components/common/QEButton';
import { toast } from 'react-toastify';
import settingsService from '../api/services/settingsService';
import { DEFAULT_THEME, useTheme } from '../contexts/ThemeContext';

/**
 * Settings page for admin panel
 * Allows administrators to configure global settings for the plugin
 */
const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  // Usar el ThemeContext para obtener y actualizar el tema
  const { theme: contextTheme, setThemePreview } = useTheme();
  
  // Inicializar con datos del contexto (que ya viene de window.qe_data)
  const getInitialScoreFormat = () => {
    const wpData = window.qe_data || {};
    return wpData.scoreFormat || 'percentage';
  };
  
  const [scoreFormat, setScoreFormat] = useState(getInitialScoreFormat());
  const [theme, setTheme] = useState(contextTheme);
  const [previewMode, setPreviewMode] = useState('light');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [campusLogo, setCampusLogo] = useState(window.qe_data?.campus_logo || '');
  const [campusLogoDark, setCampusLogoDark] = useState(window.qe_data?.campus_logo_dark || '');
  
  // Email notification settings state
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    admin_email: '',
    notify_on_feedback: true,
    notify_on_challenge: true,
    email_subject_prefix: '[Quiz Extended]',
    include_question_content: true
  });
  const [wpAdminEmail, setWpAdminEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  
  // Database cleanup state
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [cleanupResults, setCleanupResults] = useState(null);

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

        // Cargar logo si existe
        if (settings.campus_logo) {
          setCampusLogo(settings.campus_logo);
        }
        if (settings.campus_logo_dark) {
          setCampusLogoDark(settings.campus_logo_dark);
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
                text: settings.theme.text || DEFAULT_THEME.light.text,
                textPrimary: settings.theme.textPrimary || settings.theme.text || DEFAULT_THEME.light.textPrimary,
                textSecondary: settings.theme.textSecondary || DEFAULT_THEME.light.textSecondary,
                textColorContrast: settings.theme.textColorContrast || DEFAULT_THEME.light.textColorContrast,
                borderColor: settings.theme.borderColor || settings.theme.primary || DEFAULT_THEME.light.borderColor,
                hoverColor: settings.theme.hoverColor || settings.theme.accent || DEFAULT_THEME.light.hoverColor
              },
              dark: DEFAULT_THEME.dark
            };
            setTheme(migratedTheme);
          }
        }

        // Load email notification settings
        try {
          const emailData = await settingsService.getEmailNotificationSettings();
          if (emailData.settings) {
            setEmailSettings(emailData.settings);
          }
          if (emailData.wp_admin_email) {
            setWpAdminEmail(emailData.wp_admin_email);
          }
        } catch (emailError) {
          console.error('Error loading email settings:', emailError);
          // Non-critical, don't show error to user
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
        // Guardar logos (claro y oscuro)
        if (campusLogo !== (window.qe_data?.campus_logo || '')) {
          await settingsService.updateCampusLogo(campusLogo);
        }
        if (campusLogoDark !== (window.qe_data?.campus_logo_dark || '')) {
          await settingsService.updateCampusLogoDark(campusLogoDark);
        }
      } else if (activeTab === 'theme') {
        await settingsService.updateTheme(theme);
      } else if (activeTab === 'notifications') {
        await settingsService.updateEmailNotificationSettings(emailSettings);
        toast.success('Configuración de notificaciones guardada correctamente');
        setLoading(false);
        return; // Don't reload for notification settings
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

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const result = await settingsService.sendTestEmail();
      toast.success(result.message || 'Email de prueba enviado correctamente');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Error al enviar el email de prueba. Verifica la configuración de tu servidor.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Database cleanup handlers
  const handleOpenCleanupModal = async () => {
    setCleanupModalOpen(true);
    setCleanupLoading(true);
    setCleanupResults(null);
    
    try {
      const response = await settingsService.getAutoloadStatus();
      setCleanupStats(response.data);
    } catch (error) {
      console.error('Error fetching autoload status:', error);
      toast.error('Error al obtener estadísticas de la base de datos');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleRunCleanup = async () => {
    setCleanupLoading(true);
    
    try {
      const response = await settingsService.cleanupAutoloadOptions();
      setCleanupResults(response.data);
      toast.success('Limpieza de base de datos completada');
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Error al ejecutar la limpieza');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCloseCleanupModal = () => {
    setCleanupModalOpen(false);
    setCleanupStats(null);
    setCleanupResults(null);
  };

  const handleColorChange = (mode, colorKey, value) => {
    const newTheme = {
      ...theme,
      [mode]: {
        ...theme[mode],
        [colorKey]: value
      }
    };
    
    // Actualizar estado local
    setTheme(newTheme);
    
    // Actualizar contexto (esto aplicará los colores al DOM inmediatamente)
    setThemePreview(newTheme);
  };

  const handleResetTheme = () => {
    if (confirm('¿Estás seguro de que quieres restaurar los colores por defecto?')) {
      setTheme(DEFAULT_THEME);
      // Actualizar contexto también
      setThemePreview(DEFAULT_THEME);
    }
  };

  const handleSelectLogo = () => {
    // Verificar que el media uploader de WordPress está disponible
    if (!window.wp || !window.wp.media) {
      toast.error('El media uploader de WordPress no está disponible');
      return;
    }

    // Crear el frame del media uploader
    const frame = window.wp.media({
      title: 'Seleccionar Logo del Campus (Modo Claro)',
      button: {
        text: 'Usar esta imagen'
      },
      multiple: false,
      library: {
        type: 'image'
      }
    });

    // Cuando se selecciona una imagen
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      setCampusLogo(attachment.url);
    });

    // Abrir el modal
    frame.open();
  };

  const handleRemoveLogo = () => {
    setCampusLogo('');
  };

  const handleSelectLogoDark = () => {
    // Verificar que el media uploader de WordPress está disponible
    if (!window.wp || !window.wp.media) {
      toast.error('El media uploader de WordPress no está disponible');
      return;
    }

    // Crear el frame del media uploader
    const frame = window.wp.media({
      title: 'Seleccionar Logo del Campus (Modo Oscuro)',
      button: {
        text: 'Usar esta imagen'
      },
      multiple: false,
      library: {
        type: 'image'
      }
    });

    // Cuando se selecciona una imagen
    frame.on('select', () => {
      const attachment = frame.state().get('selection').first().toJSON();
      setCampusLogoDark(attachment.url);
    });

    // Abrir el modal
    frame.open();
  };

  const handleRemoveLogoDark = () => {
    setCampusLogoDark('');
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
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'notifications'
                ? 'qe-text-primary qe-border-primary'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificaciones
            </div>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'maintenance'
                ? 'qe-text-primary qe-border-primary'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Mantenimiento
            </div>
          </button>
        </nav>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Logos del Campus
              </h2>
              <p className="text-gray-600 mb-6">
                Sube los logos que aparecerán en la barra superior del campus. El logo es clickeable y redirige a la página principal.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Modo Claro */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-medium text-gray-900">Logo Modo Claro</h3>
                  </div>
                  {campusLogo ? (
                    <div className="space-y-3">
                      <div className="w-full h-20 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-3">
                        <img 
                          src={campusLogo} 
                          alt="Campus Logo (Claro)" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSelectLogo}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectLogo}
                      className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Sun className="w-6 h-6 text-gray-400" />
                        <span className="text-gray-600 text-sm font-medium">Seleccionar logo</span>
                        <span className="text-xs text-gray-500">JPG, PNG, SVG</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Logo Modo Oscuro */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-medium text-gray-900">Logo Modo Oscuro</h3>
                  </div>
                  {campusLogoDark ? (
                    <div className="space-y-3">
                      <div className="w-full h-20 border-2 border-gray-700 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center p-3">
                        <img 
                          src={campusLogoDark} 
                          alt="Campus Logo (Oscuro)" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSelectLogoDark}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogoDark}
                          className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectLogoDark}
                      className="w-full px-4 py-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-500 hover:bg-gray-100 transition-all"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Moon className="w-6 h-6 text-gray-400" />
                        <span className="text-gray-600 text-sm font-medium">Seleccionar logo</span>
                        <span className="text-xs text-gray-500">JPG, PNG, SVG</span>
                      </div>
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    Si no se especifica, se usará el logo del modo claro
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
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
                    label="Color de Texto Principal"
                    description="Color para textos principales y títulos"
                    value={theme[previewMode].textPrimary || theme[previewMode].text}
                    onChange={(value) => handleColorChange(previewMode, 'textPrimary', value)}
                  />
                  <ColorPicker
                    label="Color de Texto Secundario"
                    description="Color para textos descriptivos y labels (más tenue)"
                    value={theme[previewMode].textSecondary || `${theme[previewMode].text}70`}
                    onChange={(value) => handleColorChange(previewMode, 'textSecondary', value)}
                  />
                  <ColorPicker
                    label="Color de Texto en Contraste"
                    description="Color de texto para usar sobre fondos de colores primarios/accent (típicamente blanco)"
                    value={theme[previewMode].textColorContrast || '#ffffff'}
                    onChange={(value) => handleColorChange(previewMode, 'textColorContrast', value)}
                  />
                  <ColorPicker
                    label="Color de Bordes"
                    description="Color de bordes de tarjetas (puede diferir del primario en modo oscuro)"
                    value={theme[previewMode].borderColor || theme[previewMode].primary}
                    onChange={(value) => handleColorChange(previewMode, 'borderColor', value)}
                  />
                  <ColorPicker
                    label="Color de Hover"
                    description="Color al pasar el cursor sobre botones y elementos interactivos"
                    value={theme[previewMode].hoverColor || theme[previewMode].accent}
                    onChange={(value) => handleColorChange(previewMode, 'hoverColor', value)}
                  />
                </div>
              </div>

              {/* Preview Section */}
              <div 
                className="p-6 rounded-lg border-2"
                style={{ 
                  backgroundColor: theme[previewMode].background,
                  borderColor: theme[previewMode].borderColor || theme[previewMode].primary
                }}
              >
                <h3 
                  className="text-sm font-medium mb-4"
                  style={{ color: theme[previewMode].textPrimary || theme[previewMode].text }}
                >
                  Vista Previa - Modo {previewMode === 'light' ? 'Claro' : 'Oscuro'}
                </h3>
                <p 
                  className="text-xs mb-4"
                  style={{ color: theme[previewMode].textSecondary || `${theme[previewMode].text}70` }}
                >
                  Texto secundario más tenue para labels y descripciones
                </p>
                <div className="flex gap-3 flex-wrap">
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer"
                    style={{ backgroundColor: theme[previewMode].primary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].hoverColor || theme[previewMode].accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].primary;
                    }}
                  >
                    Botón Principal
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer"
                    style={{ backgroundColor: theme[previewMode].secondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].hoverColor || theme[previewMode].accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].secondary;
                    }}
                  >
                    Botón Secundario
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer"
                    style={{ backgroundColor: theme[previewMode].accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].hoverColor || theme[previewMode].accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme[previewMode].accent;
                    }}
                  >
                    Botón de Acento
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg border-2 font-medium"
                    style={{
                      backgroundColor: theme[previewMode].background,
                      borderColor: theme[previewMode].borderColor || theme[previewMode].primary,
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

        {/* Email Notifications Tab */}
        {activeTab === 'notifications' && (
          <>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Notificaciones por Email
                  </h2>
                  <p className="text-gray-600">
                    Configura las notificaciones por correo electrónico cuando los estudiantes 
                    envíen comentarios o impugnaciones sobre preguntas.
                  </p>
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-700" />
                    <div>
                      <h3 className="font-medium text-gray-900">Activar Notificaciones por Email</h3>
                      <p className="text-sm text-gray-600">
                        Recibe un email cada vez que un estudiante envíe un comentario o impugnación
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={emailSettings.enabled}
                      onChange={(e) => setEmailSettings({...emailSettings, enabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>

              {/* Settings (only show when enabled) */}
              {emailSettings.enabled && (
                <div className="space-y-6">
                  {/* Admin Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email del Administrador
                    </label>
                    <input
                      type="email"
                      value={emailSettings.admin_email}
                      onChange={(e) => setEmailSettings({...emailSettings, admin_email: e.target.value})}
                      placeholder={wpAdminEmail || 'admin@ejemplo.com'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Deja vacío para usar el email de administrador de WordPress: <strong>{wpAdminEmail}</strong>
                    </p>
                  </div>

                  {/* Subject Prefix */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prefijo del Asunto
                    </label>
                    <input
                      type="text"
                      value={emailSettings.email_subject_prefix}
                      onChange={(e) => setEmailSettings({...emailSettings, email_subject_prefix: e.target.value})}
                      placeholder="[Quiz Extended]"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Este texto aparecerá al inicio del asunto de cada email
                    </p>
                  </div>

                  {/* Notification Types */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Tipos de Notificación
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={emailSettings.notify_on_feedback}
                          onChange={(e) => setEmailSettings({...emailSettings, notify_on_feedback: e.target.checked})}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                          <div>
                            <span className="font-medium text-gray-900">Comentarios / Dudas</span>
                            <p className="text-xs text-gray-500">Notificar cuando un estudiante envíe un comentario o duda sobre una pregunta</p>
                          </div>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={emailSettings.notify_on_challenge}
                          onChange={(e) => setEmailSettings({...emailSettings, notify_on_challenge: e.target.checked})}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <div>
                            <span className="font-medium text-gray-900">Impugnaciones</span>
                            <p className="text-xs text-gray-500">Notificar cuando un estudiante impugne una pregunta</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Include Question Content */}
                  <div>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailSettings.include_question_content}
                        onChange={(e) => setEmailSettings({...emailSettings, include_question_content: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Incluir contenido de la pregunta</span>
                        <p className="text-xs text-gray-500">Muestra el texto de la pregunta en el email para mayor contexto</p>
                      </div>
                    </label>
                  </div>

                  {/* Test Email Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Probar Configuración</h4>
                        <p className="text-sm text-gray-500">
                          Envía un email de prueba para verificar que todo funciona correctamente
                        </p>
                      </div>
                      <button
                        onClick={handleSendTestEmail}
                        disabled={sendingTestEmail}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingTestEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Enviar Email de Prueba
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info box when disabled */}
              {!emailSettings.enabled && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 mb-1">Notificaciones Desactivadas</h4>
                      <p className="text-sm text-amber-800">
                        Activa las notificaciones para recibir emails cuando los estudiantes envíen 
                        comentarios o impugnaciones. Esto te permitirá responder más rápidamente a sus dudas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info about WordPress email */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Sobre el Envío de Emails</h4>
                    <p className="text-sm text-blue-800">
                      Los emails se envían usando la función nativa de WordPress <code className="bg-blue-100 px-1 rounded">wp_mail()</code>. 
                      Esto significa que es compatible con cualquier plugin SMTP que tengas instalado (como WP Mail SMTP, 
                      Post SMTP, etc.) para mejorar la entregabilidad.
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      Si los emails no llegan, verifica la configuración de tu servidor de correo o instala un plugin SMTP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Mantenimiento de Base de Datos
                  </h2>
                  <p className="text-gray-600">
                    Herramientas para optimizar y limpiar la base de datos del plugin.
                  </p>
                </div>
              </div>

              {/* Database Cleanup Section */}
              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Limpieza de Opciones Autoload
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Elimina transients expirados, opciones legadas y registros temporales que pueden 
                      consumir RAM del servidor. Esta herramienta limpia:
                    </p>
                    <ul className="text-sm text-gray-600 mb-4 ml-4 list-disc space-y-1">
                      <li>Transients de rate limiting expirados</li>
                      <li>Opciones legadas <code className="bg-gray-200 px-1 rounded">qem_map_quiz_*</code></li>
                      <li>Logs de debug antiguos</li>
                      <li>Transients de seguridad expirados</li>
                    </ul>
                    <button
                      onClick={handleOpenCleanupModal}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Database className="w-4 h-4" />
                      Ejecutar Limpieza
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 mb-1">Importante</h4>
                    <p className="text-sm text-amber-800">
                      La limpieza es segura y solo elimina datos temporales o legados. No afecta 
                      a los cursos, lecciones, quizzes ni al progreso de los estudiantes.
                    </p>
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

      {/* Database Cleanup Modal */}
      {cleanupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseCleanupModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Limpieza de Base de Datos</h3>
              </div>
              <button
                onClick={handleCloseCleanupModal}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {cleanupLoading && !cleanupResults && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Analizando base de datos...</span>
                </div>
              )}

              {/* Before Cleanup Stats */}
              {cleanupStats && !cleanupResults && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Estado Actual de la Base de Datos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <HardDrive className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-700">Transients QE</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{cleanupStats.qe_transients || 0}</p>
                        <p className="text-xs text-gray-500">registros temporales</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Trash2 className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-gray-700">Opciones Legadas</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{cleanupStats.qem_map_quiz_options || 0}</p>
                        <p className="text-xs text-gray-500">qem_map_quiz_*</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-gray-700">Autoload Total</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{cleanupStats.autoload_size_mb || 0} MB</p>
                        <p className="text-xs text-gray-500">cargado en cada request</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-gray-700">Rate Limits</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{cleanupStats.rate_limit_transients || 0}</p>
                        <p className="text-xs text-gray-500">transients de seguridad</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {(cleanupStats.qe_transients > 100 || cleanupStats.qem_map_quiz_options > 0) ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900">Se recomienda limpieza</h4>
                          <p className="text-sm text-amber-800">
                            Se detectaron registros que pueden estar consumiendo RAM innecesariamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">Base de datos optimizada</h4>
                          <p className="text-sm text-green-800">
                            No se detectaron problemas significativos. Puedes ejecutar la limpieza de todas formas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Run Cleanup Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCloseCleanupModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRunCleanup}
                      disabled={cleanupLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {cleanupLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Limpiando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Ejecutar Limpieza
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Cleanup Results */}
              {cleanupResults && (
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">¡Limpieza completada!</h4>
                        <p className="text-sm text-green-800">
                          Se liberaron <strong>{cleanupResults.ram_freed_mb || 0} MB</strong> de RAM
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Before/After Comparison */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Resultados de la Limpieza</h4>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Métrica</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Antes</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Después</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Eliminados</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">Transients QE</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.before?.qe_transients || 0}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.after?.qe_transients || 0}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-green-600">
                              -{(cleanupResults.before?.qe_transients || 0) - (cleanupResults.after?.qe_transients || 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">Opciones qem_map_quiz_*</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.before?.qem_map_quiz || 0}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.after?.qem_map_quiz || 0}</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-green-600">
                              -{cleanupResults.deleted?.qem_map_quiz || 0}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">Tamaño Autoload</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.before?.autoload_size_mb || 0} MB</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{cleanupResults.after?.autoload_size_mb || 0} MB</td>
                            <td className="px-4 py-3 text-sm text-center font-medium text-green-600">
                              -{cleanupResults.ram_freed_mb || 0} MB
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed Deletions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Detalles de Eliminación</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Rate Limit Transients:</span>
                        <span className="ml-2 font-medium text-gray-900">{cleanupResults.deleted?.rate_limit_transients || 0}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Violations Transients:</span>
                        <span className="ml-2 font-medium text-gray-900">{cleanupResults.deleted?.violations_transients || 0}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Login Transients:</span>
                        <span className="ml-2 font-medium text-gray-900">{cleanupResults.deleted?.login_transients || 0}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Expired Transients:</span>
                        <span className="ml-2 font-medium text-gray-900">{cleanupResults.deleted?.expired_transients || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseCleanupModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
