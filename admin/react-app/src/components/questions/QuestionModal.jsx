// admin/react-app/src/components/modals/QuestionModal.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Save, Eye, AlertCircle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
import Button from '../common/Button';
import FilterDropdown from '../common/FilterDropdown';
import { getTaxonomyTerms, createTaxonomyTerm } from '../../api/services/taxonomyService';

const QuestionModal = ({ 
  isOpen, 
  onClose, 
  question = null, 
  onSave, 
  mode = 'create',
  availableQuizzes = [],
  availableLessons = [],
  isLoading = false 
}) => {
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

  const quillRef = useRef(null);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay' },
    { value: 'fill_blank', label: 'Fill in Blank' }
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
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
      loadCategories(); // 🔥 NUEVO: Cargar categorías al abrir
    }
  }, [isOpen]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const terms = await getTaxonomyTerms('qe_provider');
      const providerOptions = terms.map(term => ({
        value: term.id,
        label: term.name
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

  useEffect(() => {
    if (question && mode !== 'create') {
        setFormData({
            title: question.title || '',
            type: question.meta?._question_type || 'multiple_choice',
            difficulty: question.meta?._difficulty_level || 'medium',
            category: question.qe_category?.[0] || '', // Usar ID de taxonomía
            points: question.meta?._points?.toString() || '1',
            pointsIncorrect: question.meta?._points_incorrect?.toString() || '0',
            explanation: question.content || question.meta?._explanation || '',
            quizIds: question.meta?._quiz_ids || [],
            lessonId: question.meta?._question_lesson?.toString() || '',
            courseId: question.meta?._course_id?.toString() || '',
            provider: question.qe_provider?.[0] || '', // Usar ID de taxonomía
            options: question.meta?._question_options || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
        });
    } else {
      // Reset for create mode
      setFormData({
        title: '',
        type: 'multiple_choice',
        difficulty: 'medium',
        category: '',
        points: '1',
        pointsIncorrect: '0',
        explanation: '',
        quizIds: [],
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
  }, [question, mode, isOpen]);


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
    if (!formData.title.trim()) newErrors.title = 'Question title is required';
    if (formData.type === 'multiple_choice' || formData.type === 'true_false') {
      if (!formData.options.some(opt => opt.isCorrect)) {
        newErrors.options = 'Please select a correct answer';
      }
      if (formData.options.some(opt => !opt.text.trim())) {
        newErrors.options = 'All options must have text';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTypeChange = (newType) => {
    let newOptions = [...formData.options];
    if (newType === 'true_false') {
      newOptions = [
        { text: 'True', isCorrect: formData.options.some(o => o.isCorrect && o.text.toLowerCase() === 'true') },
        { text: 'False', isCorrect: formData.options.some(o => o.isCorrect && o.text.toLowerCase() === 'false') }
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
      const imageUrl = await openMediaSelector();
      if (imageUrl && quillRef.current) {
        const quillEditor = quillRef.current.getEditor();
        const range = quillEditor.getSelection(true);
        quillEditor.insertEmbed(range.index, 'image', imageUrl);
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
  const modalTitle = mode === 'create' ? 'Create New Question' : mode === 'edit' ? 'Edit Question' : 'View Question';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
           {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Question Title */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter question title"
                  disabled={isReadOnly}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isReadOnly}
                >
                  {questionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isReadOnly}
                >
                  {difficultyLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

            {/* Quiz Assignment - Multiple Select */}
            <div>
              <QuizSelector
                availableQuizzes={availableQuizzes}
                selectedQuizIds={formData.quizIds}
                onChange={(newQuizIds) => handleFieldChange('quizIds', newQuizIds)}
                disabled={isReadOnly}
              />
            </div>

            {/* Lesson Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Lesson
              </label>
              <select
                value={formData.lessonId}
                onChange={(e) => handleFieldChange('lessonId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isReadOnly}
              >
                <option value="">No Lesson (General Question)</option>
                {availableLessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title?.rendered || lesson.title}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Provider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Question Provider
                </label>
                {!isReadOnly && !showNewProviderForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewProviderForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-4 w-4 inline-block mr-1" />
                    Add New
                  </button>
                )}
              </div>
              {showNewProviderForm && (
                <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      placeholder="New provider name..."
                      className="flex-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <Button size="sm" onClick={createNewProvider} isLoading={creatingProvider}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowNewProviderForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <FilterDropdown
                label=""
                value={formData.provider}
                onChange={(value) => handleFieldChange('provider', value)}
                options={providers}
                placeholder="Select a provider"
                isLoading={loadingProviders}
                showSearch
              />
            </div>

              {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                {!isReadOnly && !showNewCategoryForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-4 w-4 inline-block mr-1" /> Add New
                  </button>
                )}
              </div>
              {showNewCategoryForm && (
                <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <Button size="sm" onClick={createNewCategory} isLoading={creatingCategory}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowNewCategoryForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <FilterDropdown
                label=""
                value={formData.category}
                onChange={(value) => handleFieldChange('category', value)}
                options={categories}
                placeholder="Select a category"
                isLoading={loadingCategories}
                showSearch
              />
            </div>
            </div>

            {/* Answer Options */}
            {(formData.type === 'multiple_choice' || formData.type === 'true_false') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options *</label>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={formData.options.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
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
                  <Button variant="secondary" size="sm" onClick={addOption} className="mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                )}
                {errors.options && <p className="mt-1 text-sm text-red-600">{errors.options}</p>}
              </div>
            )}
            
            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={formData.explanation}
                onChange={(value) => handleFieldChange('explanation', value)}
                modules={quillModules}
              />
            </div>
            
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            {mode === 'create' && (
              <Button onClick={handleSaveAndNew} disabled={isLoading} isLoading={isLoading}>Save & Add New</Button>
            )}
            <Button type="submit" onClick={handleSubmit} disabled={isLoading} isLoading={isLoading}>
              {mode === 'create' ? 'Create Question' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionModal;