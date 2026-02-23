// admin/react-app/src/components/modals/QuestionModal.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Save, Eye, AlertCircle, ChevronDown, Database } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../styles/quill-explanation.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { uploadMedia } from '../../api/services/mediaService';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableOption } from './SortableOption';
import QuizSelector from '../questions/QuizSelector';
import { useTheme } from '../../contexts/ThemeContext';
import { getTaxonomyTerms, createTaxonomyTerm, deleteTaxonomyTerm } from '../../api/services/taxonomyService';

/**
 * Normalize HTML so Quill can render line breaks properly.
 * Quill expects <p> blocks — standalone <br> or plain \n get collapsed.
 */
const normalizeHtmlForQuill = (html) => {
  if (!html || typeof html !== 'string') return '';
  let result = html.trim();

  // If content has no <p> tags at all, wrap lines in <p> blocks
  if (!/<p[\s>]/i.test(result)) {
    // Split on <br> variants and \n, wrap each in <p>
    result = result
      .split(/<br\s*\/?>\s*|\n/)
      .map(line => `<p>${line || '<br>'}</p>`)
      .join('');
    return result;
  }

  // Replace <br> tags that sit between </p> and <p> (stray breaks between paragraphs)
  result = result.replace(/<\/p>\s*(<br\s*\/?>)+\s*<p/gi, '</p><p><br></p><p');

  return result;
};

