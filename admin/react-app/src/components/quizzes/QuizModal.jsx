// src/components/quizzes/QuizModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Trash2, AlertCircle, Save, HelpCircle, GripVertical } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getApiConfig, getDefaultHeaders } from '../../api/config/apiConfig';
import { useQuestions } from '../../hooks/useQuestions'; // To get existing questions
import Button from '../common/Button';

// A simple DND setup for reordering questions
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableQuestionItem = ({ question, onRemove, isReadOnly }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-3">
                {!isReadOnly && (
                    <button type="button" {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
                        <GripVertical className="h-5 w-5" />
                    </button>
                )}
                <div>
                    <p className="text-sm text-gray-900">{question.title?.rendered || question.title}</p>
                    <p className="text-xs text-gray-500">
                        {question.meta?._question_type} • {question.meta?._difficulty_level}
                    </p>
                </div>
            </div>
            {!isReadOnly && (
                <button type="button" onClick={() => onRemove(question.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};


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
  const [formData, setFormData] = useState({
    title: '',
    content: '', // Instructions
    status: 'publish',
    courseId: '',
    qe_category: [], // Use the taxonomy name
    difficulty_level: 'medium',
    quiz_type: 'assessment',
    passing_score: '70',
    time_limit: '',
    max_attempts: '',
    randomize_questions: false,
    show_results: true,
    enable_negative_scoring: false,
    questionIds: [],
  });

  const [errors, setErrors] = useState({});
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  
  // State for question search
  const [searchQuery, setSearchQuery] = useState('');
  const { questions: searchResults, loading: isSearching, error: searchError, fetchQuestions } = useQuestions({ autoFetch: false });

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
  
  const { questions: allQuestions, loading: questionsLoading } = useQuestions({ perPage: 100 });


  // Effect to populate form on edit/view mode
  useEffect(() => {
    if (quiz && mode !== 'create') {
      const meta = quiz.meta || {};
      setFormData({
        title: quiz.title?.rendered || quiz.title || '',
        content: quiz.content?.rendered || quiz.content || meta._quiz_instructions || '',
        status: quiz.status || 'publish',
        courseId: meta._course_id?.toString() || '',
        qe_category: quiz.qe_category || [],
        difficulty_level: meta._difficulty_level || 'medium',
        quiz_type: meta._quiz_type || 'assessment',
        passing_score: meta._passing_score?.toString() || '70',
        time_limit: meta._time_limit?.toString() || '',
        max_attempts: meta._max_attempts?.toString() || '',
        randomize_questions: meta._randomize_questions || false,
        show_results: meta._show_results !== undefined ? meta._show_results : true,
        enable_negative_scoring: meta._enable_negative_scoring || false,
        questionIds: meta._quiz_question_ids || [],
      });
      
      const questionDetails = (meta._quiz_question_ids || []).map(id => 
        allQuestions.find(q => q.id === id)
      ).filter(Boolean);
      setSelectedQuestions(questionDetails);

    } else {
      resetForm();
    }
  }, [quiz, mode, isOpen, allQuestions]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      status: 'publish',
      courseId: '',
      qe_category: [],
      difficulty_level: 'medium',
      quiz_type: 'assessment',
      passing_score: '70',
      time_limit: '',
      max_attempts: '',
      randomize_questions: false,
      show_results: true,
      enable_negative_scoring: false,
      questionIds: [],
    });
    setSelectedQuestions([]);
    setSearchQuery('');
    setErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };
  
    const handleCategoryChange = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      qe_category: [categoryId] // Store as an array of IDs
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Quiz title is required';
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (selectedQuestions.length === 0) newErrors.questions = 'Please add at least one question';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearchQuestions = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchQuestions(true, { search: searchQuery }); // true to reset previous results
  };

  const addQuestionToQuiz = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      const newSelected = [...selectedQuestions, question];
      setSelectedQuestions(newSelected);
      setFormData(prev => ({
        ...prev,
        questionIds: newSelected.map(q => q.id)
      }));
      setSearchQuery(''); // Clear search after adding
    }
  };

  const removeQuestionFromQuiz = (questionId) => {
    const newSelected = selectedQuestions.filter(q => q.id !== questionId);
    setSelectedQuestions(newSelected);
    setFormData(prev => ({
      ...prev,
      questionIds: newSelected.map(q => q.id)
    }));
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      const newOrder = arrayMove(selectedQuestions, oldIndex, newIndex);
      setSelectedQuestions(newOrder);
      setFormData(prev => ({ ...prev, questionIds: newOrder.map(q => q.id) }));
    }
  };
  
  const handleSave = async (nextAction) => {
    if (!validateForm()) return;

    // This object structure matches what `transformQuizDataForApi` expects
        const quizDataForApi = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        courseId: formData.courseId,
        difficulty: formData.difficulty_level,
        quizType: formData.quiz_type,
        passingScore: formData.passing_score,
        // 🔥 SOLUCIÓN: Convertir strings vacíos a 0
        timeLimit: formData.time_limit === '' ? 0 : parseInt(formData.time_limit),
        maxAttempts: formData.max_attempts === '' ? 0 : parseInt(formData.max_attempts),
        randomizeQuestions: formData.randomize_questions,
        showResults: formData.show_results,
        enableNegativeScoring: formData.enable_negative_scoring,
        questionIds: formData.questionIds,
        qe_category: formData.qe_category,
    };

    try {
        await onSave(quizDataForApi, nextAction);
        if (nextAction === 'reset') {
            resetForm();
        }
    } catch (error) {
        console.error('Error saving quiz:', error);
        setErrors({ submit: error.message || 'Failed to save the quiz.' });
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = mode === 'create' ? 'Create New Quiz' : mode === 'edit' ? 'Edit Quiz' : 'View Quiz';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
          <button onClick={onClose} disabled={isLoading}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={(e) => { e.preventDefault(); handleSave('close'); }} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
              <input type="text" value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)} disabled={isReadOnly} className={`w-full input ${errors.title ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Course, Category, Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                <select value={formData.courseId} onChange={(e) => handleFieldChange('courseId', e.target.value)} disabled={isReadOnly} className={`w-full input ${errors.courseId ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">Select Course</option>
                  {availableCourses.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {errors.courseId && <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.qe_category[0] || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full input ${errors.qe_category ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                {errors.qe_category && <p className="mt-1 text-sm text-red-600">{errors.qe_category}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select value={formData.difficulty_level} onChange={(e) => handleFieldChange('difficulty_level', e.target.value)} disabled={isReadOnly} className="w-full input">
                  {difficultyLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <ReactQuill theme="snow" value={formData.content} onChange={(val) => handleFieldChange('content', val)} readOnly={isReadOnly} />
            </div>

            {/* Settings */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                        <input type="number" min="0" max="100" value={formData.passing_score} onChange={(e) => handleFieldChange('passing_score', e.target.value)} disabled={isReadOnly} className="w-full input"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (mins)</label>
                        <input type="number" min="0" value={formData.time_limit} onChange={(e) => handleFieldChange('time_limit', e.target.value)} disabled={isReadOnly} placeholder="Unlimited" className="w-full input"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
                        <input type="number" min="0" value={formData.max_attempts} onChange={(e) => handleFieldChange('max_attempts', e.target.value)} disabled={isReadOnly} placeholder="Unlimited" className="w-full input"/>
                    </div>
                </div>
                <div className="mt-4 space-y-3">
                    <label className="flex items-center"><input type="checkbox" checked={formData.randomize_questions} onChange={(e) => handleFieldChange('randomize_questions', e.target.checked)} disabled={isReadOnly} className="h-4 w-4 rounded"/> <span className="ml-2 text-sm">Randomize Questions</span></label>
                    <label className="flex items-center"><input type="checkbox" checked={formData.show_results} onChange={(e) => handleFieldChange('show_results', e.target.checked)} disabled={isReadOnly} className="h-4 w-4 rounded"/> <span className="ml-2 text-sm">Show Results After Completion</span></label>
                    <label className="flex items-center"><input type="checkbox" checked={formData.enable_negative_scoring} onChange={(e) => handleFieldChange('enable_negative_scoring', e.target.checked)} disabled={isReadOnly} className="h-4 w-4 rounded"/> <span className="ml-2 text-sm">Enable Negative Scoring</span></label>
                </div>
            </div>

            {/* Questions */}
            <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Questions</h3>
                {!isReadOnly && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search & Add Questions</label>
                        <div className="flex gap-2">
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search questions..." className="flex-1 input"/>
                            <Button onClick={handleSearchQuestions} isLoading={isSearching} iconLeft={Search}>Search</Button>
                        </div>
                        {searchError && <p className="mt-1 text-sm text-red-600">{searchError}</p>}
                        {searchResults.length > 0 && (
                            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto bg-white">
                                {searchResults.map(q => {
                                    const questionTitle = q.title?.rendered || q.title || 'Untitled Question';
                                    const questionType = q.meta?._question_type || 'N/A';
                                    const difficulty = q.meta?._difficulty_level || 'N/A';
                                    const isAlreadySelected = selectedQuestions.some(sq => sq.id === q.id);
                                    
                                    return (
                                        <div key={q.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50 last:border-b-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{questionTitle}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {questionType} • {difficulty}
                                                </p>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => addQuestionToQuiz(q)} 
                                                disabled={isAlreadySelected}
                                                variant={isAlreadySelected ? 'secondary' : 'primary'}
                                            >
                                                {isAlreadySelected ? 'Added' : 'Add'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selected Questions ({selectedQuestions.length})</label>
                    {errors.questions && <p className="text-sm text-red-600 mb-2">{errors.questions}</p>}
                    {selectedQuestions.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={selectedQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                    {selectedQuestions.map(q => (
                                        <SortableQuestionItem key={q.id} question={q} onRemove={removeQuestionFromQuiz} isReadOnly={isReadOnly} />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : <p className="text-sm text-gray-500">No questions added yet.</p>}
                </div>
            </div>

            {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{errors.submit}</span>
                </div>
            )}
          </div>
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <div className="flex justify-between items-center p-6 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <div className="flex gap-2">
              {mode === 'create' && <Button variant="secondary" onClick={() => handleSave('reset')} isLoading={isLoading}>Save & Add New</Button>}
              <Button type="submit" onClick={() => handleSave('close')} isLoading={isLoading} iconLeft={Save}>{mode === 'create' ? 'Create Quiz' : 'Save Changes'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizModal;