// src/pages/SettingsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Save, Settings, Percent, Hash, Palette, Sun, Moon, RotateCcw, Mail, Bell, AlertTriangle, MessageSquare, Send, Loader2, CheckCircle, Database, RefreshCw, Search, Copy } from 'lucide-react';
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
  const { theme: contextTheme, setThemePreview, getColor, isDarkMode } = useTheme();

  // pageColors pattern - unified with MessagesManager/BooksManager
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  }), [getColor, isDarkMode]);
  
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
  const [updatingDifficulty, setUpdatingDifficulty] = useState(false);

  // DB Consults state
  const [dbConsultType, setDbConsultType] = useState('question');
  const [dbConsultId, setDbConsultId] = useState('');
  const [dbConsultResult, setDbConsultResult] = useState(null);
  const [dbConsultError, setDbConsultError] = useState(null);
  const [dbConsultLoading, setDbConsultLoading] = useState(false);
  const [dbConsultCopied, setDbConsultCopied] = useState(false);

  // Question chain analysis state
  const [chainId, setChainId] = useState('');
  const [chainResult, setChainResult] = useState(null);
  const [chainError, setChainError] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainCopied, setChainCopied] = useState(false);
  


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

  const handleUpdateQuestionDifficulty = async () => {
    if (!confirm('¿Estás seguro de que quieres actualizar la dificultad de todas las preguntas basándose en sus cuestionarios? Esta operación puede tardar unos minutos.')) {
      return;
    }

    setUpdatingDifficulty(true);
    try {
      const response = await fetch('/wp-json/quiz-extended/v1/batch/update-question-difficulty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.qe_data?.nonce || '',
        },
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const result = await response.json();
      toast.success(result.message || 'Dificultad actualizada correctamente');
      
      if (result.stats) {
        console.log('Estadísticas de actualización:', result.stats);
      }
    } catch (error) {
      console.error('Error updating question difficulty:', error);
      toast.error('Error al actualizar la dificultad de las preguntas');
    } finally {
      setUpdatingDifficulty(false);
    }
  };

  const handleDbConsult = async () => {
    if (!dbConsultId) return;
    setDbConsultLoading(true);
    setDbConsultResult(null);
    setDbConsultError(null);
    try {
      const response = await fetch(
        `/wp-json/quiz-extended/v1/debug/db-consult?type=${dbConsultType}&id=${parseInt(dbConsultId)}`,
        {
          headers: {
            'X-WP-Nonce': window.qe_data?.nonce || '',
          },
        }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        setDbConsultError(json.message || 'Error fetching data');
      } else {
        setDbConsultResult(json.data);
      }
    } catch (err) {
      setDbConsultError(err.message || 'Network error');
    } finally {
      setDbConsultLoading(false);
    }
  };

  const handleDbConsultCopy = () => {
    if (!dbConsultResult) return;
    navigator.clipboard.writeText(JSON.stringify(dbConsultResult, null, 2));
    setDbConsultCopied(true);
    setTimeout(() => setDbConsultCopied(false), 2000);
  };

  const handleChainAnalysis = async () => {
    if (!chainId) return;
    setChainLoading(true);
    setChainResult(null);
    setChainError(null);
    try {
      const response = await fetch(
        `/wp-json/quiz-extended/v1/debug/question-chain?id=${parseInt(chainId)}`,
        { headers: { 'X-WP-Nonce': window.qe_data?.nonce || '' } }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        setChainError(json.message || 'Error fetching chain');
      } else {
        setChainResult(json.data);
      }
    } catch (err) {
      setChainError(err.message || 'Network error');
    } finally {
      setChainLoading(false);
    }
  };

  const handleChainCopy = () => {
    if (!chainResult) return;
    navigator.clipboard.writeText(JSON.stringify(chainResult, null, 2));
    setChainCopied(true);
    setTimeout(() => setChainCopied(false), 2000);
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
      <div className="space-y-2">
        <label className="block text-xs font-semibold" style={{ color: pageColors.text }}>
          {label}
        </label>
        <div className="flex items-center gap-2">
          {/* Selector de color circular */}
          <button
            type="button"
            onClick={handleOpenPicker}
            className="w-8 h-8 rounded-lg border-2 shadow-sm cursor-pointer hover:scale-105 transition-all focus:outline-none flex-shrink-0"
            style={{ 
              backgroundColor: safeValue,
              borderColor: pageColors.cardBorder
            }}
            title="Elegir color"
          />
          
          {/* Input de texto */}
          <input
            type="text"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            className="w-full px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 font-mono text-xs transition-all"
            style={{ 
              backgroundColor: pageColors.inputBg,
              border: `1px solid ${pageColors.cardBorder}`,
              color: pageColors.text,
              '--tw-ring-color': pageColors.accent
            }}
            placeholder="#000000"
          />
        </div>
        
        {/* Modal del selector de color */}
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
            <div 
              className="rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" 
              style={{ 
                backgroundColor: pageColors.bgCard,
                boxShadow: pageColors.shadow
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
                Seleccionar {label}
              </h3>
              <p className="text-sm mb-4 flex items-center gap-2" style={{ color: pageColors.textMuted }}>
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
                  className="w-full h-48 cursor-crosshair rounded-xl transition-colors"
                  style={{ border: `2px solid ${pageColors.cardBorder}` }}
                />
              </div>
              
              {/* Vista previa y valor hex */}
              <div className="mb-6 flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl shadow-sm"
                  style={{ 
                    backgroundColor: tempValue,
                    border: `2px solid ${pageColors.cardBorder}`
                  }}
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
                    Código de color
                  </label>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={handleColorChange}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 font-mono text-sm"
                    style={{ 
                      backgroundColor: pageColors.inputBg,
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.text,
                      '--tw-ring-color': pageColors.accent
                    }}
                  />
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl font-medium transition-all focus:outline-none"
                  style={{ 
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.cardBorder}`,
                    color: pageColors.text
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 rounded-xl font-medium transition-all focus:outline-none"
                  style={{ 
                    background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                    color: '#fff',
                    boxShadow: `0 4px 12px ${pageColors.accentGlow}`
                  }}
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
      <div className="flex flex-col h-[calc(100vh-100px)]" style={{ backgroundColor: pageColors.bgPage }}>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: pageColors.accent }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]" style={{ backgroundColor: pageColors.bgPage }}>
      {/* TOP BAR - Unified with MessagesManager/BooksManager */}
      <div 
        className="flex items-center justify-between px-6 py-4" 
        style={{ 
          backgroundColor: pageColors.bgCard, 
          borderBottom: `1px solid ${pageColors.cardBorder}`,
          boxShadow: pageColors.shadowSm
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="p-2.5 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
              boxShadow: `0 4px 12px ${pageColors.accentGlow}`
            }}
          >
            <Settings size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: pageColors.text }}>
              Configuración
            </h1>
            <p className="text-xs mt-0.5" style={{ color: pageColors.textMuted }}>
              Opciones globales del sistema
            </p>
          </div>
        </div>
        
        {activeTab !== 'db-consults' && <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 focus:outline-none"
          style={{ 
            background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
            color: '#fff',
            boxShadow: `0 4px 12px ${pageColors.accentGlow}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 6px 20px ${pageColors.accentGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 12px ${pageColors.accentGlow}`;
          }}
        >
          <Save size={18} />
          <span>{loading ? 'Guardando...' : 'Guardar'}</span>
        </button>}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden p-4">
        <div 
          className="h-full rounded-2xl overflow-hidden flex flex-col"
          style={{ 
            backgroundColor: pageColors.bgCard,
            boxShadow: pageColors.shadow,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-4" style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}>
            {[
              { id: 'general', label: 'General', icon: Settings },
              { id: 'theme', label: 'Tema', icon: Palette },
              { id: 'notifications', label: 'Notificaciones', icon: Bell },
              { id: 'maintenance', label: 'Mantenimiento', icon: Database },
              { id: 'db-consults', label: 'DB Consults', icon: Search },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all focus:outline-none"
                  style={{ 
                    color: isActive ? pageColors.accent : pageColors.textMuted,
                    borderBottom: isActive ? `2px solid ${pageColors.accent}` : '2px solid transparent',
                    marginBottom: '-1px'
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: pageColors.bgPage }}>
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logos Section */}
            <div 
              className="p-6 rounded-xl"
              style={{ 
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
                Logos del Campus
              </h2>
              <p className="text-sm mb-6" style={{ color: pageColors.textMuted }}>
                Sube los logos que aparecerán en la barra superior del campus.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Modo Claro */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5" style={{ color: pageColors.warning }} />
                    <h3 className="font-medium" style={{ color: pageColors.text }}>Logo Modo Claro</h3>
                  </div>
                  {campusLogo ? (
                    <div className="space-y-3">
                      <div 
                        className="w-full h-20 rounded-xl overflow-hidden flex items-center justify-center p-3"
                        style={{ 
                          backgroundColor: '#ffffff',
                          border: `2px solid ${pageColors.cardBorder}`
                        }}
                      >
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
                          className="flex-1 px-3 py-2 text-sm rounded-xl transition-all focus:outline-none"
                          style={{ 
                            backgroundColor: pageColors.primary,
                            color: '#fff'
                          }}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-2 text-sm rounded-xl transition-all focus:outline-none"
                          style={{ 
                            backgroundColor: pageColors.error,
                            color: '#fff'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectLogo}
                      className="w-full px-4 py-6 rounded-xl transition-all focus:outline-none"
                      style={{ 
                        backgroundColor: pageColors.inputBg,
                        border: `2px dashed ${pageColors.cardBorder}`
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Sun className="w-6 h-6" style={{ color: pageColors.textMuted }} />
                        <span className="text-sm font-medium" style={{ color: pageColors.textMuted }}>Seleccionar logo</span>
                        <span className="text-xs" style={{ color: pageColors.textMuted }}>JPG, PNG, SVG</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Logo Modo Oscuro */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5" style={{ color: pageColors.primary }} />
                    <h3 className="font-medium" style={{ color: pageColors.text }}>Logo Modo Oscuro</h3>
                  </div>
                  {campusLogoDark ? (
                    <div className="space-y-3">
                      <div 
                        className="w-full h-20 rounded-xl overflow-hidden flex items-center justify-center p-3"
                        style={{ 
                          backgroundColor: '#1f2937',
                          border: `2px solid ${pageColors.cardBorder}`
                        }}
                      >
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
                          className="flex-1 px-3 py-2 text-sm rounded-xl transition-all focus:outline-none"
                          style={{ 
                            backgroundColor: pageColors.primary,
                            color: '#fff'
                          }}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogoDark}
                          className="px-3 py-2 text-sm rounded-xl transition-all focus:outline-none"
                          style={{ 
                            backgroundColor: pageColors.error,
                            color: '#fff'
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectLogoDark}
                      className="w-full px-4 py-6 rounded-xl transition-all focus:outline-none"
                      style={{ 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: `2px dashed ${pageColors.cardBorder}`
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Moon className="w-6 h-6" style={{ color: pageColors.textMuted }} />
                        <span className="text-sm font-medium" style={{ color: pageColors.textMuted }}>Seleccionar logo</span>
                        <span className="text-xs" style={{ color: pageColors.textMuted }}>JPG, PNG, SVG</span>
                      </div>
                    </button>
                  )}
                  <p className="text-xs" style={{ color: pageColors.textMuted }}>
                    Si no se especifica, se usará el logo del modo claro
                  </p>
                </div>
              </div>
            </div>

            {/* Score Format Section */}
            <div 
              className="p-6 rounded-xl"
              style={{ 
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: pageColors.text }}>
                Formato de Puntuación
              </h2>
              <p className="text-sm mb-6" style={{ color: pageColors.textMuted }}>
                Selecciona cómo se mostrarán las puntuaciones en toda la plataforma
              </p>

              <div className="space-y-4">
                {/* Percentage Option */}
                <label 
                  className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: scoreFormat === 'percentage' ? pageColors.accentGlow : pageColors.inputBg,
                    border: `2px solid ${scoreFormat === 'percentage' ? pageColors.accent : pageColors.cardBorder}`
                  }}
                >
                  <input
                    type="radio"
                    name="scoreFormat"
                    value="percentage"
                    checked={scoreFormat === 'percentage'}
                    onChange={(e) => setScoreFormat(e.target.value)}
                    className="mt-1 w-5 h-5"
                    style={{ accentColor: pageColors.accent }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-5 h-5" style={{ color: pageColors.accent }} />
                      <span className="font-medium" style={{ color: pageColors.text }}>Porcentaje (0-100%)</span>
                    </div>
                    <p className="text-sm" style={{ color: pageColors.textMuted }}>
                      Las puntuaciones se mostrarán como porcentajes del 0% al 100%
                    </p>
                    <div className="mt-2 text-sm" style={{ color: pageColors.textMuted }}>
                      Ejemplo: <span 
                        className="font-mono px-2 py-1 rounded" 
                        style={{ backgroundColor: pageColors.hoverBg }}
                      >75%</span>
                    </div>
                  </div>
                </label>

                {/* Base 10 Option */}
                <label 
                  className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: scoreFormat === 'base10' ? pageColors.accentGlow : pageColors.inputBg,
                    border: `2px solid ${scoreFormat === 'base10' ? pageColors.accent : pageColors.cardBorder}`
                  }}
                >
                  <input
                    type="radio"
                    name="scoreFormat"
                    value="base10"
                    checked={scoreFormat === 'base10'}
                    onChange={(e) => setScoreFormat(e.target.value)}
                    className="mt-1 w-5 h-5"
                    style={{ accentColor: pageColors.accent }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-5 h-5" style={{ color: pageColors.accent }} />
                      <span className="font-medium" style={{ color: pageColors.text }}>Base 10 (0-10)</span>
                    </div>
                    <p className="text-sm" style={{ color: pageColors.textMuted }}>
                      Las puntuaciones se mostrarán en escala del 0 al 10 (estilo español)
                    </p>
                    <div className="mt-2 text-sm" style={{ color: pageColors.textMuted }}>
                      Ejemplo: <span 
                        className="font-mono px-2 py-1 rounded" 
                        style={{ backgroundColor: pageColors.hoverBg }}
                      >7.5/10</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Theme Settings Tab */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Left Column - Header + Color Pickers */}
            <div className="xl:col-span-2 space-y-6">
              {/* Header with Reset */}
              <div 
                className="p-6 rounded-xl"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadowSm
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: pageColors.text }}>
                      Personalización del Tema
                    </h2>
                    <p className="text-sm mt-1" style={{ color: pageColors.textMuted }}>
                      Configura los colores para el modo claro y oscuro.
                    </p>
                  </div>
                  <button
                    onClick={handleResetTheme}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all focus:outline-none"
                    style={{ 
                      backgroundColor: pageColors.inputBg,
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.text
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restaurar
                  </button>
                </div>

                {/* Mode Selector */}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5" style={{ color: pageColors.text }} />
                    <div>
                      <h3 className="font-medium" style={{ color: pageColors.text }}>Modo de Edición</h3>
                      <p className="text-xs" style={{ color: pageColors.textMuted }}>
                        Elige qué modo quieres editar
                      </p>
                    </div>
                  </div>
                  <div 
                    className="flex items-center gap-1 p-1 rounded-xl"
                    style={{ 
                      backgroundColor: pageColors.bgCard,
                      border: `1px solid ${pageColors.cardBorder}`
                    }}
                  >
                    <button
                      onClick={() => setPreviewMode('light')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all focus:outline-none"
                      style={{ 
                        backgroundColor: previewMode === 'light' ? pageColors.accent : 'transparent',
                        color: previewMode === 'light' ? '#fff' : pageColors.textMuted
                      }}
                    >
                      <Sun className="w-4 h-4" />
                      Claro
                    </button>
                    <button
                      onClick={() => setPreviewMode('dark')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all focus:outline-none"
                      style={{ 
                        backgroundColor: previewMode === 'dark' ? pageColors.accent : 'transparent',
                        color: previewMode === 'dark' ? '#fff' : pageColors.textMuted
                      }}
                    >
                      <Moon className="w-4 h-4" />
                      Oscuro
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Pickers */}
              <div 
                className="p-6 rounded-xl"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadowSm
                }}
              >
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: pageColors.text }}>
                  {previewMode === 'light' ? (
                    <>
                      <Sun className="w-5 h-5" style={{ color: pageColors.warning }} />
                      Colores del Modo Claro
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5" style={{ color: pageColors.primary }} />
                      Colores del Modo Oscuro
                    </>
                  )}
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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
                  description="Color para textos descriptivos"
                  value={theme[previewMode].textSecondary || `${theme[previewMode].text}70`}
                  onChange={(value) => handleColorChange(previewMode, 'textSecondary', value)}
                />
                <ColorPicker
                  label="Color de Texto en Contraste"
                  description="Color de texto sobre fondos de colores"
                  value={theme[previewMode].textColorContrast || '#ffffff'}
                  onChange={(value) => handleColorChange(previewMode, 'textColorContrast', value)}
                />
                <ColorPicker
                  label="Color de Bordes"
                  description="Color de bordes de tarjetas"
                  value={theme[previewMode].borderColor || theme[previewMode].primary}
                  onChange={(value) => handleColorChange(previewMode, 'borderColor', value)}
                />
                <ColorPicker
                  label="Color de Hover"
                  description="Color al pasar el cursor"
                  value={theme[previewMode].hoverColor || theme[previewMode].accent}
                  onChange={(value) => handleColorChange(previewMode, 'hoverColor', value)}
                />
              </div>
            </div>
            </div>

            {/* Right Column - Preview + Info */}
            <div className="space-y-6">
              {/* Preview Section */}
              <div 
                className="p-6 rounded-xl sticky top-4"
                style={{ 
                  backgroundColor: theme[previewMode].background,
                  border: `2px solid ${theme[previewMode].borderColor || theme[previewMode].primary}`
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
                  Texto secundario para labels y descripciones
                </p>
                <div className="flex flex-col gap-2">
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer text-center text-sm"
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
                    className="px-4 py-2 rounded-lg text-white font-medium text-center text-sm"
                    style={{ backgroundColor: theme[previewMode].secondary }}
                  >
                    Botón Secundario
                  </div>
                  <div
                    className="px-4 py-2 rounded-lg text-white font-medium text-center text-sm"
                    style={{ backgroundColor: theme[previewMode].accent }}
                  >
                    Botón de Acento
                  </div>
                </div>
              </div>

              {/* Info */}
              <div 
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe',
                  border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#93c5fd'}`
                }}
              >
                <Sun className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: pageColors.info }} />
                <div>
                  <h4 className="font-medium mb-1 text-sm" style={{ color: pageColors.info }}>Detección Automática</h4>
                  <p className="text-xs" style={{ color: pageColors.info }}>
                    El plugin detectará automáticamente el modo oscuro según las preferencias del sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Enable Toggle */}
            <div 
              className="p-6 rounded-xl"
              style={{ 
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" style={{ color: pageColors.text }} />
                  <div>
                    <h3 className="font-medium" style={{ color: pageColors.text }}>Activar Notificaciones por Email</h3>
                    <p className="text-sm" style={{ color: pageColors.textMuted }}>
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
                  <div 
                    className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ 
                      backgroundColor: emailSettings.enabled ? pageColors.accent : pageColors.textMuted
                    }}
                  ></div>
                </div>
              </label>
            </div>

            {/* Settings (only show when enabled) */}
            {emailSettings.enabled && (
              <>
                {/* Admin Email */}
                <div 
                  className="p-6 rounded-xl space-y-6"
                  style={{ 
                    backgroundColor: pageColors.bgCard,
                    border: `1px solid ${pageColors.cardBorder}`,
                    boxShadow: pageColors.shadowSm
                  }}
                >
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: pageColors.text }}>
                      Email del Administrador
                    </label>
                    <input
                      type="email"
                      value={emailSettings.admin_email}
                      onChange={(e) => setEmailSettings({...emailSettings, admin_email: e.target.value})}
                      placeholder={wpAdminEmail || 'admin@ejemplo.com'}
                      className="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`,
                        color: pageColors.text,
                        '--tw-ring-color': pageColors.accent
                      }}
                    />
                    <p className="mt-1 text-xs" style={{ color: pageColors.textMuted }}>
                      Deja vacío para usar el email de administrador de WordPress: <strong>{wpAdminEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: pageColors.text }}>
                      Prefijo del Asunto
                    </label>
                    <input
                      type="text"
                      value={emailSettings.email_subject_prefix}
                      onChange={(e) => setEmailSettings({...emailSettings, email_subject_prefix: e.target.value})}
                      placeholder="[Quiz Extended]"
                      className="w-full px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`,
                        color: pageColors.text,
                        '--tw-ring-color': pageColors.accent
                      }}
                    />
                    <p className="mt-1 text-xs" style={{ color: pageColors.textMuted }}>
                      Este texto aparecerá al inicio del asunto de cada email
                    </p>
                  </div>
                </div>

                {/* Notification Types */}
                <div 
                  className="p-6 rounded-xl"
                  style={{ 
                    backgroundColor: pageColors.bgCard,
                    border: `1px solid ${pageColors.cardBorder}`,
                    boxShadow: pageColors.shadowSm
                  }}
                >
                  <label className="block text-sm font-semibold mb-4" style={{ color: pageColors.text }}>
                    Tipos de Notificación
                  </label>
                  <div className="space-y-3">
                    <label 
                      className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                      style={{ 
                        backgroundColor: emailSettings.notify_on_feedback ? pageColors.accentGlow : pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={emailSettings.notify_on_feedback}
                        onChange={(e) => setEmailSettings({...emailSettings, notify_on_feedback: e.target.checked})}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: pageColors.info }}
                      />
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" style={{ color: pageColors.info }} />
                        <div>
                          <span className="font-medium" style={{ color: pageColors.text }}>Comentarios / Dudas</span>
                          <p className="text-xs" style={{ color: pageColors.textMuted }}>Notificar cuando un estudiante envíe un comentario o duda</p>
                        </div>
                      </div>
                    </label>
                    
                    <label 
                      className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                      style={{ 
                        backgroundColor: emailSettings.notify_on_challenge ? pageColors.accentGlow : pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={emailSettings.notify_on_challenge}
                        onChange={(e) => setEmailSettings({...emailSettings, notify_on_challenge: e.target.checked})}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: pageColors.warning }}
                      />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" style={{ color: pageColors.warning }} />
                        <div>
                          <span className="font-medium" style={{ color: pageColors.text }}>Impugnaciones</span>
                          <p className="text-xs" style={{ color: pageColors.textMuted }}>Notificar cuando un estudiante impugne una pregunta</p>
                        </div>
                      </div>
                    </label>

                    <label 
                      className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                      style={{ 
                        backgroundColor: emailSettings.include_question_content ? pageColors.accentGlow : pageColors.inputBg,
                        border: `1px solid ${pageColors.cardBorder}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={emailSettings.include_question_content}
                        onChange={(e) => setEmailSettings({...emailSettings, include_question_content: e.target.checked})}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: pageColors.accent }}
                      />
                      <div>
                        <span className="font-medium" style={{ color: pageColors.text }}>Incluir contenido de la pregunta</span>
                        <p className="text-xs" style={{ color: pageColors.textMuted }}>Muestra el texto de la pregunta en el email</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Test Email */}
                <div 
                  className="p-6 rounded-xl flex items-center justify-between"
                  style={{ 
                    backgroundColor: pageColors.bgCard,
                    border: `1px solid ${pageColors.cardBorder}`,
                    boxShadow: pageColors.shadowSm
                  }}
                >
                  <div>
                    <h4 className="font-medium" style={{ color: pageColors.text }}>Probar Configuración</h4>
                    <p className="text-sm" style={{ color: pageColors.textMuted }}>
                      Envía un email de prueba para verificar que todo funciona
                    </p>
                  </div>
                  <button
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all focus:outline-none disabled:opacity-50"
                    style={{ 
                      backgroundColor: pageColors.success,
                      color: '#fff'
                    }}
                  >
                    {sendingTestEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Prueba
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Info box when disabled */}
            {!emailSettings.enabled && (
              <div 
                className="p-4 rounded-xl flex items-start gap-3 lg:col-span-2"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                  border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fcd34d'}`
                }}
              >
                <Mail className="w-5 h-5 mt-0.5" style={{ color: pageColors.warning }} />
                <div>
                  <h4 className="font-medium mb-1" style={{ color: pageColors.warning }}>Notificaciones Desactivadas</h4>
                  <p className="text-sm" style={{ color: isDarkMode ? pageColors.warning : '#92400e' }}>
                    Activa las notificaciones para recibir emails cuando los estudiantes envíen 
                    comentarios o impugnaciones.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="grid grid-cols-1 gap-6">
            <div 
              className="p-6 rounded-xl"
              style={{ 
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: pageColors.accentGlow }}
                >
                  <RefreshCw className="w-6 h-6" style={{ color: pageColors.accent }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: pageColors.text }}>
                    Actualizar Dificultad de Preguntas
                  </h3>
                  <p className="text-sm mb-4" style={{ color: pageColors.textMuted }}>
                    Esta operación actualizará la dificultad de todas las preguntas basándose en la dificultad 
                    del cuestionario al que pertenecen. Las preguntas que no estén asociadas a ningún cuestionario 
                    mantendrán su dificultad actual o se les asignará "medio" por defecto.
                  </p>
                  <div 
                    className="p-4 rounded-xl mb-4"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7',
                      border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fcd34d'}`
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: pageColors.warning }} />
                      <div>
                        <h4 className="font-medium mb-1" style={{ color: pageColors.warning }}>
                          Importante
                        </h4>
                        <p className="text-sm" style={{ color: isDarkMode ? pageColors.warning : '#92400e' }}>
                          • Esta operación puede tardar varios minutos dependiendo del número de preguntas<br />
                          • Se recomienda hacer un respaldo antes de ejecutar<br />
                          • Las preguntas ya actualizadas se omitirán automáticamente
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateQuestionDifficulty}
                    disabled={updatingDifficulty}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all focus:outline-none disabled:opacity-50"
                    style={{ 
                      backgroundColor: pageColors.accent,
                      color: '#fff'
                    }}
                  >
                    {updatingDifficulty ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Ejecutar Actualización
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DB Consults Tab */}
        {activeTab === 'db-consults' && (
          <div className="space-y-6">
            {/* Entity type + ID selector */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: pageColors.text }}>
                DB Consults
              </h2>
              <p className="text-sm mb-6" style={{ color: pageColors.textMuted }}>
                Retrieve all raw DB data (post row + postmeta + taxonomies) for any entity by ID.
              </p>

              {/* Type selector */}
              <div className="flex flex-wrap gap-2 mb-5">
                {['question', 'lesson', 'quiz', 'course'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setDbConsultType(t); setDbConsultResult(null); setDbConsultError(null); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none capitalize"
                    style={{
                      backgroundColor: dbConsultType === t ? pageColors.accent : pageColors.inputBg,
                      color: dbConsultType === t ? '#fff' : pageColors.text,
                      border: `1px solid ${dbConsultType === t ? pageColors.accent : pageColors.cardBorder}`
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* ID input + query button */}
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  value={dbConsultId}
                  onChange={e => setDbConsultId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDbConsult()}
                  placeholder="Enter ID..."
                  className="flex-1 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 font-mono"
                  style={{
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.cardBorder}`,
                    color: pageColors.text,
                    '--tw-ring-color': pageColors.accent
                  }}
                />
                <button
                  onClick={handleDbConsult}
                  disabled={dbConsultLoading || !dbConsultId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all focus:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: pageColors.accent,
                    color: '#fff'
                  }}
                >
                  {dbConsultLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Query
                </button>
              </div>
            </div>

            {/* Error */}
            {dbConsultError && (
              <div
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                  border: `1px solid ${isDarkMode ? 'rgba(239,68,68,0.3)' : '#fca5a5'}`
                }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: pageColors.error }} />
                <p className="text-sm" style={{ color: pageColors.error }}>{dbConsultError}</p>
              </div>
            )}

            {/* Result */}
            {dbConsultResult && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadowSm
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}
                >
                  <span className="text-sm font-semibold" style={{ color: pageColors.text }}>
                    Result — {dbConsultType} #{dbConsultId}
                  </span>
                  <button
                    onClick={handleDbConsultCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none"
                    style={{
                      backgroundColor: dbConsultCopied ? pageColors.success : pageColors.inputBg,
                      color: dbConsultCopied ? '#fff' : pageColors.text,
                      border: `1px solid ${pageColors.cardBorder}`
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {dbConsultCopied ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  className="p-4 overflow-auto text-xs font-mono leading-relaxed"
                  style={{
                    color: pageColors.text,
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                    maxHeight: '60vh'
                  }}
                >
                  {JSON.stringify(dbConsultResult, null, 2)}
                </pre>
              </div>
            )}

            {/* ── Question Chain Analysis ─────────────────────────────────── */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: pageColors.bgCard,
                border: `1px solid ${pageColors.cardBorder}`,
                boxShadow: pageColors.shadowSm
              }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: pageColors.text }}>
                Question Chain Analysis
              </h2>
              <p className="text-sm mb-6" style={{ color: pageColors.textMuted }}>
                Given a question ID, traces the full path: <strong>Question → Quizzes → Lessons → Courses</strong> using both reverse lookups and the question's own meta IDs. Flags inconsistencies.
              </p>

              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  value={chainId}
                  onChange={e => setChainId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChainAnalysis()}
                  placeholder="Question ID..."
                  className="flex-1 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 font-mono"
                  style={{
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.cardBorder}`,
                    color: pageColors.text,
                    '--tw-ring-color': pageColors.accent
                  }}
                />
                <button
                  onClick={handleChainAnalysis}
                  disabled={chainLoading || !chainId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all focus:outline-none disabled:opacity-50"
                  style={{ backgroundColor: pageColors.primary, color: '#fff' }}
                >
                  {chainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Analyze
                </button>
              </div>
            </div>

            {/* Chain error */}
            {chainError && (
              <div
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                  border: `1px solid ${isDarkMode ? 'rgba(239,68,68,0.3)' : '#fca5a5'}`
                }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: pageColors.error }} />
                <p className="text-sm" style={{ color: pageColors.error }}>{chainError}</p>
              </div>
            )}

            {/* Chain result — visual tree */}
            {chainResult && (() => {
              const { question, chain, meta_resolved, summary } = chainResult;
              const hasWarnings = summary.warnings?.length > 0;
              const pill = (label, color) => (
                <span className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: color + '22', color }}>{label}</span>
              );
              return (
                <div className="space-y-4">
                  {/* Header / copy */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: pageColors.bgCard, border: `1px solid ${pageColors.cardBorder}`, boxShadow: pageColors.shadowSm }}
                  >
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}>
                      <span className="text-sm font-semibold" style={{ color: pageColors.text }}>
                        Chain — Question #{chainId}: &quot;{question.title}&quot;
                      </span>
                      <button
                        onClick={handleChainCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none"
                        style={{
                          backgroundColor: chainCopied ? pageColors.success : pageColors.inputBg,
                          color: chainCopied ? '#fff' : pageColors.text,
                          border: `1px solid ${pageColors.cardBorder}`
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {chainCopied ? 'Copied!' : 'Copy JSON'}
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Warnings */}
                      {hasWarnings && (
                        <div className="space-y-1.5">
                          {summary.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                              style={{ backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : '#fef3c7', color: pageColors.warning }}>
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              {w}
                            </div>
                          ))}
                        </div>
                      )}
                      {!hasWarnings && (
                        <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg"
                          style={{ backgroundColor: isDarkMode ? 'rgba(16,185,129,0.1)' : '#d1fae5', color: pageColors.success }}>
                          <CheckCircle className="w-3.5 h-3.5" /> All connections are consistent
                        </div>
                      )}

                      {/* Question info */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: pageColors.textMuted }}>QUESTION</p>
                        <div className="flex flex-wrap gap-2 items-center text-xs" style={{ color: pageColors.text }}>
                          <span className="font-mono">#{question.id}</span>
                          <span className="font-medium">{question.title}</span>
                          {pill(question.status, question.status === 'publish' ? pageColors.success : pageColors.warning)}
                          {Object.entries(question.taxonomies || {}).map(([tax, terms]) =>
                            terms.map(t => <span key={t.id} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: pageColors.hoverBg, color: pageColors.textMuted }}>{tax}: {t.name}</span>)
                          )}
                        </div>
                        <div className="mt-2 text-xs font-mono" style={{ color: pageColors.textMuted }}>
                          meta _course_ids: {JSON.stringify(question.meta_ids._course_ids)} &nbsp;|&nbsp;
                          _lesson_ids: {JSON.stringify(question.meta_ids._lesson_ids)}
                        </div>
                      </div>

                      {/* Chain */}
                      {chain.length === 0 && (
                        <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: pageColors.hoverBg, color: pageColors.textMuted }}>
                          No quiz found that lists this question in _quiz_question_ids.
                        </div>
                      )}
                      {chain.map((entry, qi) => (
                        <div key={qi} className="border-l-2 pl-4 space-y-2" style={{ borderColor: pageColors.primary }}>
                          <div className="flex flex-wrap gap-2 items-center text-xs">
                            <span className="font-bold" style={{ color: pageColors.primary }}>Quiz</span>
                            <span className="font-mono" style={{ color: pageColors.text }}>#{entry.quiz_id}</span>
                            <span style={{ color: pageColors.text }}>{entry.quiz_title}</span>
                            {pill(entry.quiz_status, entry.quiz_status === 'publish' ? pageColors.success : pageColors.warning)}
                            <span style={{ color: pageColors.textMuted }}>_course_id: {entry.quiz_course_id_meta || 'none'}</span>
                            <span style={{ color: pageColors.textMuted }}>({entry.question_ids_in_quiz?.length ?? 0} questions)</span>
                          </div>

                          {entry.lessons.length === 0 && (
                            <div className="text-xs ml-4" style={{ color: pageColors.warning }}>⚠ Not referenced by any lesson</div>
                          )}
                          {entry.lessons.map((l, li) => (
                            <div key={li} className="border-l-2 pl-4 ml-2 space-y-1" style={{ borderColor: pageColors.accent }}>
                              <div className="flex flex-wrap gap-2 items-center text-xs">
                                <span className="font-bold" style={{ color: pageColors.accent }}>Lesson</span>
                                <span className="font-mono" style={{ color: pageColors.text }}>#{l.lesson_id}</span>
                                <span style={{ color: pageColors.text }}>{l.lesson_title}</span>
                                {pill(l.lesson_status, l.lesson_status === 'publish' ? pageColors.success : pageColors.warning)}
                                <span style={{ color: pageColors.textMuted }}>via {l.found_via}</span>
                              </div>
                              {l.course ? (
                                <div className="flex flex-wrap gap-2 items-center text-xs ml-4">
                                  <span className="font-bold" style={{ color: pageColors.info }}>Course</span>
                                  <span className="font-mono" style={{ color: pageColors.text }}>#{l.course.course_id}</span>
                                  <span style={{ color: pageColors.text }}>{l.course.course_title}</span>
                                  {pill(l.course.course_status, l.course.course_status === 'publish' ? pageColors.success : pageColors.warning)}
                                </div>
                              ) : (
                                <div className="text-xs ml-4" style={{ color: pageColors.warning }}>⚠ No course linked to this lesson</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Summary IDs */}
                      <div className="text-xs space-y-1 pt-2" style={{ borderTop: `1px solid ${pageColors.cardBorder}`, color: pageColors.textMuted }}>
                        <div><strong>Quizzes found:</strong> {summary.quiz_ids_found_by_reverse_lookup.join(', ') || 'none'}</div>
                        <div><strong>Lessons found:</strong> {summary.lesson_ids_found_by_reverse_lookup.join(', ') || 'none'}</div>
                        <div><strong>Courses found:</strong> {summary.course_ids_found_by_reverse_lookup.join(', ') || 'none'}</div>
                        <div><strong>Meta courses:</strong> {summary.course_ids_in_question_meta.join(', ') || 'none'}</div>
                        <div><strong>Meta lessons:</strong> {summary.lesson_ids_in_question_meta.join(', ') || 'none'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
