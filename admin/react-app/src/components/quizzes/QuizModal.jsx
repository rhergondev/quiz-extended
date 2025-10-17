// src/components/quizzes/QuizModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Trash2, Save, GripVertical, Users, Plus } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import QuestionModal from '../questions/QuestionModal';
import { createQuestion } from '../../api/services/questionService';
import { useQuestions } from '../../hooks/useQuestions';
import Button from '../common/Button';
import PopulateRankingModal from './PopulateRankingModal';
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

// --- Sub-componentes Especializados ---

const MODAL_TITLES = {
  create: 'Create New Quiz',
  edit: 'Edit Quiz',
  view: 'View Quiz',
};

// Componente para un item de pregunta arrastrable
const SortableQuestionItem = ({ question, onRemove, isReadOnly }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
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
          <p className="text-sm font-medium text-gray-900">{question.title?.rendered || question.title}</p>
          <p className="text-xs text-gray-500">{question.meta?._question_type} • {question.meta?._difficulty_level}</p>
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

// Componente para los campos principales del formulario
const QuizFormFields = React.memo(({ formData, handleFieldChange, handleCategoryChange, errors, isReadOnly, availableCourses, availableCategories, difficultyLevels }) => (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
      <input type="text" value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)} disabled={isReadOnly} className={`w-full input ${errors.title ? 'border-red-500' : 'border-gray-300'}`} />
      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <select value={formData.qe_category[0] || ''} onChange={(e) => handleCategoryChange(e.target.value)} disabled={isReadOnly} className={`w-full input ${errors.qe_category ? 'border-red-500' : 'border-gray-300'}`}>
          <option value="">Select Category</option>
          {availableCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
      <ReactQuill theme="snow" value={formData.content} onChange={(val) => handleFieldChange('content', val)} readOnly={isReadOnly} />
    </div>
  </>
));

// Componente para la configuración del quiz
const QuizSettings = React.memo(({ formData, handleFieldChange, isReadOnly }) => (
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
));