const QuestionModal = ({
  isOpen, 
  onClose, 
  question = null, 
  onSave, 
  mode = 'create',
  availableQuizzes = [],
  availableLessons = [],
  availableCourses = [],
  isLoading = false,
  onDelete = null, // Optional: called with question id to unassign from test
  onDeleteFromDB = null, // Optional: called with question id to permanently delete from DB (only shown when question has no quiz associations)
  parentQuizId = null, // ID del quiz desde el que se crea/edita (para ocultar QuizSelector y asociar automáticamente)
  isSimplified = false // Oculta campos innecesarios (Categoría, Proveedor, Curso, Lección) cuando estamos en contexto de Test
}) => {
  const { getColor, isDarkMode } = useTheme();
  
  // Colores adaptativos según el modo (como en QuizGeneratorPage)
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    inputBg: isDarkMode ? '#1f2937' : '#ffffff',
    inputBorder: isDarkMode ? '#374151' : '#d1d5db',
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    headerBg: isDarkMode ? getColor('primary', '#1a202c') : '#f9fafb',
    footerBg: isDarkMode ? '#111827' : '#f9fafb',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    overlay: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
  }), [getColor, isDarkMode]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'multiple_choice',
    difficulty: 'medium',
    category: '', // Almacenará el ID de la categoría
    points: '1',
    pointsIncorrect: '0',
    explanation: '',
    quizIds: [],
    lessonId: '',
    courseId: '',
    provider: '', // Almacenará el ID del provider
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
  });

  const [errors, setErrors] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingFromDB, setIsDeletingFromDB] = useState(false);
  const [showDeleteFromDBConfirm, setShowDeleteFromDBConfirm] = useState(false);
  
  // State para Providers
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showNewProviderForm, setShowNewProviderForm] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [creatingProvider, setCreatingProvider] = useState(false);

  // 🔥 NUEVO: State para Categorías
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState(false);

  const quillRef = useRef(null);
  const quillInitialized = useRef(false);
  const titleRef = useRef(null);

  const autoResizeTextarea = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Opción Múltiple' },
    { value: 'true_false', label: 'Verdadero/Falso' },
    { value: 'short_answer', label: 'Respuesta Corta' },
    { value: 'essay', label: 'Desarrollo' },
    { value: 'fill_blank', label: 'Completar' }
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (isOpen) {
      loadProviders();
      loadCategories();
    }
  }, [isOpen]);

  // Pre-select "uniforme-azul" provider when creating a new question
  useEffect(() => {
    if (mode !== 'create' || !isOpen || providers.length === 0) return;
    const uniformeAzul = providers.find(p => p.slug === 'uniforme-azul');
    if (uniformeAzul) {
      setFormData(prev => prev.provider ? prev : { ...prev, provider: uniformeAzul.value });
    }
  }, [providers, mode, isOpen]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const terms = await getTaxonomyTerms('qe_provider');
      const providerOptions = terms.map(term => ({
        value: term.id,
        label: term.name,
        slug: term.slug
      }));
      setProviders(providerOptions);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  // 🔥 NUEVO: Cargar categorías
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const terms = await getTaxonomyTerms('qe_category');
      const categoryOptions = terms.map(term => ({
        value: term.id,
        label: term.name
      }));
      setCategories(categoryOptions);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const createNewProvider = async () => {
    const trimmedName = newProviderName.trim();
    if (!trimmedName) return;

    const existingProvider = providers.find(p => p.label.toLowerCase() === trimmedName.toLowerCase());
    if (existingProvider) {
      handleFieldChange('provider', existingProvider.value);
      setShowNewProviderForm(false);
      setNewProviderName('');
      return;
    }

    setCreatingProvider(true);
    try {
      const newTerm = await createTaxonomyTerm('qe_provider', { name: trimmedName });
      const newProvider = { value: newTerm.id, label: newTerm.name };
      setProviders(prev => [...prev, newProvider]);
      handleFieldChange('provider', newTerm.id);
      setNewProviderName('');
      setShowNewProviderForm(false);
    } catch (error) {
      console.error('Error creating provider:', error);
    } finally {
      setCreatingProvider(false);
    }
  };

  // 🔥 NUEVO: Crear categoría
  const createNewCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const existingCategory = categories.find(c => c.label.toLowerCase() === trimmedName.toLowerCase());
    if (existingCategory) {
      handleFieldChange('category', existingCategory.value);
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      return;
    }

    setCreatingCategory(true);
    try {
      const newTerm = await createTaxonomyTerm('qe_category', { name: trimmedName });
      const newCategory = { value: newTerm.id, label: newTerm.name };
      setCategories(prev => [...prev, newCategory]);
      handleFieldChange('category', newTerm.id);
      setNewCategoryName('');
      setShowNewCategoryForm(false);
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setCreatingCategory(false);
    }
  };

  const deleteCategory = async () => {
    if (!formData.category) return;
    const cat = categories.find(c => c.value == formData.category);
    const confirmed = window.confirm(`¿Borrar la categoría "${cat?.label || formData.category}"?\n\nEsta acción eliminará la categoría del sistema y no se puede deshacer.`);
    if (!confirmed) return;
    setDeletingCategory(true);
    try {
      await deleteTaxonomyTerm('qe_category', formData.category, true);
      setCategories(prev => prev.filter(c => c.value != formData.category));
      handleFieldChange('category', '');
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setDeletingCategory(false);
    }
  };

  const deleteProvider = async () => {
    if (!formData.provider) return;
    const prov = providers.find(p => p.value == formData.provider);
    const confirmed = window.confirm(`¿Borrar el proveedor "${prov?.label || formData.provider}"?\n\nEsta acción eliminará el proveedor del sistema y no se puede deshacer.`);
    if (!confirmed) return;
    setDeletingProvider(true);
    try {
      await deleteTaxonomyTerm('qe_provider', formData.provider, true);
      setProviders(prev => prev.filter(p => p.value != formData.provider));
      handleFieldChange('provider', '');
    } catch (error) {
      console.error('Error deleting provider:', error);
    } finally {
      setDeletingProvider(false);
    }
  };

  useEffect(() => {
    if (question && mode !== 'create') {
        // Modo edición: cargar datos de la pregunta existente
        const existingQuizIds = question.meta?._quiz_ids || [];
        // Si viene de un quiz padre, asegurar que esté incluido
        const quizIds = parentQuizId && !existingQuizIds.includes(parentQuizId) 
          ? [...existingQuizIds, parentQuizId] 
          : existingQuizIds;

        setFormData({
            title: question.title || '',
            type: question.meta?._question_type || 'multiple_choice',
            difficulty: question.meta?._difficulty_level || 'medium',
            category: question.qe_category?.[0] || '', // Usar ID de taxonomía
            points: question.meta?._points?.toString() || '1',
            pointsIncorrect: question.meta?._points_incorrect?.toString() || '0',
            explanation: normalizeHtmlForQuill(
              (typeof question.content === 'object' ? question.content?.rendered || question.content?.raw : question.content) || question.meta?._explanation || ''
            ),
            quizIds: quizIds,
            lessonId: question.meta?._question_lesson?.toString() || '',
            courseId: question.meta?._course_id?.toString() || '',
            provider: question.qe_provider?.[0] || '', // Usar ID de taxonomía
            options: question.meta?._question_options || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
        });
    } else {
      // Reset for create mode - incluir parentQuizId si existe
      setFormData({
        title: '',
        type: 'multiple_choice',
        difficulty: 'medium',
        category: '',
        points: '1',
        pointsIncorrect: '0',
        explanation: '',
        quizIds: parentQuizId ? [parentQuizId] : [],
        lessonId: '',
        courseId: '',
        provider: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
      });
    }
    setErrors({});
    quillInitialized.current = false; // Reset so Quill gets re-initialized
    // Auto-resize title after data loads
    setTimeout(() => autoResizeTextarea(titleRef.current), 0);
  }, [question, mode, isOpen, parentQuizId, autoResizeTextarea]);

  // Set Quill content directly via its API to preserve blank lines.
  // ReactQuill's value prop parses HTML through Quill's clipboard module
  // which strips empty <p> tags. Using the editor's clipboard.dangerouslyPasteHTML
  // or setting innerHTML directly bypasses that limitation.
  useEffect(() => {
    if (quillInitialized.current) return;
    if (!quillRef.current || !formData.explanation) return;

    const editor = quillRef.current.getEditor();
    if (!editor) return;

    const cleanHtml = formData.explanation.replace(/<\/p>\s+<p/gi, '</p><p');
    editor.root.innerHTML = cleanHtml;
    editor.update('silent');
    quillInitialized.current = true;
  }, [formData.explanation]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleOptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [field]: value } : opt)
    }));
  };
  
    const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.options.findIndex((_option, i) => i === active.id);
        const newIndex = prev.options.findIndex((_option, i) => i === over.id);
        return {
          ...prev,
          options: arrayMove(prev.options, oldIndex, newIndex),
        };
      });
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };
  
    const setCorrectAnswer = (index) => {
    if (formData.type === 'multiple_choice') {
      setFormData(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => ({
          ...opt,
          isCorrect: i === index
        }))
      }));
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(question?.id);
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: 'Error al eliminar la pregunta.' }));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteFromDB = async () => {
    if (!onDeleteFromDB) return;
    setIsDeletingFromDB(true);
    try {
      await onDeleteFromDB(question?.id);
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: 'Error al borrar la pregunta del campus.' }));
      setIsDeletingFromDB(false);
      setShowDeleteFromDBConfirm(false);
    }
  };

  const handleSave = async (nextAction) => {
    if (!validateForm()) return;

    try {
      // Construir el objeto para la API, asegurando que las taxonomías son arrays de IDs
      const questionDataForApi = {
        ...formData,
        qe_category: formData.category ? [formData.category] : [],
        qe_provider: formData.provider ? [formData.provider] : [],
      };
      
      await onSave(questionDataForApi, nextAction);

      if (nextAction === 'reset') {
        setFormData(prev => ({
          ...prev,
          title: '',
          explanation: '',
          quizIds: [],
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
        }));
        setErrors({});
      }
    } catch (error) {
      console.error('Error saving question:', error);
      setErrors({ submit: error.message || 'Failed to save the question.' });
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave('close');
  };

  const handleSaveAndNew = (e) => {
    e.preventDefault();
    handleSave('reset');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'El título de la pregunta es obligatorio';
    if (formData.type === 'multiple_choice' || formData.type === 'true_false') {
      if (!formData.options.some(opt => opt.isCorrect)) {
        newErrors.options = 'Selecciona al menos una respuesta correcta';
      }
      if (formData.options.some(opt => !opt.text.trim())) {
        newErrors.options = 'Todas las opciones deben tener texto';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTypeChange = (newType) => {
    let newOptions = [...formData.options];
    if (newType === 'true_false') {
      newOptions = [
        { text: 'Verdadero', isCorrect: formData.options.some(o => o.isCorrect && o.text.toLowerCase() === 'verdadero') },
        { text: 'Falso', isCorrect: formData.options.some(o => o.isCorrect && o.text.toLowerCase() === 'falso') }
      ];
    }
    setFormData(prev => ({
      ...prev,
      type: newType,
      options: newOptions
    }));
  };

  const imageHandler = useCallback(async () => {
    try {
      const media = await openMediaSelector({
        title: 'Seleccionar imagen',
        buttonText: 'Insertar imagen',
        type: 'image'
      });
      if (media && media.url && quillRef.current) {
        const quillEditor = quillRef.current.getEditor();
        const range = quillEditor.getSelection(true);
        quillEditor.insertEmbed(range.index, 'image', media.url);
        quillEditor.setSelection(range.index + 1);
      }
    } catch (error) {
      console.error("Error al abrir el selector de medios:", error);
      alert("No se pudo abrir la librería de medios de WordPress.");
    }
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        'image': imageHandler,
      },
    },
  }), [imageHandler]);


  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? 'Nueva Pregunta' : mode === 'edit' ? 'Editar Pregunta' : 'Ver Pregunta';

  return (
    <div 
      className="fixed inset-0 flex items-start justify-center z-[10000] p-4 pt-32"
      style={{ backgroundColor: pageColors.overlay }}
    >
      <div 
        className="rounded-xl shadow-2xl w-full max-w-3xl max-h-[75vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: pageColors.cardBg }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ 
            backgroundColor: pageColors.headerBg,
            borderBottom: `1px solid ${pageColors.border}`
          }}
        >
          <h2 className="text-base font-bold" style={{ color: pageColors.text }}>{modalTitle}</h2>
          <button 
            type="button"
            onClick={onClose} 
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: pageColors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              e.currentTarget.style.color = pageColors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = pageColors.textMuted;
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Título de la Pregunta */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: pageColors.text }}>
              Título de la Pregunta *
            </label>
            <textarea
              ref={titleRef}
              value={formData.title}
              onChange={(e) => { handleFieldChange('title', e.target.value); autoResizeTextarea(e.target); }}
              placeholder="Escribe el enunciado de la pregunta..."
              disabled={isReadOnly}
              rows={1}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: `2px solid ${errors.title ? '#ef4444' : pageColors.inputBorder}`,
                backgroundColor: pageColors.inputBg,
                color: pageColors.text,
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.4',
                fontFamily: 'inherit'
              }}
            />
            {errors.title && (
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>{errors.title}</p>
            )}
          </div>

          {/* Fila 1: Categoría, Proveedor, Dificultad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Categoría */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase" style={{ color: pageColors.text }}>Categoría</label>
                {!isReadOnly && !showNewCategoryForm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {formData.category && (
                      <button
                        type="button"
                        onClick={deleteCategory}
                        disabled={deletingCategory}
                        title="Borrar esta categoría"
                        style={{
                          padding: '2px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: deletingCategory ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: deletingCategory ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => { if (!deletingCategory) e.currentTarget.style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = deletingCategory ? '0.5' : '1'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryForm(true)}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: pageColors.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
              {showNewCategoryForm && (
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: isDarkMode ? '#111827' : '#f9fafb', border: `1px solid ${pageColors.border}`, borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nueva categoría..."
                      style={{ flex: 1, padding: '6px 10px', border: `1px solid ${pageColors.inputBorder}`, borderRadius: '4px', fontSize: '13px', backgroundColor: pageColors.inputBg, color: pageColors.text }}
                    />
                    <button
                      type="button"
                      onClick={createNewCategory}
                      disabled={creatingCategory}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: pageColors.accent,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: creatingCategory ? 'not-allowed' : 'pointer',
                        opacity: creatingCategory ? 0.7 : 1
                      }}
                    >
                      {creatingCategory ? '...' : 'OK'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryForm(false)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: pageColors.inputBg,
                        color: pageColors.text,
                        border: `1px solid ${pageColors.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      X
                    </button>
                  </div>
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  disabled={isReadOnly || loadingCategories}
                  style={{
                    width: '100%',
                    padding: '10px 32px 10px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">
                    {loadingCategories ? 'Cargando...' : 'Seleccionar categoría'}
                  </option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: pageColors.textMuted 
                  }} 
                />
              </div>
            </div>

            {/* Proveedor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase" style={{ color: pageColors.text }}>Proveedor</label>
                {!isReadOnly && !showNewProviderForm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {formData.provider && (
                      <button
                        type="button"
                        onClick={deleteProvider}
                        disabled={deletingProvider}
                        title="Borrar este proveedor"
                        style={{
                          padding: '2px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: deletingProvider ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: deletingProvider ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => { if (!deletingProvider) e.currentTarget.style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = deletingProvider ? '0.5' : '1'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewProviderForm(true)}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: pageColors.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
              {showNewProviderForm && (
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: isDarkMode ? '#111827' : '#f9fafb', border: `1px solid ${pageColors.border}`, borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      placeholder="Nuevo proveedor..."
                      style={{ flex: 1, padding: '6px 10px', border: `1px solid ${pageColors.inputBorder}`, borderRadius: '4px', fontSize: '13px', backgroundColor: pageColors.inputBg, color: pageColors.text }}
                    />
                    <button
                      type="button"
                      onClick={createNewProvider}
                      disabled={creatingProvider}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: pageColors.accent,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: creatingProvider ? 'not-allowed' : 'pointer',
                        opacity: creatingProvider ? 0.7 : 1
                      }}
                    >
                      {creatingProvider ? '...' : 'OK'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewProviderForm(false)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: pageColors.inputBg,
                        color: pageColors.text,
                        border: `1px solid ${pageColors.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      X
                    </button>
                  </div>
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.provider}
                  onChange={(e) => handleFieldChange('provider', e.target.value)}
                  disabled={isReadOnly || loadingProviders}
                  style={{
                    width: '100%',
                    padding: '8px 24px 8px 10px',
                    borderRadius: '8px',
                    border: `2px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">
                    {loadingProviders ? 'Cargando...' : 'Seleccionar proveedor'}
                  </option>
                  {providers.map(prov => (
                    <option key={prov.value} value={prov.value}>
                      {prov.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: pageColors.textMuted 
                  }} 
                />
              </div>
            </div>

            {/* Dificultad */}
            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: pageColors.text }}>Dificultad</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    padding: '8px 24px 8px 10px',
                    borderRadius: '8px',
                    border: `2px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {difficultyLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: pageColors.textMuted 
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Fila 2: Asignar a Curso, Asignar a Tema */}
          {!isSimplified && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Asignar a Curso */}
            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: pageColors.text }}>Asignar a Curso</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.courseId}
                  onChange={(e) => handleFieldChange('courseId', e.target.value)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    padding: '8px 24px 8px 10px',
                    borderRadius: '8px',
                    border: `2px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Sin curso asignado</option>
                  {availableCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title?.rendered || course.title}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: pageColors.textMuted 
                  }} 
                />
              </div>
            </div>

            {/* Asignar a Tema */}
            <div>
              <label className="block text-xs font-bold uppercase mb-1" style={{ color: pageColors.text }}>Asignar a Tema</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.lessonId}
                  onChange={(e) => handleFieldChange('lessonId', e.target.value)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    padding: '8px 24px 8px 10px',
                    borderRadius: '8px',
                    border: `2px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Sin tema (Pregunta General)</option>
                  {availableLessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title?.rendered || lesson.title}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    pointerEvents: 'none',
                    color: pageColors.textMuted 
                  }} 
                />
              </div>
            </div>
          </div>
          )}

          {/* Opciones de Respuesta */}
          {(formData.type === 'multiple_choice' || formData.type === 'true_false') && (
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: pageColors.text }}>Opciones de Respuesta *</label>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={formData.options.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <SortableOption
                        key={index}
                        id={index}
                        option={option}
                        index={index}
                        isReadOnly={isReadOnly}
                        isMultipleChoice={formData.type === 'multiple_choice'}
                        handleOptionChange={handleOptionChange}
                        setCorrectAnswer={setCorrectAnswer}
                        removeOption={removeOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {!isReadOnly && formData.type === 'multiple_choice' && (
                <button 
                  type="button"
                  onClick={addOption} 
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: `1px solid ${pageColors.inputBorder}`,
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.text,
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Plus size={12} />
                  Añadir Opción
                </button>
              )}
              {errors.options && <p style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>{errors.options}</p>}
            </div>
          )}

          {/* Asignar a Tests - Oculto si viene de un test específico O si estamos en modo simplificado */}
          {!parentQuizId && !isSimplified && (
            <div className="mb-3">
              <QuizSelector
                availableQuizzes={availableQuizzes}
                selectedQuizIds={formData.quizIds}
                onChange={(newQuizIds) => handleFieldChange('quizIds', newQuizIds)}
                disabled={isReadOnly}
              />
            </div>
          )}
            
          {/* Explicación */}
          <div className="explanation-editor">
            <label className="block text-xs font-bold uppercase mb-1" style={{ color: pageColors.text }}>Explicación (Opcional)</label>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              defaultValue=""
              onChange={(value) => handleFieldChange('explanation', value)}
              modules={quillModules}
            />
          </div>
            
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <div
            className="flex items-center justify-between gap-3 p-4"
            style={{
              borderTop: `1px solid ${pageColors.inputBorder}`,
              backgroundColor: pageColors.cardBg
            }}
          >
            {/* Left: Delete buttons (edit mode only) */}
            <div className="flex items-center gap-2">
              {(() => {
                const hasQuizAssociations = (question?.meta?._quiz_ids?.length ?? 0) > 0;
                // If a confirm flow is active, show only that flow
                if (showDeleteConfirm) {
                  return (
                    <>
                      <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '500' }}>¿Confirmar?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          backgroundColor: '#ef4444', color: '#ffffff',
                          fontSize: '13px', fontWeight: '500',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          border: `1px solid ${pageColors.inputBorder}`,
                          backgroundColor: pageColors.inputBg, color: pageColors.text,
                          fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  );
                }
                if (showDeleteFromDBConfirm) {
                  return (
                    <>
                      <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '500' }}>¿Borrar del campus?</span>
                      <button
                        type="button"
                        onClick={handleDeleteFromDB}
                        disabled={isDeletingFromDB}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          backgroundColor: '#b45309', color: '#ffffff',
                          fontSize: '13px', fontWeight: '500',
                          cursor: isDeletingFromDB ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isDeletingFromDB ? 'Borrando...' : 'Sí, borrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteFromDBConfirm(false)}
                        disabled={isDeletingFromDB}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          border: `1px solid ${pageColors.inputBorder}`,
                          backgroundColor: pageColors.inputBg, color: pageColors.text,
                          fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  );
                }
                // Default: show available action buttons
                return (
                  <>
                    {mode === 'edit' && onDelete && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting || isLoading}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          border: '1px solid #ef4444', backgroundColor: 'transparent',
                          color: '#ef4444', fontSize: '13px', fontWeight: '500',
                          cursor: isDeleting || isLoading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          opacity: isDeleting || isLoading ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={13} />
                        Eliminar
                      </button>
                    )}
                    {mode === 'edit' && onDeleteFromDB && !hasQuizAssociations && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteFromDBConfirm(true)}
                        disabled={isDeletingFromDB || isLoading}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          border: '1px solid #b45309', backgroundColor: 'transparent',
                          color: '#b45309', fontSize: '13px', fontWeight: '500',
                          cursor: isDeletingFromDB || isLoading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          opacity: isDeletingFromDB || isLoading ? 0.5 : 1,
                        }}
                      >
                        <Database size={13} />
                        Borrar de campus
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right: errors + cancel + save */}
            <div className="flex items-center gap-3">
            {errors.submit && <p style={{ color: '#dc2626', fontSize: '13px' }}>{errors.submit}</p>}
            <button 
              type="button"
              onClick={onClose} 
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${pageColors.inputBorder}`,
                backgroundColor: pageColors.inputBg,
                color: pageColors.text,
                fontSize: '13px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = isLoading ? '0.7' : '1';
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              onClick={handleSubmit} 
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              {isLoading ? 'Guardando...' : (mode === 'create' ? 'Crear Pregunta' : 'Guardar Cambios')}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionModal;