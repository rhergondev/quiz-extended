// admin/react-app/src/components/modals/QuestionModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Save, Eye } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableOption } from './SortableOption'

const QuestionModal = ({ 
  isOpen, 
  onClose, 
  question = null, 
  onSave, 
  mode = 'create',
  availableQuizzes = [],
  availableLessons = [], // ❇️ AÑADIDO: Prop para el nuevo dropdown
  isLoading = false 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'multiple_choice',
    difficulty: 'medium',
    category: '',
    quizId: '',
    explanation: '',
    lessonId: '',     // ❇️ AÑADIDO
    provider: 'human', // ❇️ AÑADIDO (default 'human')
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
  });

  const [errors, setErrors] = useState({});

  const providerOptions = [
  { value: 'human', label: 'Human (Manual Entry)' },
  { value: 'ai_gpt4', label: 'AI (GPT-4)' },
  { value: 'ai_gemini', label: 'AI (Gemini)' },
  { value: 'imported', label: 'Imported' },
];

  // Question types available
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

  // Initialize form data when question changes
  useEffect(() => {
    if (question && mode !== 'create') {
      // ... (lógica de formattedOptions se mantiene) ...
      const questionOptions = question.meta?._question_options || [];
      const formattedOptions = Array.isArray(questionOptions) && questionOptions.length > 0 
        ? questionOptions.map(opt => ({
            text: opt.text || '',
            isCorrect: opt.is_correct || false
          }))
        : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];


      setFormData({
        title: question.title?.rendered || question.title || '',
        type: question.meta?._question_type || 'multiple_choice',
        difficulty: question.meta?._difficulty_level || 'medium',
        category: question.meta?._question_category || '',
        points: question.meta?._points || '1',
        explanation: question.meta?._explanation || '',
        quizId: question.meta?._quiz_id || '',
        lessonId: question.meta?._question_lesson || '',     // ❇️ AÑADIDO
        provider: question.meta?._question_provider || 'human', // ❇️ AÑADIDO
        options: formattedOptions,
      });
    } else if (mode === 'create') {
      // Reset form
      setFormData({
        title: '',
        type: 'multiple_choice',
        difficulty: 'medium',
        category: '',
        points: '1',
        explanation: '', // 🛑 ELIMINADO
        quizId: '',
        lessonId: '',     // ❇️ AÑADIDO
        provider: 'human', // ❇️ AÑADIDO
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
      });
    }
    setErrors({});
  }, [question, mode, isOpen]);

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleExplanationChange = (content) => {
    handleFieldChange('explanation', content);
  };

  // Handle option changes
  const handleOptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
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


  // Add new option
  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  // Remove option
  const removeOption = (index) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  // Set correct answer (only one can be correct for multiple choice)
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

  
  /**
 * ✅ NUEVA FUNCIÓN CENTRALIZADA
 * Valida, construye el objeto de datos, lo guarda y luego ejecuta la siguiente acción.
 * @param {'close' | 'reset'} nextAction - La acción a realizar después de guardar.
 */
const handleSave = async (nextAction) => {
  if (!validateForm()) return;

  // Objeto de datos ÚNICO y actualizado para enviar al hook
  const questionDataForHook = {
    title: formData.title,
    status: 'publish',
    quizId: formData.quizId,
    lessonId: formData.lessonId,
    provider: formData.provider,
    explanation: formData.explanation,
    type: formData.type,
    difficulty: formData.difficulty,
    category: formData.category,
    options: formData.options,
    points: '1',
    pointsIncorrect: '0',
  };

  try {
    // onSave (que es createQuestion del hook) recibe el objeto
    await onSave(questionDataForHook);

    // Ejecutamos la acción post-guardado
    if (nextAction === 'close') {
      onClose();
    } else if (nextAction === 'reset') {
      setFormData(prev => ({
        ...prev, // Mantiene type, difficulty, provider, quizId, lessonId
        title: '',
        explanation: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
      }));
      setErrors({});
      document.querySelector('input[type="text"]').focus();
    }
  } catch (error) {
    console.error('Error saving question:', error);
    setErrors({ submit: error.message || 'Failed to save the question.' });
  }
};

  /**
   * Manejador para el botón principal de guardado. Llama a handleSave y luego cierra el modal.
   */
const handleSubmit = (e) => {
  e.preventDefault();
  handleSave('close'); // Después de guardar, cierra el modal.
};

/**
 * ✅ Manejador simplificado para el botón "Save & Add New".
 */
const handleSaveAndNew = (e) => {
  e.preventDefault();
  handleSave('reset'); // Después de guardar, resetea el formulario.
};

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Question title is required';
    }

    if (formData.type === 'multiple_choice') {
      const hasCorrectAnswer = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        newErrors.options = 'Please select a correct answer';
      }

      const hasEmptyOptions = formData.options.some(opt => !opt.text.trim());
      if (hasEmptyOptions) {
        newErrors.options = 'All options must have text';
      }
    }

    if (formData.type === 'true_false') {
      const hasCorrectAnswer = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        newErrors.options = 'Please select the correct answer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle question type change
  const handleTypeChange = (newType) => {
    let newOptions = [...formData.options];
    
    if (newType === 'true_false') {
      newOptions = [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
      ];
    } else if (newType === 'multiple_choice' && formData.options.length < 2) {
      newOptions = [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ];
    }

    setFormData(prev => ({
      ...prev,
      type: newType,
      options: newOptions
    }));
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? 'Create New Question' : 
                   mode === 'edit' ? 'Edit Question' : 'View Question';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {mode === 'view' ? (
              <Eye className="h-6 w-6 text-blue-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-indigo-600" />
            )}
            <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

               {/* --- ❇️ BLOQUE DE ASIGNACIÓN ACTUALIZADO ❇️ --- */}
          {/* Quiz Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Quiz
            </label>
            <select
              value={formData.quizId}
              onChange={(e) => handleFieldChange('quizId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isReadOnly}
            >
              <option value="">No Quiz (Question Bank)</option>
              {availableQuizzes.map(quiz => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title?.rendered || quiz.title}
                </option>
              ))}
            </select>
          </div>

          {/* ❇️ AÑADIDO: Lesson Assignment */}
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
          
          {/* ❇️ AÑADIDO: Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleFieldChange('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isReadOnly}
            >
              {providerOptions.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Math, Science, History"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Answer Options - Multiple Choice & True/False */}
            {(formData.type === 'multiple_choice' || formData.type === 'true_false') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Answer Options *
                  </label>
                  {formData.type === 'multiple_choice' && !isReadOnly && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    // Le pasamos un array de IDs únicos (en este caso, los índices)
                    items={formData.options.map((_, i) => i)}
                    strategy={verticalListSortingStrategy}
                  >
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

                {errors.options && (
                  <p className="mt-1 text-sm text-red-600">{errors.options}</p>
                )}
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <ReactQuill
                theme="snow"
                value={formData.explanation}
                onChange={handleExplanationChange}
                readOnly={isReadOnly}
                className={isReadOnly ? 'bg-gray-50' : ''}
              />
            </div>
          </div>

          {/* Footer */}
          {!isReadOnly && (
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAndNew}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                {isLoading ? 'Saving...' : 'Save & Add New'}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : (mode === 'create' ? 'Create Question' : 'Save Changes')}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default QuestionModal;