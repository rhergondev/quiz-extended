/**
 * BookEditorModal Component
 * 
 * Modal for creating and editing books.
 * Features: 
 * - Basic Info (Title, Description, Cover)
 * - Complete PDF (Optional)
 * - Chapter Management (Multiple PDFs)
 * 
 * @package QuizExtended
 * @subpackage Components/Books
 * @version 2.1.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Save, 
  X, 
  Trash2, 
  UploadCloud, 
  FileText,
  AlertCircle,
  Loader2,
  Image,
  Plus,
  GripVertical
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Chapter Item ---
const SortableChapterItem = ({ chapter, onDelete, modalColors }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: chapter.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: modalColors.bgInput,
        border: `1px solid ${modalColors.border}`,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="flex items-center gap-3 p-3 rounded-lg mb-2 group"
        >
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: modalColors.text }}>
                    {chapter.title}
                </div>
                {chapter.pdf?.filename && (
                    <div className="text-xs truncate flex items-center gap-1" style={{ color: modalColors.textMuted }}>
                         <FileText size={12} />
                         {chapter.pdf.filename}
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={() => onDelete(chapter.id)}
                className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar capítulo"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

const BookEditorModal = ({ 
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
  
  // Colors
  const modalColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgModal: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgOverlay: 'rgba(0,0,0,0.5)',
    bgInput: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    borderFocus: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonPrimary: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonPrimaryText: '#ffffff',
    buttonSecondary: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonSecondaryText: '#ffffff',
    buttonDanger: '#ef4444',
    success: '#10b981',
    error: '#ef4444',
  };

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'publish',
    start_date: '',
    end_date: '',
    featured_media: null,
    featured_image_url: null,
    pdf: { // Main complete PDF (optional)
      file_id: null,
      filename: null,
      url: null
    },
    chapters: [] // Array of { id, title, pdf: { file_id, filename, url } }
  });
  
  // New Chapter State - simplified for direct upload
  const [chapterUploadProgress, setChapterUploadProgress] = useState(0);
  const [isUploadingChapter, setIsUploadingChapter] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false); // Main PDF upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const chapterInputRef = useRef(null);

  // Reset/Load logic
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && bookId && getBook) {
        loadBook();
      } else if (mode === 'create') {
        resetForm();
      }
    }
  }, [isOpen, bookId, mode]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'publish',
      start_date: '',
      end_date: '',
      featured_media: null,
      featured_image_url: null,
      pdf: { file_id: null, filename: null, url: null },
      chapters: []
    });
    setChapterUploadProgress(0);
    setIsUploadingChapter(false);
    setError(null);
    setUploadError(null);
    setShowDeleteConfirm(false);
  };

  const loadBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const book = await getBook(bookId);
      // Ensure chapters have IDs
      const rawChapters = book.chapters || [];
      const chaptersWithIds = rawChapters.map((c, idx) => ({
          ...c,
          id: c.id || `chapter_${Date.now()}_${idx}`
      }));

      setFormData({
        title: book.title?.rendered || book.title || '',
        description: book.description || book.content?.rendered || '',
        status: book.status || 'publish',
        start_date: book.meta?._book_start_date || '',
        end_date: book.meta?._book_end_date || '',
        featured_media: book.featured_media || null,
        featured_image_url: book.featured_image_url || null,
        pdf: book.pdf || { file_id: null, filename: null, url: null },
        chapters: chaptersWithIds
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

  // --- Main PDF Handlers ---
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      pdf: { file_id: null, filename: null, url: null }
    }));
  };

  // --- Chapter Handlers (Direct Upload) ---
  const handleChapterFileChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const validation = validateFile(file, { maxSize: 50 * 1024 * 1024, allowedTypes: ['application/pdf'] });
      if (!validation.isValid) { alert(validation.error); return; }

      setIsUploadingChapter(true);
      setChapterUploadProgress(0);
      
      try {
          const uploadedMedia = await uploadMedia(file, { onProgress: setChapterUploadProgress });
          
          // Auto-add chapter on successful upload
          const newChapter = {
                id: `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: file.name.replace('.pdf', ''), // Use filename as default title
                date_added: new Date().toISOString(),
                pdf: {
                    file_id: uploadedMedia.id,
                    filename: file.name,
                    url: uploadedMedia.url
                }
          };
          
          setFormData(prev => ({
              ...prev,
              chapters: [...prev.chapters, newChapter]
          }));

      } catch (err) {
          alert(t('books.uploadFailed', 'Error al subir capítulo'));
      } finally {
        setIsUploadingChapter(false);
        if (chapterInputRef.current) chapterInputRef.current.value = '';
      }
  };

  const removeChapter = (id) => {
      setFormData(prev => ({
          ...prev,
          chapters: prev.chapters.filter(c => c.id !== id)
      }));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        setFormData((prev) => {
            const oldIndex = prev.chapters.findIndex((c) => c.id === active.id);
            const newIndex = prev.chapters.findIndex((c) => c.id === over.id);
            return {
                ...prev,
                chapters: arrayMove(prev.chapters, oldIndex, newIndex),
            };
        });
    }
  };

  // --- Image Handlers ---
  const handleSelectImage = async () => {
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

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('El título es obligatorio'); return; }
    
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
        pdf_url: formData.pdf.url,
        chapters: formData.chapters,
        meta: {
          _book_start_date: formData.start_date || '',
          _book_end_date: formData.end_date || ''
        }
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
    try { await onDelete(bookId); onClose(); } catch (err) { setError(err.message); setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 transition-opacity duration-300" style={{ backgroundColor: modalColors.bgOverlay }} onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: modalColors.bgModal }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${modalColors.border}` }}>
          <h2 className="text-lg font-bold" style={{ color: modalColors.text }}>
            {mode === 'create' ? t('books.createBook', 'Crear Libro') : t('books.editBook', 'Editar Libro')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:brightness-110"
            style={{ backgroundColor: modalColors.buttonSecondary, color: modalColors.buttonSecondaryText }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: modalColors.accent }} /></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="px-4 py-3 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: `${modalColors.error}15`, border: `1px solid ${modalColors.error}30`, color: modalColors.error }}>
                <AlertCircle size={18} /> <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Details */}
              <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: modalColors.text }}>{t('books.title', 'Título')} *</label>
                    <input type="text" value={formData.title} onChange={(e) => updateField('title', e.target.value)} required
                      className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:ring-2 outline-none"
                      style={{ backgroundColor: modalColors.bgInput, border: `1px solid ${modalColors.border}`, color: modalColors.text, '--tw-ring-color': modalColors.accent }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: modalColors.text }}>{t('books.status', 'Estado')}</label>
                    <select value={formData.status} onChange={(e) => updateField('status', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:ring-2 outline-none"
                      style={{ backgroundColor: modalColors.bgInput, border: `1px solid ${modalColors.border}`, color: modalColors.text, '--tw-ring-color': modalColors.accent }}
                    >
                      <option value="publish">{t('common.published', 'Publicado')}</option>
                      <option value="draft">{t('common.draft', 'Borrador')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: modalColors.text }}>
                        {t('books.startDate', 'Fecha de inicio')}
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => updateField('start_date', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:ring-2 outline-none"
                        style={{ backgroundColor: modalColors.bgInput, border: `1px solid ${modalColors.border}`, color: modalColors.text, '--tw-ring-color': modalColors.accent }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: modalColors.text }}>
                        {t('books.endDate', 'Fecha de fin')}
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => updateField('end_date', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors focus:ring-2 outline-none"
                        style={{ backgroundColor: modalColors.bgInput, border: `1px solid ${modalColors.border}`, color: modalColors.text, '--tw-ring-color': modalColors.accent }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium" style={{ color: modalColors.text }}>
                        {t('books.description', 'Descripción')}
                      </span>
                      <p className="text-xs" style={{ color: modalColors.textMuted }}>
                        {t('books.woocommerceReminder', 'Recuerda dar de alta el libro en Woocommerce para que esté disponible para la compra')}
                      </p>
                    </div>
                  </div>

                  {/* Main PDF (Complete) */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f8f9fa' }}>
                     <label className="block text-sm font-medium mb-3" style={{ color: modalColors.text }}>
                        {t('books.fullPdf', 'Libro Completo (PDF)')}
                        <span className="text-xs font-normal ml-2 opacity-70">{t('common.optional', 'Opcional')}</span>
                     </label>
                     
                     {formData.pdf.file_id ? (
                        <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: modalColors.border, backgroundColor: modalColors.bgModal }}>
                           <div className="flex items-center gap-3 overflow-hidden">
                              <FileText size={18} className="text-red-500 shrink-0" />
                              <div className="truncate">
                                 <p className="text-sm font-medium truncate" style={{ color: modalColors.text }}>{formData.pdf.filename}</p>
                              </div>
                           </div>
                           <button type="button" onClick={removePdf} className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"><Trash2 size={16} /></button>
                        </div>
                     ) : (
                        <div onClick={() => !uploading && fileInputRef.current?.click()} 
                            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-wait' : 'hover:border-blue-500'}`}
                            style={{ borderColor: modalColors.border }}
                        >
                            <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={uploading} />
                            <UploadCloud size={24} style={{ color: modalColors.textMuted }} className="mb-2" />
                            <span className="text-sm font-medium" style={{ color: modalColors.textMuted }}>
                                {uploading ? 'Subiendo...' : t('books.uploadPdf', 'Subir PDF Completo')}
                            </span>
                        </div>
                     )}
                     {uploadError && <p className="text-xs mt-2 text-red-500">{uploadError}</p>}
                  </div>
              </div>

              {/* Right Column: Chapters & Cover */}
              <div className="space-y-6">
                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: modalColors.text }}>{t('books.featuredImage', 'Imagen de portada')}</label>
                  {formData.featured_image_url ? (
                    <div className="relative rounded-lg overflow-hidden group h-40 border" style={{ borderColor: modalColors.border }}>
                      <img src={formData.featured_image_url} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button type="button" onClick={removeImage} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><Trash2 size={16} /></button>
                        <button type="button" onClick={handleSelectImage} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"><UploadCloud size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={handleSelectImage} className="w-full h-40 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:border-gray-400 group"
                        style={{ borderColor: modalColors.border, backgroundColor: 'transparent' }}>
                      <Image size={24} className="mb-2 group-hover:text-gray-600" style={{ color: modalColors.textMuted }} />
                      <span className="text-sm group-hover:text-gray-600" style={{ color: modalColors.textMuted }}>Seleccionar imagen</span>
                    </button>
                  )}
                </div>

                {/* Chapters Section */}
                <div>
                     <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium" style={{ color: modalColors.text }}>{t('books.updates', 'Actualizaciones')}</label>
                        <button
                          type="button"
                          onClick={() => !isUploadingChapter && chapterInputRef.current?.click()} 
                          disabled={isUploadingChapter}
                          className="text-xs flex items-center gap-1 font-medium px-2 py-1 rounded transition-all disabled:opacity-50 hover:brightness-110"
                          style={{ backgroundColor: modalColors.buttonSecondary, color: modalColors.buttonSecondaryText }}
                          >
                             <input type="file" accept="application/pdf" ref={chapterInputRef} onChange={handleChapterFileChange} className="hidden" />
                            {isUploadingChapter ? <Loader2 size={12} className="animate-spin"/> : <Plus size={14} />} 
                            {isUploadingChapter ? 'Subiendo...' : 'Añadir PDF'}
                        </button>
                     </div>

                     <div className="rounded-xl border p-4 min-h-[200px] flex flex-col" style={{ backgroundColor: modalColors.bgModal, borderColor: modalColors.border }}>
                        
                        {/* List */}
                        <div className="flex-1">
                            {formData.chapters.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                                    <BookOpenIconDumb size={32} className="mb-2 opacity-50" />
                                    <span className="text-sm">{t('books.noUpdates', 'Sin actualizaciones')}</span>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={formData.chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                        {formData.chapters.map(chapter => (
                                            <SortableChapterItem 
                                                key={chapter.id} 
                                                chapter={chapter} 
                                                onDelete={removeChapter} 
                                                modalColors={modalColors} 
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>
                     </div>
                </div>

              </div>
            </div>
          </form>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 border-t" style={{ borderColor: modalColors.border, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
            <div>
              {mode === 'edit' && onDelete && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-500">¿Seguro?</span>
                    <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium">Sí, borrar</button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500">No</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-red-500 text-sm hover:underline font-medium bg-transparent border-0">
                    <Trash2 size={16} /> Eliminar libro
                  </button>
                )
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:brightness-110"
                style={{ backgroundColor: modalColors.buttonSecondary, color: modalColors.buttonSecondaryText }}
              >
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saving || !formData.title.trim()} 
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-md disabled:opacity-50 hover:brightness-110"
                style={{ backgroundColor: modalColors.buttonPrimary }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {mode === 'create' ? 'Crear Libro' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple placeholder icon
const BookOpenIconDumb = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

export default BookEditorModal;
