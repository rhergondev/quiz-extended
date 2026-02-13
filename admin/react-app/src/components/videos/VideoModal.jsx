/**
 * VideoModal Component
 * 
 * Modal for creating and editing video content
 * Used in VideosPage for admin operations
 * 
 * @package QuizExtended
 * @subpackage Components/Videos
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Video, Save, AlertCircle, Eye, EyeOff, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const VideoModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  video = null,
  onSave,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  const HIDDEN_DATE = '9999-12-31';

  const pageColors = {
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f8f9fa'),
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    textSecondary: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    border: getColor('borderColor', '#e5e7eb'),
    inputBg: isDarkMode ? getColor('inputBackground', '#374151') : '#ffffff',
    inputBorder: getColor('inputBorder', '#d1d5db')
  };

  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    duration: '',
    start_date: ''
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const mouseDownOnOverlayRef = useRef(false);

  const isVisible = formData.start_date !== HIDDEN_DATE;

  useEffect(() => {
    if (isOpen && video && mode === 'edit') {
      setFormData({
        title: video.title || '',
        video_url: video.data?.video_url || video.data?.url || '',
        duration: video.data?.duration || '',
        start_date: video.start_date || ''
      });
    } else if (isOpen && mode === 'create') {
      setFormData({
        title: '',
        video_url: '',
        duration: '',
        start_date: ''
      });
    }
    setErrors({});
  }, [isOpen, video, mode]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('videos.errors.titleRequired');
    }

    if (!formData.video_url.trim()) {
      newErrors.video_url = t('videos.errors.urlRequired');
    } else {
      // Basic URL validation
      try {
        new URL(formData.video_url);
      } catch {
        newErrors.video_url = t('videos.errors.invalidUrl');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const videoData = {
        type: 'video',
        title: formData.title.trim(),
        start_date: formData.start_date || '',
        data: {
          video_url: formData.video_url.trim(),
          url: formData.video_url.trim(), // Keep both for compatibility
          duration: formData.duration ? parseInt(formData.duration) : undefined
        }
      };

      await onSave(videoData);
      onClose();
    } catch (error) {
      console.error('Error saving video:', error);
      setErrors({ submit: error.message || t('videos.errors.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100000
      }}
      onMouseDown={(e) => {
        mouseDownOnOverlayRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlayRef.current) {
          onClose();
        }
        mouseDownOnOverlayRef.current = false;
      }}
    >
      <div
        style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: pageColors.background 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${pageColors.border}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                padding: '6px',
                borderRadius: '6px',
                backgroundColor: `${pageColors.accent}15` 
              }}
            >
              <Video size={18} style={{ color: pageColors.accent }} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
              {mode === 'create' 
                ? t('videos.createVideo') 
                : t('videos.editVideo')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ 
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: pageColors.textMuted,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Error message */}
            {errors.submit && (
              <div 
                style={{ 
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca'
                }}
              >
                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '14px', color: '#991b1b' }}>{errors.submit}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: pageColors.text
                }}
              >
                {t('videos.videoTitle')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder={t('videos.videoTitlePlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${errors.title ? '#ef4444' : pageColors.inputBorder}`,
                  color: pageColors.text,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {errors.title && (
                <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                  {errors.title}
                </span>
              )}
            </div>

            {/* Video URL */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: pageColors.text
                }}
              >
                {t('videos.videoUrl')} *
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => handleFieldChange('video_url', e.target.value)}
                placeholder={t('videos.videoUrlPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${errors.video_url ? '#ef4444' : pageColors.inputBorder}`,
                  color: pageColors.text,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {errors.video_url && (
                <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                  {errors.video_url}
                </span>
              )}
              <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: pageColors.textMuted }}>
                {t('videos.urlHelp')}
              </span>
            </div>

            {/* Duration (optional) */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: pageColors.text
                }}
              >
                {t('videos.duration')}
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                placeholder={t('videos.durationPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.inputBorder}`,
                  color: pageColors.text,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: pageColors.textMuted }}>
                {t('videos.durationHelp')}
              </span>
            </div>

            {/* Visibility & Unlock Date */}
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${pageColors.inputBorder}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Visibility Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVisible ? (
                    <Eye size={16} style={{ color: '#10b981' }} />
                  ) : (
                    <EyeOff size={16} style={{ color: '#ef4444' }} />
                  )}
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text }}>
                      {t('supportMaterial.visibility')}
                    </div>
                    <div style={{ fontSize: '12px', color: pageColors.textMuted }}>
                      {isVisible
                        ? t('supportMaterial.visibleDescription')
                        : t('supportMaterial.hiddenDescription')
                      }
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldChange('start_date', isVisible ? HIDDEN_DATE : '')}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isVisible ? '#10b981' : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: isVisible ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              </div>

              {/* Unlock Date - only when visible */}
              {isVisible && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Calendar size={14} style={{ color: pageColors.textMuted }} />
                    <label style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text, margin: 0 }}>
                      {t('supportMaterial.unlockDate')}
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => handleFieldChange('start_date', e.target.value || '')}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: pageColors.inputBg,
                      border: `1px solid ${pageColors.inputBorder}`,
                      color: pageColors.text,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: pageColors.textMuted, marginTop: '4px' }}>
                    {t('supportMaterial.unlockDateDescription')}
                  </div>
                  {formData.start_date && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('start_date', '')}
                      style={{
                        marginTop: '6px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${pageColors.inputBorder}`,
                        color: pageColors.textMuted,
                        cursor: 'pointer',
                      }}
                    >
                      {t('supportMaterial.clearDate')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div 
            style={{ 
              padding: '12px 16px',
              borderTop: `1px solid ${pageColors.border}`,
              backgroundColor: pageColors.secondaryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '13px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                color: pageColors.text,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '13px',
                backgroundColor: pageColors.accent,
                border: 'none',
                color: '#ffffff',
                opacity: isSaving || isLoading ? 0.6 : 1,
                cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && !isLoading) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!isSaving && !isLoading) e.currentTarget.style.opacity = '1';
              }}
            >
              <Save size={14} />
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VideoModal;
