/**
 * CourseEditorModal Component
 * 
 * Simplified modal for creating and editing courses in CoursesPage.
 * Features: Basic course information editor
 * 
 * @package QuizExtended
 * @subpackage Components/Courses
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Save,
  X,
  Trash2,
  Plus,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import { getTaxonomyTerms, createCategory } from '../../api/services/taxonomyService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';



const CourseEditorModal = ({ 
  isOpen,
  courseId,
  mode = 'create',
  onSave,
  onClose,
  onDelete,
  getCourse
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  // Colors - consistent with UnifiedTestModal and QuestionModal
  const colors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bg: isDarkMode ? getColor('background', '#0f172a') : '#f9fafb',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    inputBg: isDarkMode ? '#1f2937' : '#ffffff',
    inputBorder: isDarkMode ? '#374151' : '#d1d5db',
  }), [getColor, isDarkMode]);

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'publish',
    featured_media: null,
    featured_image_url: null,
    _course_position: 0,
    qe_category: []
  });

  // Load categories when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCategories(true);
    getTaxonomyTerms('qe_category')
      .then(terms => setCategories(terms.map(t => ({ value: t.id, label: t.name }))))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, [isOpen]);

  // Load course data if editing
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && courseId) {
      // Get course is now a prop that passes the full course object
      const loadCourse = async () => {
        setLoading(true);
        setError(null);
        try {
          const course = await getCourse(courseId);
          if (course) {
            setFormData({
              title: course.title?.rendered || course.title || '',
              content: course.content?.rendered || course.content || '',
              status: course.status || 'publish',
              featured_media: course.featured_media || null,
              featured_image_url: course._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
              _course_position: parseInt(course.meta?._course_position) || 0,
              qe_category: course.qe_category || []
            });
          }
        } catch (err) {
          console.error('Error loading course:', err);
          setError('No se pudo cargar el curso');
        } finally {
          setLoading(false);
        }
      };
      loadCourse();
    } else {
      // Reset for create mode
      setFormData({
        title: '',
        content: '',
        status: 'publish',
        featured_media: null,
        featured_image_url: null,
        _course_position: 0,
        qe_category: []
      });
      setError(null);
      setLoading(false);
    }
  }, [isOpen, mode, courseId, getCourse]);



  // Handlers
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setSavingCategory(true);
    try {
      const newTerm = await createCategory({ name });
      setCategories(prev => [...prev, { value: newTerm.id, label: newTerm.name }]);
      handleFieldChange('qe_category', [newTerm.id]);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSelectFeaturedImage = async () => {
    try {
      const media = await openMediaSelector({
        title: 'Seleccionar Imagen Destacada',
        buttonText: 'Usar esta imagen'
      });
      
      if (!media) {
        return;
      }
      
      if (media && media.id && media.url) {
        const mediaId = parseInt(media.id, 10);
        setFormData(prev => ({
          ...prev,
          featured_media: mediaId,
          featured_image_url: media.url
        }));
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
    }
  };

  const handleRemoveFeaturedImage = () => {
    setFormData(prev => ({
      ...prev,
      featured_media: null,
      featured_image_url: null
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!formData.qe_category.length) {
      setError('La categoría es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const courseData = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        featured_media: formData.featured_media,
        qe_category: formData.qe_category,
        meta: {
          _course_position: formData._course_position
        }
      };

      await onSave(courseData);
      onClose();
    } catch (err) {
      console.error('Error saving course:', err);
      setError(err.message || 'Error al guardar el curso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este curso?')) return;
    
    try {
      await onDelete(courseId);
      onClose();
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('Error al eliminar el curso');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-5xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <h2 className="text-base font-bold" style={{ color: colors.text }}>
            {mode === 'create' ? 'Nuevo Curso' : 'Editar Curso'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin" size={28} style={{ color: colors.accent }} />
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: colors.text }}>
                    Título del Curso *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Ej: Matemáticas Avanzadas"
                    className="w-full p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    style={{
                      border: `1px solid ${colors.inputBorder}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text
                    }}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: colors.text }}>
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      border: `1px solid ${colors.inputBorder}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text
                    }}
                  >
                    <option value="publish">Publicado</option>
                    <option value="draft">Borrador</option>
                    <option value="private">Privado</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: colors.text }}>
                    Categoría *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.qe_category[0] ?? ''}
                      onChange={(e) => handleFieldChange('qe_category', e.target.value ? [parseInt(e.target.value, 10)] : [])}
                      disabled={loadingCategories}
                      className="flex-1 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      style={{ border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.text }}
                    >
                      <option value="">— Sin categoría —</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setShowNewCategory(v => !v); setNewCategoryName(''); }}
                      className="p-2.5 rounded-lg transition-colors flex-shrink-0"
                      title="Crear nueva categoría"
                      style={{
                        border: `1px solid ${showNewCategory ? colors.accent : colors.inputBorder}`,
                        backgroundColor: showNewCategory ? `${colors.accent}15` : colors.inputBg,
                        color: showNewCategory ? colors.accent : colors.textMuted
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  {showNewCategory && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryName(''); } }}
                        placeholder="Nombre de la nueva categoría..."
                        autoFocus
                        className="flex-1 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        style={{ border: `1px solid ${colors.accent}`, backgroundColor: colors.inputBg, color: colors.text }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || savingCategory}
                        className="p-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                        title="Guardar categoría"
                        style={{ backgroundColor: colors.accent, color: '#ffffff' }}
                      >
                        {savingCategory ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                        className="p-2 rounded-lg transition-colors flex-shrink-0"
                        title="Cancelar"
                        style={{ border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.textMuted }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Image and Description Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Featured Image */}
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: colors.text }}>
                      Imagen Destacada
                    </label>
                    {formData.featured_image_url ? (
                      <div className="relative group">
                        <img 
                          src={formData.featured_image_url} 
                          alt="Featured" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveFeaturedImage}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSelectFeaturedImage}
                        className="w-full h-32 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1.5 hover:border-amber-500 transition-colors"
                        style={{ borderColor: colors.border, color: colors.textMuted }}
                      >
                        <ImageIcon size={24} />
                        <span className="text-xs font-medium">Seleccionar imagen</span>
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col">
                    <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: colors.text }}>
                      Descripción
                    </label>
                    <div className="flex-1">
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(value) => handleFieldChange('content', value)}
                        style={{ height: '100px', fontSize: '13px' }}
                        modules={{
                          toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link']
                          ]
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <div>
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <Trash2 size={14} className="inline mr-1.5" />
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: colors.text,
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colors.accent }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="inline animate-spin mr-1.5" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={14} className="inline mr-1.5" />
                  {mode === 'create' ? 'Crear Curso' : 'Guardar Cambios'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseEditorModal;
