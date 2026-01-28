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
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import { createTaxonomyTerm } from '../../api/services/taxonomyService';
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
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'publish',
    qe_category: [],
    featured_media: null,
    featured_image_url: null,
    _course_position: 0
  });

  // Category management
  const [categories, setCategories] = useState([]);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Lessons are managed inside the course, not here

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
              qe_category: course.qe_category || [],
              featured_media: course.featured_media || null,
              featured_image_url: course._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
              _course_position: parseInt(course.meta?._course_position) || 0
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
        qe_category: [],
        featured_media: null,
        featured_image_url: null,
        _course_position: 0
      });
      setActiveTab(0);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, mode, courseId, getCourse]);

  // Load categories (you'll need to implement this based on your taxonomy system)
  useEffect(() => {
    // TODO: Load categories from taxonomy
    setCategories([
      { value: '1', label: 'Matemáticas' },
      { value: '2', label: 'Ciencias' },
    ]);
  }, []);

  // Handlers
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const newCat = await createTaxonomyTerm('qe_category', { name: newCategoryName });
      setCategories(prev => [...prev, { value: newCat.id.toString(), label: newCat.name }]);
      setFormData(prev => ({ ...prev, qe_category: [...prev.qe_category, newCat.id] }));
      setNewCategoryName('');
      setShowNewCategoryForm(false);
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setCreatingCategory(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('El título es obligatorio');
      setActiveTab(0);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const courseData = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        qe_category: formData.qe_category,
        featured_media: formData.featured_media,
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

  const tabs = [
    { id: 0, label: 'Información', icon: BookOpen }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-16">
      <div 
        className="relative w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.text }}>
              {mode === 'create' ? 'Nuevo Curso' : 'Editar Curso'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {mode === 'create' ? 'Crea un nuevo curso desde cero' : 'Modifica la información del curso'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all"
                style={{
                  backgroundColor: isActive ? colors.bg : 'transparent',
                  color: isActive ? colors.accent : colors.textMuted,
                  borderBottom: isActive ? `2px solid ${colors.accent}` : '2px solid transparent'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={32} style={{ color: colors.accent }} />
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Tab 0: Basic Info */}
              {activeTab === 0 && (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2" style={{ color: colors.text }}>
                      Título del Curso *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder="Ej: Matemáticas Avanzadas"
                      className="w-full p-3 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      style={{
                        border: `2px solid ${colors.inputBorder}`,
                        backgroundColor: colors.inputBg,
                        color: colors.text
                      }}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2" style={{ color: colors.text }}>
                      Descripción
                    </label>
                    <ReactQuill
                      theme="snow"
                      value={formData.content}
                      onChange={(value) => handleFieldChange('content', value)}
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold uppercase" style={{ color: colors.text }}>
                        Categoría
                      </label>
                      {!showNewCategoryForm && (
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryForm(true)}
                          className="text-xs font-medium flex items-center gap-1 hover:underline"
                          style={{ color: colors.accent }}
                        >
                          <Plus size={14} /> Nueva
                        </button>
                      )}
                    </div>

                    {showNewCategoryForm && (
                      <div className="mb-3 p-3 rounded-lg border flex items-center gap-2" style={{ borderColor: colors.border, backgroundColor: colors.inputBg }}>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nueva categoría..."
                          className="flex-1 p-2 rounded border-0 text-sm outline-none"
                          style={{ backgroundColor: 'transparent', color: colors.text }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={creatingCategory}
                          className="px-3 py-2 rounded text-xs font-medium text-white transition-opacity"
                          style={{ backgroundColor: colors.accent, opacity: creatingCategory ? 0.5 : 1 }}
                        >
                          {creatingCategory ? '...' : 'OK'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryForm(false)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ color: colors.textMuted }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <select
                      value={formData.qe_category[0] || ''}
                      onChange={(e) => handleFieldChange('qe_category', e.target.value ? [parseInt(e.target.value)] : [])}
                      className="w-full p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      style={{
                        border: `2px solid ${colors.inputBorder}`,
                        backgroundColor: colors.inputBg,
                        color: colors.text
                      }}
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Featured Image */}
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2" style={{ color: colors.text }}>
                      Imagen Destacada
                    </label>
                    {formData.featured_image_url ? (
                      <div className="relative group">
                        <img 
                          src={formData.featured_image_url} 
                          alt="Featured" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveFeaturedImage}
                          className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSelectFeaturedImage}
                        className="w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-amber-500 transition-colors"
                        style={{ borderColor: colors.border, color: colors.textMuted }}
                      >
                        <ImageIcon size={32} />
                        <span className="text-sm font-medium">Seleccionar imagen</span>
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-bold uppercase mb-2" style={{ color: colors.text }}>
                      Estado
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      style={{
                        border: `2px solid ${colors.inputBorder}`,
                        backgroundColor: colors.inputBg,
                        color: colors.text
                      }}
                    >
                      <option value="publish">Publicado</option>
                      <option value="draft">Borrador</option>
                      <option value="private">Privado</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <div>
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <Trash2 size={16} className="inline mr-2" />
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colors.accent }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} className="inline mr-2" />
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
