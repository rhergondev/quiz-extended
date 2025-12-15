/**
 * BookEditorPanel Component
 * 
 * Editor panel for creating and editing books (PDFs).
 * Features: PDF upload, title/description editing, WooCommerce product linking.
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 1.0.0
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
  Image
} from 'lucide-react';
import clsx from 'clsx';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import { openMediaSelector } from '../../api/utils/mediaUtils';

/**
 * BookEditorPanel Component
 * 
 * @param {Object} props
 * @param {number|null} props.bookId - ID of book to edit (null for create)
 * @param {string} props.mode - 'create' or 'edit'
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {Function} props.onDelete - Delete handler (edit mode only)
 * @param {Object} props.initialData - Initial book data (for edit mode)
 * @param {Function} props.getBook - Function to fetch book by ID
 */
const BookEditorPanel = ({ 
  bookId,
  mode = 'create',
  onSave,
  onCancel,
  onDelete,
  initialData = null,
  getBook
}) => {
  const { t } = useTranslation();
  
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
  
  // Refs
  const fileInputRef = useRef(null);

  /**
   * Load book data on edit mode
   */
  useEffect(() => {
    if (mode === 'edit' && bookId && getBook) {
      loadBook();
    } else if (initialData) {
      setFormData({
        title: initialData.title?.rendered || initialData.title || '',
        description: initialData.description || initialData.content?.rendered || '',
        status: initialData.status || 'publish',
        featured_media: initialData.featured_media || null,
        featured_image_url: initialData.featured_image_url || null,
        pdf: initialData.pdf || { file_id: null, filename: null, url: null }
      });
    }
  }, [bookId, mode, initialData]);

  /**
   * Load book data
   */
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

  /**
   * Update form field
   */
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Handle PDF upload
   */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 50 * 1024 * 1024, // 50MB for PDFs
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

  /**
   * Remove PDF
   */
  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      pdf: { file_id: null, filename: null, url: null }
    }));
  };

  /**
   * Open WordPress Media Library for Featured Image
   */
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

  /**
   * Remove Featured Image
   */
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      featured_media: null,
      featured_image_url: null
    }));
  };

  /**
   * Handle form submit
   */
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
    } catch (err) {
      setError(err.message || 'Error saving book');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!window.confirm(t('books.confirmDelete', '¿Estás seguro de eliminar este libro?'))) {
      return;
    }
    
    setSaving(true);
    try {
      await onDelete(bookId);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {mode === 'create' 
            ? t('books.createBook', 'Crear Libro') 
            : t('books.editBook', 'Editar Libro')}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('books.title', 'Título')} *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={t('books.titlePlaceholder', 'Título del libro...')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Featured Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('books.featuredImage', 'Imagen de portada')}
          </label>

          {formData.featured_image_url ? (
            <div className="relative">
              <img 
                src={formData.featured_image_url} 
                alt={formData.title || 'Book cover'}
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openImageSelector}
              className="w-full flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Image className="w-5 h-5 mr-2" />
              {t('books.selectImage', 'Seleccionar imagen de portada')}
            </button>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('books.description', 'Descripción')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder={t('books.descriptionPlaceholder', 'Descripción del libro...')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('books.status', 'Estado')}
          </label>
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="publish">{t('common.published', 'Publicado')}</option>
            <option value="draft">{t('common.draft', 'Borrador')}</option>
          </select>
        </div>

        {/* PDF Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('books.pdfFile', 'Archivo PDF')}
          </label>

          {formData.pdf.file_id ? (
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <FileText className="w-5 h-5 text-purple-600" />
                <a 
                  href={formData.pdf.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 hover:underline truncate max-w-[250px]"
                  title={formData.pdf.filename}
                >
                  {formData.pdf.filename}
                </a>
              </div>
              <button
                type="button"
                onClick={removePdf}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
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
                className="w-full flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:cursor-not-allowed"
              >
                <UploadCloud className="w-5 h-5 mr-2" />
                {uploading 
                  ? `${t('books.uploading', 'Subiendo...')} ${uploadProgress}%` 
                  : t('books.selectPdf', 'Seleccionar archivo PDF')}
              </button>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <p className="text-sm text-red-600 mt-2">{uploadError}</p>
          )}
        </div>
      </form>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete', 'Eliminar')}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            {t('common.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !formData.title.trim()}
            className={clsx(
              'px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2',
              'bg-blue-600 text-white hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.saving', 'Guardando...')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {mode === 'create' 
                  ? t('common.create', 'Crear') 
                  : t('common.save', 'Guardar')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookEditorPanel;
