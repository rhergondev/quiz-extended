/**
 * SupportMaterialModal Component
 * 
 * Modal for creating and editing support materials (PDF/Text)
 * Used in SupportMaterialPage for admin operations
 * 
 * @package QuizExtended
 * @subpackage Components/SupportMaterial
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, FileText, File, Save, AlertCircle, UploadCloud, CheckCircle, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const SupportMaterialModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  material = null,
  onSave,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    type: 'pdf',
    title: '',
    data: {}
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Page colors
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: isDarkMode ? getColor('background', '#0f172a') : '#ffffff',
    secondaryBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#f9fafb',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    inputBorder: isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db',
  }), [getColor, isDarkMode]);

  // Initialize form data when material changes
  useEffect(() => {
    if (material && mode === 'edit') {
      setFormData({
        type: material.type || 'pdf',
        title: material.title || '',
        data: material.data || {}
      });
    } else {
      setFormData({
        type: 'pdf',
        title: '',
        data: {}
      });
    }
    setErrors({});
  }, [material, mode, isOpen]);

  // Handle field change
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle data field change
  const handleDataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    console.log('handleFileChange - file selected:', file);
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf']
    });

    console.log('File validation result:', validation);

    if (!validation.isValid) {
      console.error('File validation failed:', validation.error);
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting upload for file:', file.name);
      const result = await uploadMedia(file, {
        onProgress: (progress) => {
          console.log('Upload progress:', progress);
          setUploadProgress(progress);
        }
      });

      console.log('Upload result:', result);

      if (result && result.url) {
        handleDataChange('url', result.url);
        if (!formData.title) {
          handleFieldChange('title', file.name.replace('.pdf', ''));
        }
        toast.success(t('supportMaterial.fileUploaded'));
        console.log('PDF URL set to:', result.url);
      } else {
        console.error('Upload completed but no URL in result');
        toast.error(t('supportMaterial.uploadError'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t('supportMaterial.uploadError'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove PDF
  const removePdf = () => {
    handleDataChange('url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Select PDF file from media library
  const handleSelectPDF = async () => {
    try {
      const media = await openMediaSelector({
        title: t('supportMaterial.selectPDF'),
        buttonText: t('common.select'),
        type: 'application/pdf'
      });

      if (media && media.url) {
        handleDataChange('url', media.url);
        if (!formData.title) {
          handleFieldChange('title', media.title || media.filename || '');
        }
      }
    } catch (error) {
      console.error('Error selecting PDF:', error);
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('supportMaterial.errors.titleRequired');
    }

    if (formData.type === 'pdf' && !formData.data?.url) {
      newErrors.pdfUrl = t('supportMaterial.errors.pdfRequired');
    }

    if (formData.type === 'text' && !formData.data?.content?.trim()) {
      newErrors.content = t('supportMaterial.errors.contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving material:', error);
      setErrors({ submit: error.message || t('supportMaterial.errors.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  // Quill editor reference
  const quillRef = useRef(null);

  // Handle image insertion from WordPress Media Library
  const handleImageInsert = async () => {
    try {
      const media = await openMediaSelector({
        title: t('supportMaterial.selectImage'),
        buttonText: t('common.select'),
        type: 'image'
      });

      if (media && media.url && quillRef.current) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', media.url);
        quill.setSelection(range.index + 1);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  // Quill modules for text editor
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: handleImageInsert
      }
    }
  }), [t]);

  if (!isOpen) return null;

  const modalContent = (
    <>
      <style>
        {`
          .quill-editor-wrapper .ql-container {
            border: none !important;
            font-family: inherit;
          }
          
          .quill-editor-wrapper .ql-editor {
            min-height: 150px;
            max-height: 250px;
            overflow-y: auto;
          }
          
          .quill-editor-wrapper .ql-toolbar {
            border: none !important;
            border-bottom: 1px solid ${pageColors.inputBorder} !important;
          }

          .quill-editor-wrapper .ql-snow .ql-stroke {
            stroke: ${pageColors.text};
          }

          .quill-editor-wrapper .ql-snow .ql-fill {
            fill: ${pageColors.text};
          }

          .quill-editor-wrapper .ql-snow .ql-picker-label {
            color: ${pageColors.text};
          }

          .quill-editor-wrapper .ql-snow.ql-toolbar button:hover,
          .quill-editor-wrapper .ql-snow .ql-toolbar button:hover,
          .quill-editor-wrapper .ql-snow.ql-toolbar button:focus,
          .quill-editor-wrapper .ql-snow .ql-toolbar button:focus,
          .quill-editor-wrapper .ql-snow.ql-toolbar button.ql-active,
          .quill-editor-wrapper .ql-snow .ql-toolbar button.ql-active {
            background-color: ${pageColors.accent}22;
          }

          .quill-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-stroke,
          .quill-editor-wrapper .ql-snow .ql-toolbar button:hover .ql-stroke,
          .quill-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-stroke,
          .quill-editor-wrapper .ql-snow .ql-toolbar button.ql-active .ql-stroke {
            stroke: ${pageColors.accent};
          }

          .quill-editor-wrapper .ql-snow.ql-toolbar button:hover .ql-fill,
          .quill-editor-wrapper .ql-snow .ql-toolbar button:hover .ql-fill,
          .quill-editor-wrapper .ql-snow.ql-toolbar button.ql-active .ql-fill,
          .quill-editor-wrapper .ql-snow .ql-toolbar button.ql-active .ql-fill {
            fill: ${pageColors.accent};
          }

          .quill-editor-wrapper .ql-editor.ql-blank::before {
            color: ${pageColors.textSecondary};
            opacity: 0.5;
          }
        `}
      </style>
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
        onClick={onClose}
      >
      <div
        style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '672px',
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
              <FileText size={18} style={{ color: pageColors.accent }} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
              {mode === 'create' 
                ? t('supportMaterial.createMaterial') 
                : t('supportMaterial.editMaterial')}
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
                {t('supportMaterial.materialTitle')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder={t('supportMaterial.materialTitlePlaceholder')}
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

            {/* Type */}
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
                {t('supportMaterial.materialType')} *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {/* PDF option */}
                <button
                  type="button"
                  onClick={() => handleFieldChange('type', 'pdf')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${formData.type === 'pdf' ? pageColors.accent : pageColors.border}`,
                    backgroundColor: formData.type === 'pdf' ? `${pageColors.accent}10` : pageColors.inputBg,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <File size={18} style={{ color: formData.type === 'pdf' ? pageColors.accent : pageColors.textMuted }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: pageColors.text }}>PDF</div>
                    <div style={{ fontSize: '12px', color: pageColors.textMuted }}>
                      {t('supportMaterial.pdfDescription')}
                    </div>
                  </div>
                </button>

                {/* Text option */}
                <button
                  type="button"
                  onClick={() => handleFieldChange('type', 'text')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${formData.type === 'text' ? pageColors.accent : pageColors.border}`,
                    backgroundColor: formData.type === 'text' ? `${pageColors.accent}10` : pageColors.inputBg,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FileText size={18} style={{ color: formData.type === 'text' ? pageColors.accent : pageColors.textMuted }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: pageColors.text }}>
                      {t('supportMaterial.textType')}
                    </div>
                    <div style={{ fontSize: '12px', color: pageColors.textMuted }}>
                      {t('supportMaterial.textDescription')}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* PDF Upload */}
            {formData.type === 'pdf' && (
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
                  {t('supportMaterial.pdfFile')} *
                </label>

                {!formData.data?.url ? (
                  <div>
                    {/* Upload button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        width: '100%',
                        padding: '32px 16px',
                        borderRadius: '8px',
                        border: `2px dashed ${errors.pdfUrl ? '#ef4444' : pageColors.border}`,
                        backgroundColor: pageColors.inputBg,
                        opacity: uploading ? 0.6 : 1,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <UploadCloud 
                        size={32} 
                        style={{ color: pageColors.textMuted }} 
                      />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px', color: pageColors.text }}>
                          {uploading ? t('supportMaterial.uploading') : t('supportMaterial.uploadPDF')}
                        </div>
                        <div style={{ fontSize: '12px', color: pageColors.textMuted }}>
                          {t('supportMaterial.maxSize')}
                        </div>
                      </div>
                    </button>

                    {/* Upload progress */}
                    {uploading && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: pageColors.textMuted }}>
                          <span>{t('supportMaterial.uploading')}</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div 
                          style={{ 
                            width: '100%',
                            height: '8px',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            backgroundColor: pageColors.border
                          }}
                        >
                          <div 
                            style={{ 
                              height: '100%',
                              width: `${uploadProgress}%`,
                              backgroundColor: pageColors.accent,
                              transition: 'width 0.3s'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Media library button */}
                    <button
                      type="button"
                      onClick={handleSelectPDF}
                      disabled={uploading}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '500',
                        fontSize: '14px',
                        backgroundColor: pageColors.cardBg || pageColors.inputBg,
                        border: `1px solid ${pageColors.border}`,
                        color: pageColors.text,
                        opacity: uploading ? 0.6 : 1,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {t('supportMaterial.selectFromLibrary')}
                    </button>

                    {errors.pdfUrl && (
                      <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                        {errors.pdfUrl}
                      </span>
                    )}
                  </div>
                ) : (
                  <div 
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `1px solid ${pageColors.accent}`,
                      backgroundColor: `${pageColors.accent}10`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <CheckCircle size={24} style={{ color: pageColors.accent, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1" style={{ color: pageColors.text }}>
                        {t('supportMaterial.fileUploaded')}
                      </div>
                      <a 
                        href={formData.data.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs hover:underline block truncate"
                        style={{ color: pageColors.accent }}
                      >
                        {formData.data.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={removePdf}
                      className="p-2 rounded-lg transition-colors flex-shrink-0"
                      style={{
                        backgroundColor: pageColors.cardBg,
                        border: `1px solid ${pageColors.border}`,
                      }}
                      title={t('common.remove')}
                    >
                      <Trash2 size={18} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text Content */}
            {formData.type === 'text' && (
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
                  {t('supportMaterial.textContent')} *
                </label>
                <div 
                  style={{ 
                    borderRadius: '8px',
                    border: `1px solid ${errors.content ? '#ef4444' : pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg
                  }}
                  className="quill-editor-wrapper"
                >
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={formData.data?.content || ''}
                    onChange={(content) => handleDataChange('content', content)}
                    modules={quillModules}
                    style={{ 
                      backgroundColor: pageColors.inputBg
                    }}
                  />
                </div>
                {errors.content && (
                  <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                    {errors.content}
                  </span>
                )}
              </div>
            )}
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
                backgroundColor: pageColors.inputBg,
                border: `1px solid ${pageColors.border}`,
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
              <Save size={16} />
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default SupportMaterialModal;
