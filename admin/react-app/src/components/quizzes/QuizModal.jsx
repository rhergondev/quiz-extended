// admin/react-app/src/components/quizzes/QuizModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, AlertCircle, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getApiConfig, getDefaultHeaders } from '../../api/config/apiConfig';

const QuizModal = ({
  isOpen,
  onClose,
  quiz = null,
  onSave,
  mode = 'create',
  availableCourses = [],
  availableCategories = [],
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    courseId: '',
    category: '',
    difficulty: 'medium',
    quizType: 'assessment',
    questionIds: [],
    passingScore: '50',
    timeLimit: '',
    maxAttempts: '',
    randomizeQuestions: false,
    showResults: true,
    enableNegativeScoring: false,
  });

  const [errors, setErrors] = useState({});

  // State for question search and selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  const difficultyLevels = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const quizTypes = [
    { value: 'assessment', label: 'Assessment' },
    { value: 'practice', label: 'Practice' },
    { value: 'exam', label: 'Exam' },
    { value: 'survey', label: 'Survey' }
  ];

  // Initialize form data when quiz changes
  useEffect(() => {
    if (quiz && mode !== 'create') {
      setFormData({
        title: quiz.title?.rendered || quiz.title || '',
        instructions: quiz.content?.rendered || quiz.content || '',
        courseId: quiz.meta?._course_id || '',
        category: quiz.meta?._quiz_category || '',
        difficulty: quiz.meta?._difficulty_level || 'medium',
        quizType: quiz.meta?._quiz_type || 'assessment',
        questionIds: quiz.meta?._quiz_question_ids || [],
        passingScore: quiz.meta?._passing_score || '50',
        timeLimit: quiz.meta?._time_limit || '',
        maxAttempts: quiz.meta?._max_attempts || '',
        randomizeQuestions: quiz.meta?._randomize_questions === 'yes',
        showResults: quiz.meta?._show_results === 'yes',
        enableNegativeScoring: quiz.meta?._enable_negative_scoring || false,
      });

      // Load selected questions if we have IDs
      if (quiz.meta?._quiz_question_ids?.length > 0) {
        loadQuestionsFromIds(quiz.meta._quiz_question_ids);
      }
    } else if (mode === 'create') {
      resetForm();
    }
    setErrors({});
  }, [quiz, mode, isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      instructions: '',
      courseId: '',
      category: '',
      difficulty: 'medium',
      quizType: 'assessment',
      questionIds: [],
      passingScore: '50',
      timeLimit: '',
      maxAttempts: '',
      randomizeQuestions: false,
      showResults: true,
      enableNegativeScoring: false,
    });
    setSelectedQuestions([]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Load questions from IDs (for edit mode)
  const loadQuestionsFromIds = async (questionIds) => {
    try {
      const config = getApiConfig();
      const promises = questionIds.map(id =>
        fetch(`${config.endpoints.questions}/${id}`, {
          headers: getDefaultHeaders(),
          credentials: 'same-origin'
        }).then(res => res.json())
      );
      const questions = await Promise.all(promises);
      setSelectedQuestions(questions);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Quiz title is required';
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Please select a course';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (selectedQuestions.length === 0) {
      newErrors.questions = 'Please add at least one question to the quiz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Search questions
  const handleSearchQuestions = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const config = getApiConfig();
      const params = new URLSearchParams({
        search: searchQuery,
        per_page: 20,
        status: 'publish,draft', // Para que muestre tanto publicadas como borradores
        _fields: 'id,title,content,meta' // Optimizar la respuesta
      });
      
      // USAR TU ENDPOINT CONFIGURADO, NO UNO HARDCODEADO
      const url = `${config.endpoints.questions}?${params}`;
      console.log('🔍 Searching questions at:', url);
      
      const response = await fetch(url, {
        headers: getDefaultHeaders(),
        credentials: 'same-origin'
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      
      // Formatear las preguntas para que coincidan con tu estructura
      const formattedResults = results.map(question => ({
        id: question.id,
        title: question.title?.rendered || question.title,
        content: question.content?.rendered || question.content,
        options: question.meta?._question_options || [],
        meta: question.meta || {}
      }));
      
      setSearchResults(formattedResults);
      
    } catch (error) {
      console.error('Error searching questions:', error);
      setErrors({ search: 'Failed to search questions' });
    } finally {
      setIsSearching(false);
    }
  };

  // Add question to quiz
  const addQuestionToQuiz = (question) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions(prev => [...prev, question]);
      setFormData(prev => ({
        ...prev,
        questionIds: [...prev.questionIds, question.id]
      }));
      // Clear search results after adding
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  // Remove question from quiz
  const removeQuestionFromQuiz = (questionId) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    setFormData(prev => ({
      ...prev,
      questionIds: prev.questionIds.filter(id => id !== questionId)
    }));
  };

  // Handle save
  const handleSave = async (nextAction) => {
    if (!validateForm()) return;

    const quizDataForHook = {
      title: formData.title,
      instructions: formData.instructions,
      status: 'publish',
      courseId: formData.courseId,
      category: formData.category,
      difficulty: formData.difficulty,
      quizType: formData.quizType,
      questionIds: formData.questionIds,
      passingScore: formData.passingScore,
      timeLimit: formData.timeLimit,
      maxAttempts: formData.maxAttempts,
      randomizeQuestions: formData.randomizeQuestions,
      showResults: formData.showResults,
      enableNegativeScoring: formData.enableNegativeScoring,
    };

    try {
      await onSave(quizDataForHook, nextAction);

      if (nextAction === 'reset') {
        resetForm();
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      setErrors({ submit: error.message || 'Failed to save the quiz.' });
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

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? 'Create New Quiz' :
                   mode === 'edit' ? 'Edit Quiz' : 'View Quiz';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Quiz Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter quiz title"
                disabled={isReadOnly}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Categorization Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => handleFieldChange('courseId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.courseId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isReadOnly}
                >
                  <option value="">Select Course</option>
                  {availableCourses.map(course => (
                    <option key={course.value} value={course.value}>
                      {course.label}
                    </option>
                  ))}
                </select>
                {errors.courseId && (
                  <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isReadOnly}
                >
                  <option value="">Select Category</option>
                  {availableCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
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
            </div>

            {/* Quiz Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Type
              </label>
              <select
                value={formData.quizType}
                onChange={(e) => handleFieldChange('quizType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isReadOnly}
              >
                {quizTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <ReactQuill
                value={formData.instructions}
                onChange={(content) => handleFieldChange('instructions', content)}
                theme="snow"
                readOnly={isReadOnly}
                className={isReadOnly ? 'opacity-60' : ''}
                modules={{
                  toolbar: isReadOnly ? false : [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                  ]
                }}
              />
            </div>

            {/* Quiz Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quiz Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) => handleFieldChange('passingScore', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.timeLimit}
                    onChange={(e) => handleFieldChange('timeLimit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Leave empty for unlimited"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxAttempts}
                    onChange={(e) => handleFieldChange('maxAttempts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Leave empty for unlimited"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="randomizeQuestions"
                    checked={formData.randomizeQuestions}
                    onChange={(e) => handleFieldChange('randomizeQuestions', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isReadOnly}
                  />
                  <label htmlFor="randomizeQuestions" className="ml-2 block text-sm text-gray-700">
                    Randomize Questions
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showResults"
                    checked={formData.showResults}
                    onChange={(e) => handleFieldChange('showResults', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isReadOnly}
                  />
                  <label htmlFor="showResults" className="ml-2 block text-sm text-gray-700">
                    Show Results After Completion
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableNegativeScoring"
                    checked={formData.enableNegativeScoring}
                    onChange={(e) => handleFieldChange('enableNegativeScoring', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={isReadOnly}
                  />
                  <label htmlFor="enableNegativeScoring" className="ml-2 block text-sm text-gray-700">
                    Enable Negative Scoring
                  </label>
                </div>
              </div>
            </div>

            {/* Question Association Section */}
            {!isReadOnly && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Associated Questions
                </h3>

                {/* Search Questions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search and Add Questions
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchQuestions())}
                      placeholder="Search questions by title..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSearchQuestions}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {errors.search && (
                    <p className="mt-1 text-sm text-red-600">{errors.search}</p>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-4 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map(question => (
                      <div
                        key={question.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {question.title?.rendered || question.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {question.meta?._question_type} • {question.meta?._difficulty_level}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addQuestionToQuiz(question)}
                          disabled={selectedQuestions.find(q => q.id === question.id)}
                          className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {selectedQuestions.find(q => q.id === question.id) ? 'Added' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Questions ({selectedQuestions.length})
                  </label>
                  {errors.questions && (
                    <p className="mb-2 text-sm text-red-600">{errors.questions}</p>
                  )}
                  {selectedQuestions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No questions added yet. Use the search above to add questions.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedQuestions.map((question, index) => (
                        <div
                          key={question.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-sm text-gray-900">
                                {question.title?.rendered || question.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {question.meta?._question_type} • {question.meta?._difficulty_level}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuestionFromQuiz(question.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Read-only view of questions */}
            {isReadOnly && selectedQuestions.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Questions ({selectedQuestions.length})
                </h3>
                <div className="space-y-2">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                    >
                      <span className="text-sm font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="text-sm text-gray-900">
                          {question.title?.rendered || question.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {question.meta?._question_type} • {question.meta?._difficulty_level}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {mode === 'create' && (
                <button
                  type="button"
                  onClick={handleSaveAndNew}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save & Add New
                </button>
              )}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {mode === 'create' ? 'Create Quiz' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;