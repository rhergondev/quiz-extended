/**
 * BookEditorSlidePanel Component
 * 
 * Slide-in panel for creating and editing books.
 * Features: PDF upload, title/description editing, cover image.
 * Follows TestsPage styling with dark mode support.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 2.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Save, 
  X, 
  Trash2, 
  UploadCloud, 
  CheckCircle, 
  FileText,
  AlertCircle,
  Loader2,
  Image,
  ArrowLeft
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import { openMediaSelector } from '../../api/utils/mediaUtils';

/**
 * BookEditorSlidePanel Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {number|null} props.bookId - ID of book to edit (null for create)
 * @param {string} props.mode - 'create' or 'edit'
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onDelete - Delete handler (edit mode only)
 * @param {Function} props.getBook - Function to fetch book by ID
 */
const BookEditorSlidePanel = ({ 
  isOpen,
  bookId,
  mode = 'create',
  onSave,
  onClose,
  onDelete,
  getBook
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  // Colors following TestsPage pattern
  const panelColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgPanel: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgOverlay: 'rgba(0,0,0,0.5)',
    bgInput: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderFocus: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonPrimary: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonPrimaryText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonDanger: '#ef4444',
    success: '#10b981',
    error: '#ef4444',
  };

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'publish',
    featured_media: null,
    featured_image_url: null,
    pdf: {
      file_id: null,
      filename: null,
      url: null
    }
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);

  // Reset form when panel opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && bookId && getBook) {
        loadBook();
      } else if (mode === 'create') {
        resetForm();
      }
    }
  }, [isOpen, bookId, mode]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'publish',
      featured_media: null,
      featured_image_url: null,
      pdf: { file_id: null, filename: null, url: null }
    });
    setError(null);
    setUploadError(null);
    setShowDeleteConfirm(false);
  };

  const loadBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const book = await getBook(bookId);
      setFormData({
        title: book.title?.rendered || book.title || '',
        description: book.description || book.content?.rendered || '',
        status: book.status || 'publish',
        featured_media: book.featured_media || null,
        featured_image_url: book.featured_image_url || null,
        pdf: book.pdf || { file_id: null, filename: null, url: null }
      });
    } catch (err) {
      setError(err.message || 'Error loading book');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 50 * 1024 * 1024,
      allowedTypes: ['application/pdf']
    });

    if (!validation.isValid) {
      setUploadError(validation.error);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const uploadedMedia = await uploadMedia(file, { 
        onProgress: setUploadProgress 
      });
      
      setFormData(prev => ({
        ...prev,
        pdf: {
          file_id: uploadedMedia.id,
          filename: file.name,
          url: uploadedMedia.url
        }
      }));
    } catch (err) {
      setUploadError(err.message || t('books.uploadFailed', 'Error al subir el archivo'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      pdf: { file_id: null, filename: null, url: null }
    }));
  };

  const openImageSelector = async () => {
    try {
      const media = await openMediaSelector({
        title: t('books.selectImage', 'Seleccionar imagen de portada'),
        buttonText: t('common.select', 'Seleccionar'),
        type: 'image'
      });
      
      if (media) {
        setFormData(prev => ({
          ...prev,
          featured_media: media.id,
          featured_image_url: media.url
        }));
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      setError(err.message || t('books.uploadFailed', 'Error al seleccionar la imagen'));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      featured_media: null,
      featured_image_url: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError(t('books.titleRequired', 'El título es obligatorio'));
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await onSave({
        title: formData.title,
        description: formData.description,
        status: formData.status,
        featured_media: formData.featured_media,
        pdf_file_id: formData.pdf.file_id,
        pdf_filename: formData.pdf.filename,
        pdf_url: formData.pdf.url
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(bookId);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - Contained within parent */}
      <div 
        className="absolute inset-0 z-40 transition-opacity duration-300"
        style={{ backgroundColor: panelColors.bgOverlay }}
        onClick={onClose}
      />
      
      {/* Panel - Contained within parent */}
      <div 
        ref={panelRef}
        className="absolute top-0 right-0 bottom-0 w-full max-w-lg z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl"
        style={{ 
          backgroundColor: panelColors.bgPanel,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${panelColors.border}` }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: panelColors.textMuted }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold" style={{ color: panelColors.text }}>
              {mode === 'create' 
                ? t('books.createBook', 'Crear Libro') 
                : t('books.editBook', 'Editar Libro')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: panelColors.textMuted }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: panelColors.accent }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div 
                className="px-4 py-3 rounded-lg flex items-center gap-2"
                style={{ 
                  backgroundColor: `${panelColors.error}15`,
                  border: `1px solid ${panelColors.error}30`,
                  color: panelColors.error
                }}
              >
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: panelColors.text }}
              >
                {t('books.title', 'Título')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={t('books.titlePlaceholder', 'Título del libro...')}
                className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
                style={{ 
                  backgroundColor: panelColors.bgInput,
                  border: `1px solid ${panelColors.border}`,
                  color: panelColors.text,
                }}
                onFocus={(e) => e.target.style.borderColor = panelColors.borderFocus}
                onBlur={(e) => e.target.style.borderColor = panelColors.border}
                required
              />
            </div>

            {/* Featured Image */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: panelColors.text }}
              >
                {t('books.featuredImage', 'Imagen de portada')}
              </label>

              {formData.featured_image_url ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img 
                    src={formData.featured_image_url} 
                    alt={formData.title || 'Book cover'}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 rounded-full transition-colors shadow-lg"
                    style={{ 
                      backgroundColor: panelColors.buttonDanger,
                      color: '#ffffff'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openImageSelector}
                  className="w-full flex items-center justify-center px-4 py-8 rounded-lg text-sm transition-all"
                  style={{ 
                    border: `2px dashed ${panelColors.border}`,
                    color: panelColors.textMuted,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = panelColors.borderFocus;
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = panelColors.border;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Image size={20} className="mr-2" />
                  {t('books.selectImage', 'Seleccionar imagen de portada')}
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: panelColors.text }}
              >
                {t('books.description', 'Descripción')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t('books.descriptionPlaceholder', 'Descripción del libro...')}
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-sm transition-colors resize-none"
                style={{ 
                  backgroundColor: panelColors.bgInput,
                  border: `1px solid ${panelColors.border}`,
                  color: panelColors.text,
                }}
                onFocus={(e) => e.target.style.borderColor = panelColors.borderFocus}
                onBlur={(e) => e.target.style.borderColor = panelColors.border}
              />
            </div>

            {/* Status */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: panelColors.text }}
              >
                {t('books.status', 'Estado')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
                style={{ 
                  backgroundColor: panelColors.bgInput,
                  border: `1px solid ${panelColors.border}`,
                  color: panelColors.text,
                }}
                onFocus={(e) => e.target.style.borderColor = panelColors.borderFocus}
                onBlur={(e) => e.target.style.borderColor = panelColors.border}
              >
                <option value="publish">{t('common.published', 'Publicado')}</option>
                <option value="draft">{t('common.draft', 'Borrador')}</option>
              </select>
            </div>

            {/* PDF Upload */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: panelColors.text }}
              >
                {t('books.pdfFile', 'Archivo PDF')}
              </label>

              {formData.pdf.file_id ? (
                <div 
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ 
                    backgroundColor: `${panelColors.success}10`,
                    border: `1px solid ${panelColors.success}30`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} style={{ color: panelColors.success }} />
                    <FileText size={20} style={{ color: panelColors.accent }} />
                    <a 
                      href={formData.pdf.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm hover:underline truncate max-w-[200px]"
                      style={{ color: panelColors.accent }}
                      title={formData.pdf.filename}
                    >
                      {formData.pdf.filename}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={removePdf}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: panelColors.buttonDanger }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${panelColors.buttonDanger}15`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center px-4 py-8 rounded-lg text-sm transition-all disabled:opacity-50"
                    style={{ 
                      border: `2px dashed ${panelColors.border}`,
                      color: panelColors.textMuted,
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!uploading) {
                        e.currentTarget.style.borderColor = panelColors.borderFocus;
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = panelColors.border;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <UploadCloud size={20} className="mr-2" />
                    {uploading 
                      ? `${t('books.uploading', 'Subiendo...')} ${uploadProgress}%` 
                      : t('books.selectPdf', 'Seleccionar archivo PDF')}
                  </button>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div 
                  className="mt-3 w-full rounded-full h-2 overflow-hidden"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${uploadProgress}%`,
                      backgroundColor: panelColors.accent
                    }}
                  />
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <p className="text-sm mt-2" style={{ color: panelColors.error }}>{uploadError}</p>
              )}
            </div>
          </form>
        )}

        {/* Footer Actions */}
        {!loading && (
          <div 
            className="px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ 
              borderTop: `1px solid ${panelColors.border}`,
              backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
            }}
          >
            <div>
              {mode === 'edit' && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: panelColors.error }}>
                      {t('books.confirmDeleteShort', '¿Eliminar?')}
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ 
                        backgroundColor: panelColors.buttonDanger,
                        color: '#ffffff'
                      }}
                    >
                      {t('common.yes', 'Sí')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ color: panelColors.textMuted }}
                    >
                      {t('common.no', 'No')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: panelColors.buttonDanger }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${panelColors.buttonDanger}15`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} />
                    {t('common.delete', 'Eliminar')}
                  </button>
                )
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: panelColors.textMuted }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !formData.title.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: panelColors.buttonPrimary,
                  color: panelColors.buttonPrimaryText
                }}
                onMouseEnter={(e) => {
                  if (!saving && formData.title.trim()) {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('common.saving', 'Guardando...')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {mode === 'create' 
                      ? t('common.create', 'Crear') 
                      : t('common.save', 'Guardar')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BookEditorSlidePanel;
