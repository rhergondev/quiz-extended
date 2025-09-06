// admin/react-app/src/components/modals/QuestionModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Save, Eye } from 'lucide-react';

const QuestionModal = ({ 
  isOpen, 
  onClose, 
  question = null, 
  onSave, 
  mode = 'create', // 'create', 'edit', 'view'
  availableQuizzes = [],
  isLoading = false 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'multiple_choice',
    difficulty: 'medium',
    category: '',
    points: '1',
    timeLimit: '0',
    explanation: '',
    quizId: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    feedbackCorrect: '',
    feedbackIncorrect: ''
  });

  const [errors, setErrors] = useState({});

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

  // Initialize form data when question changes
  useEffect(() => {
    if (question && mode !== 'create') {
      const questionOptions = question.meta?._question_options || [];
      const formattedOptions = Array.isArray(questionOptions) && questionOptions.length > 0 
        ? questionOptions.map(opt => ({
            text: opt.text || '',
            isCorrect: opt.is_correct || false
          }))
        : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];

      setFormData({
        title: question.title?.rendered || question.title || '',
        content: question.content?.rendered || question.content || '',
        type: question.meta?._question_type || 'multiple_choice',
        difficulty: question.meta?._difficulty_level || 'medium',
        category: question.meta?._question_category || '',
        points: question.meta?._points || '1',
        timeLimit: question.meta?._time_limit || '0',
        explanation: question.meta?._explanation || '',
        quizId: question.meta?._quiz_id || '',
        options: formattedOptions,
        feedbackCorrect: question.meta?._feedback_correct || '',
        feedbackIncorrect: question.meta?._feedback_incorrect || ''
      });
    } else if (mode === 'create') {
      // Reset form for new question
      setFormData({
        title: '',
        content: '',
        type: 'multiple_choice',
        difficulty: 'medium',
        category: '',
        points: '1',
        timeLimit: '0',
        explanation: '',
        quizId: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        feedbackCorrect: '',
        feedbackIncorrect: ''
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

  // Handle option changes
  const handleOptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
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

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Question title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Question content is required';
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

  const questionData = {
    title: formData.title,
    content: formData.content,
    status: 'publish',
    
    meta: {
      _question_type: formData.type,
      _difficulty_level: formData.difficulty,
      _question_category: formData.category || '',
      _points: formData.points.toString(),
      _time_limit: formData.timeLimit.toString(),
      _explanation: formData.explanation || '',
      _quiz_id: formData.quizId || '',
      _question_options: formData.options,
      _feedback_correct: formData.feedbackCorrect || '',
      _feedback_incorrect: formData.feedbackIncorrect || ''
    }
  };

    try {
      await onSave(questionData);
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question Title */}
              <div className="md:col-span-2">
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

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={(e) => handleFieldChange('points', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isReadOnly}
                />
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (seconds, 0 = no limit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.timeLimit}
                  onChange={(e) => handleFieldChange('timeLimit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {/* Question Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.content ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter the question content"
                disabled={isReadOnly}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
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

                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(index)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          option.isCorrect
                            ? 'bg-green-100 border-green-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        disabled={isReadOnly}
                      >
                        {option.isCorrect && (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                      </button>
                      
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Option ${index + 1}`}
                        disabled={isReadOnly || (formData.type === 'true_false')}
                      />
                      
                      {formData.type === 'multiple_choice' && formData.options.length > 2 && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

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
              <textarea
                value={formData.explanation}
                onChange={(e) => handleFieldChange('explanation', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Provide an explanation for the correct answer"
                disabled={isReadOnly}
              />
            </div>

            {/* Feedback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer Feedback
                </label>
                <textarea
                  value={formData.feedbackCorrect}
                  onChange={(e) => handleFieldChange('feedbackCorrect', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Feedback when answer is correct"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incorrect Answer Feedback
                </label>
                <textarea
                  value={formData.feedbackIncorrect}
                  onChange={(e) => handleFieldChange('feedbackIncorrect', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Feedback when answer is incorrect"
                  disabled={isReadOnly}
                />
              </div>
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