// Componente para la gestión de preguntas (búsqueda, añadir, reordenar)
const QuizQuestionManager = React.memo(({ selectedQuestions, errors, isReadOnly, addQuestionToQuiz, removeQuestionFromQuiz, handleDragEnd, onCreateNew }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { questions: searchResults, loading: isSearching, error: searchError, fetchQuestions } = useQuestions({ autoFetch: false });
  const sensors = useSensors(useSensor(PointerSensor));

  // La función handleSearch no necesita cambios, ya previene el comportamiento por defecto.
  const handleSearch = (e) => {
    e.preventDefault(); // Buena práctica mantenerlo por si acaso.
    if (!searchQuery.trim()) return;
    fetchQuestions(true, { search: searchQuery });
  };

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Questions</h3>
      {!isReadOnly && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search & Add Questions</label>
          
          {/* --- CAMBIOS AQUÍ --- */}
          {/* 1. Cambiamos <form> por <div> */}
          <div className="flex gap-2">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }} // Opcional: buscar con Enter
              placeholder="Search questions..." 
              className="flex-1 input"
            />
            {/* 2. Cambiamos el tipo a "button" y usamos onClick */}
            <Button 
              type="button" 
              onClick={handleSearch} 
              isLoading={isSearching} 
              iconLeft={Search}
            >
              Search
            </Button>
            <Button variant="outline" onClick={onCreateNew} iconLeft={Plus}>
              Create New
            </Button>
          </div>
          {/* --- FIN DE LOS CAMBIOS --- */}

          {searchError && <p className="mt-1 text-sm text-red-600">{searchError}</p>}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto bg-white">
              {searchResults.map(q => {
                const isAdded = selectedQuestions.some(sq => sq.id === q.id);
                return (
                  <div key={q.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {q.title?.rendered || q.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{q.meta?._question_type} • {q.meta?._difficulty_level}</p>
                    </div>
                    <Button size="sm" onClick={() => addQuestionToQuiz(q)} disabled={isAdded} variant={isAdded ? 'secondary' : 'primary'}>
                      {isAdded ? 'Added' : 'Add'}
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
                {selectedQuestions.map(q => <SortableQuestionItem key={q.id} question={q} onRemove={removeQuestionFromQuiz} isReadOnly={isReadOnly} />)}
              </div>
            </SortableContext>
          </DndContext>
        ) : <p className="text-sm text-gray-500">No questions added yet.</p>}
      </div>
    </div>
  );
});


// --- Componente Principal: QuizModal ---

const INITIAL_FORM_DATA = {
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
};

const QuizModal = ({
  isOpen,
  onClose,
  quiz = null,
  onSave,
  mode = 'create',
  availableCourses = [],
  availableCategories = [],
  isLoading = false,
  // Opcional: pasar una función para hacer la llamada a la API
  // apiService,
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isPopulateModalOpen, setIsPopulateModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  
  const { questions: allQuestions } = useQuestions({ perPage: 100 });

  const difficultyLevels = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedQuestions([]);
    setErrors({});
  }, []);

  useEffect(() => {
    if (isOpen && quiz && mode !== 'create') {
      const meta = quiz.meta || {};
      const categoryValue = Array.isArray(quiz.qe_category) ? quiz.qe_category : (quiz.qe_category ? [quiz.qe_category] : []);
          
      setFormData({
        title: quiz.title?.rendered || quiz.title || '',
        content: quiz.content?.rendered || quiz.content || meta._quiz_instructions || '',
        status: quiz.status || 'publish',
        courseId: meta._course_id?.toString() || '',
        qe_category: categoryValue,
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
      
      const questionDetails = (meta._quiz_question_ids || [])
        .map(id => allQuestions.find(q => q.id === id))
        .filter(Boolean);
      setSelectedQuestions(questionDetails);
    } else if (isOpen && mode === 'create') {
      resetForm();
    }
  }, [quiz, mode, isOpen, allQuestions, resetForm]);

  const handleCreateAndAddQuestion = useCallback(async (questionData) => {
    setIsCreatingQuestion(true);
    try {
      const newQuestion = await createQuestion(questionData);
      
      addQuestionToQuiz(newQuestion);
      
      setIsQuestionModalOpen(false);
      
    } catch (error) {
      console.error("Failed to create and add question:", error);
    } finally {
      setIsCreatingQuestion(false);
    }
  }, [addQuestionToQuiz]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  }, [errors]);
  
  const handleCategoryChange = useCallback((categoryId) => {
    setFormData(prev => ({ ...prev, qe_category: [categoryId] }));
  }, []);
  
  const updateQuestionIds = (questions) => {
    const questionIds = questions.map(q => q.id);
    setFormData(prev => ({ ...prev, questionIds }));
  };

  const addQuestionToQuiz = useCallback((question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      const newSelected = [...selectedQuestions, question];
      setSelectedQuestions(newSelected);
      updateQuestionIds(newSelected);
    }
  }, [selectedQuestions]);

  const removeQuestionFromQuiz = useCallback((questionId) => {
    const newSelected = selectedQuestions.filter(q => q.id !== questionId);
    setSelectedQuestions(newSelected);
    updateQuestionIds(newSelected);
  }, [selectedQuestions]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      const newOrder = arrayMove(selectedQuestions, oldIndex, newIndex);
      setSelectedQuestions(newOrder);
      updateQuestionIds(newOrder);
    }
  }, [selectedQuestions]);

  const handleSave = useCallback(async (nextAction) => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Quiz title is required';
    if (!formData.courseId) newErrors.courseId = 'Please select a course';
    if (selectedQuestions.length === 0) newErrors.questions = 'Please add at least one question';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const quizDataForApi = {
      title: formData.title,
      content: formData.content,
      status: formData.status,
      courseId: formData.courseId,
      difficulty: formData.difficulty_level,
      quizType: formData.quiz_type,
      passingScore: formData.passing_score,
      timeLimit: formData.time_limit === '' ? 0 : parseInt(formData.time_limit, 10),
      maxAttempts: formData.max_attempts === '' ? 0 : parseInt(formData.max_attempts, 10),
      randomizeQuestions: formData.randomize_questions,
      showResults: formData.show_results,
      enableNegativeScoring: formData.enable_negative_scoring,
      questionIds: formData.questionIds,
      qe_category: formData.qe_category.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0),
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
  }, [formData, onSave, resetForm, selectedQuestions.length]);

  const handlePopulateRanking = useCallback(async (quizId, users, minScore, maxScore) => {
    // Nota: Deberías tener un servicio centralizado para llamadas API
    // en lugar de construirlo aquí. Ejemplo:
    // await apiService.populateRanking(quizId, { users, min_score, max_score });
    console.log('Populating ranking for quiz:', quizId, { users, minScore, maxScore });
    setIsPopulateModalOpen(false);
  }, []);

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const modalTitle = MODAL_TITLES[mode] || 'Quiz';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">{modalTitle}</h2>
          <div>
            {mode === 'edit' && quiz?.id && (
              <Button variant="secondary" onClick={() => setIsPopulateModalOpen(true)} iconLeft={Users} className="mr-2">
                Poblar Ranking
              </Button>
            )}
            <button onClick={onClose} disabled={isLoading} className="text-gray-500 hover:text-gray-800">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Form Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <form id="quiz-form" onSubmit={(e) => { e.preventDefault(); handleSave('close'); }} className="space-y-6">
            <QuizFormFields
              formData={formData}
              handleFieldChange={handleFieldChange}
              handleCategoryChange={handleCategoryChange}
              errors={errors}
              isReadOnly={isReadOnly}
              availableCourses={availableCourses}
              availableCategories={availableCategories}
              difficultyLevels={difficultyLevels}
            />
            <QuizSettings
              formData={formData}
              handleFieldChange={handleFieldChange}
              isReadOnly={isReadOnly}
            />
            <QuizQuestionManager
              selectedQuestions={selectedQuestions}
              errors={errors}
              isReadOnly={isReadOnly}
              addQuestionToQuiz={addQuestionToQuiz}
              removeQuestionFromQuiz={removeQuestionFromQuiz}
              handleDragEnd={handleDragEnd}
              onCreateNew={() => setIsQuestionModalOpen(true)}
            />
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
                <strong className="font-bold">Error: </strong>
                <span>{errors.submit}</span>
              </div>
            )}
          </form>
        </main>

        {/* Footer */}
        {!isReadOnly && (
          <footer className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-lg">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <div className="flex gap-2">
              {mode === 'create' && (
                <Button variant="secondary" onClick={() => handleSave('reset')} isLoading={isLoading}>Save & Add New</Button>
              )}
              <Button type="submit" form="quiz-form" isLoading={isLoading} iconLeft={Save}>
                {mode === 'create' ? 'Create Quiz' : 'Save Changes'}
              </Button>
            </div>
          </footer>
        )}
      </div>
      
      {quiz?.id && (
        <PopulateRankingModal
          isOpen={isPopulateModalOpen}
          onClose={() => setIsPopulateModalOpen(false)}
          onPopulate={handlePopulateRanking}
          quizId={quiz.id}
        />
      )}

      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSave={handleCreateAndAddQuestion}
        isLoading={isCreatingQuestion}
        mode="create"
        availableQuizzes={availableQuizzes} 
        availableCategories={availableCategories}
        initialQuizId={quiz?.id}
        initialCategoryId={formData.qe_category[0]}
      />
    </div>
  );
};

export default QuizModal;