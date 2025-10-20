import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, AlertCircle, Trash2, GripVertical, Search, Plus, ArrowLeft, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

import { getOne as getQuiz } from '../../api/services/quizService';
import { useQuestions } from '../../hooks/useQuestions';

import Tabs from '../common/layout/Tabs';

// --- SUB-COMPONENTES INTERNOS ---

const SortableQuestionItem = ({ question, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
      <div className="flex items-center gap-3">
        <button type="button" {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
          <GripVertical className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-medium text-gray-900">{question.title?.rendered || question.title}</p>
        </div>
      </div>
      <button type="button" onClick={() => onRemove(question.id)} className="text-red-600 hover:text-red-800">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const QuestionManager = ({ onAddQuestion, onCreateNew, selectedQuestions }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const { questions: searchResults, loading: isSearching, error: searchError, fetchItems: fetchQuestions } = useQuestions({ autoFetch: false });

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        fetchQuestions(true, { search: searchQuery }); // `true` para resetear la búsqueda
    };

    return (
        <div className="space-y-4">
            <h4 className="font-medium text-gray-800">{t('quizzes.form.addQuestions')}</h4>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
                    placeholder={t('quizzes.form.searchPlaceholder')}
                    className="flex-1 input border-gray-300 rounded-md"
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    {isSearching ? t('common.searching') : t('common.search')}
                </button>
                <button onClick={onCreateNew} className="bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {t('common.createNew')}
                </button>
            </div>
            {searchError && <p className="text-sm text-red-600">{searchError.message}</p>}
            {searchResults.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto bg-white">
                    {searchResults.map(q => {
                        const isAdded = selectedQuestions.some(sq => sq.id === q.id);
                        return (
                            <div key={q.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{q.title?.rendered || 'Untitled'}</p>
                                <button onClick={() => onAddQuestion(q)} disabled={isAdded} className={`text-sm font-semibold py-1 px-3 rounded-full ${isAdded ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                    {isAdded ? t('common.added') : t('common.add')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const QuizEditorPanel = ({ quizId, mode, onSave, onCancel, availableCourses, availableCategories, isContextual = false }) => {
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({});
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  
  const sensors = useSensors(useSensor(PointerSensor));

  const { questions: allQuestions } = useQuestions({ perPage: 100 });
  
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      content: '',
      status: 'publish',
      courseId: '',
      qe_category: [],
      difficulty_level: 'medium',
      passing_score: '70',
      time_limit: '',
      max_attempts: '',
      randomize_questions: false,
      show_results: true,
      enable_negative_scoring: false,
      questionIds: [],
    });
    setSelectedQuestions([]);
  }, []);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (quizId && (mode === 'edit' || mode === 'view')) {
        setIsLoading(true);
        setError(null);
        try {
          const quizData = await getQuiz(quizId);
          const meta = quizData.meta || {};
          setFormData({
            title: quizData.title?.rendered || '',
            content: quizData.content?.rendered || meta._quiz_instructions || '',
            status: quizData.status || 'publish',
            courseId: meta._course_id?.toString() || '',
            qe_category: Array.isArray(quizData.qe_category) ? quizData.qe_category.map(String) : [],
            difficulty_level: meta._difficulty_level || 'medium',
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
        } catch (err) {
          setError(t('errors.fetchQuiz'));
        } finally {
          setIsLoading(false);
        }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchQuizData();
  }, [quizId, mode, t, allQuestions, resetForm]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addQuestionToQuiz = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      const newSelected = [...selectedQuestions, question];
      setSelectedQuestions(newSelected);
      handleFieldChange('questionIds', newSelected.map(q => q.id));
    }
  };

  const removeQuestionFromQuiz = (questionId) => {
    const newSelected = selectedQuestions.filter(q => q.id !== questionId);
    setSelectedQuestions(newSelected);
    handleFieldChange('questionIds', newSelected.map(q => q.id));
  };
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      const newOrder = arrayMove(selectedQuestions, oldIndex, newIndex);
      setSelectedQuestions(newOrder);
      handleFieldChange('questionIds', newOrder.map(q => q.id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const quizDataForApi = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        meta: {
          _course_id: formData.courseId,
          _difficulty_level: formData.difficulty_level,
          _passing_score: formData.passing_score,
          _time_limit: formData.time_limit === '' ? 0 : parseInt(formData.time_limit, 10),
          _max_attempts: formData.max_attempts === '' ? 0 : parseInt(formData.max_attempts, 10),
          _randomize_questions: formData.randomize_questions,
          _show_results: formData.show_results,
          _enable_negative_scoring: formData.enable_negative_scoring,
          _quiz_question_ids: formData.questionIds,
        },
        qe_category: formData.qe_category.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0),
      };
      await onSave(quizDataForApi);
    } catch (err) {
      setError(err.message || t('errors.saveQuiz'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }
  
  const difficultyLevels = [
    { value: 'easy', label: t('common.easy') },
    { value: 'medium', label: t('common.medium') },
    { value: 'hard', label: t('common.hard') }
  ];

  const settingsTabContent = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.title')}</label>
        <input type="text" value={formData.title || ''} onChange={(e) => handleFieldChange('title', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.course')}</label>
          <select value={formData.courseId || ''} onChange={(e) => handleFieldChange('courseId', e.target.value)} className="w-full input border-gray-300 rounded-md">
            <option value="">{t('common.select')}</option>
            {availableCourses.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.category')}</label>
          <select value={formData.qe_category?.[0] || ''} onChange={(e) => handleFieldChange('qe_category', [e.target.value])} className="w-full input border-gray-300 rounded-md">
            <option value="">{t('common.select')}</option>
            {availableCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.difficulty')}</label>
          <select value={formData.difficulty_level || 'medium'} onChange={(e) => handleFieldChange('difficulty_level', e.target.value)} className="w-full input border-gray-300 rounded-md">
            {difficultyLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.instructions')}</label>
        <ReactQuill theme="snow" value={formData.content || ''} onChange={(val) => handleFieldChange('content', val)} />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.settings')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.passingScore')}</label>
            <input type="number" min="0" max="100" value={formData.passing_score || ''} onChange={(e) => handleFieldChange('passing_score', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.timeLimit')}</label>
            <input type="number" min="0" value={formData.time_limit || ''} onChange={(e) => handleFieldChange('time_limit', e.target.value)} placeholder={t('common.unlimited')} className="w-full input border-gray-300 rounded-md"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('quizzes.form.maxAttempts')}</label>
            <input type="number" min="0" value={formData.max_attempts || ''} onChange={(e) => handleFieldChange('max_attempts', e.target.value)} placeholder={t('common.unlimited')} className="w-full input border-gray-300 rounded-md"/>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <label className="flex items-center">
            <input type="checkbox" checked={formData.randomize_questions || false} onChange={(e) => handleFieldChange('randomize_questions', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/> 
            <span className="ml-2 text-sm text-gray-600">{t('quizzes.form.randomize')}</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={formData.show_results || false} onChange={(e) => handleFieldChange('show_results', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/> 
            <span className="ml-2 text-sm text-gray-600">{t('quizzes.form.showResults')}</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={formData.enable_negative_scoring || false} onChange={(e) => handleFieldChange('enable_negative_scoring', e.target.checked)} className="h-4 w-4 rounded border-gray-300"/> 
            <span className="ml-2 text-sm text-gray-600">{t('quizzes.form.negativeScoring')}</span>
          </label>
        </div>
      </div>
    </div>
  );

  const questionsTabContent = (
    <div className="space-y-6">
        <QuestionManager
            onAddQuestion={addQuestionToQuiz}
            onCreateNew={() => alert('Próximamente: Crear nueva pregunta desde aquí.')}
            selectedQuestions={selectedQuestions}
        />
        <div>
            <h4 className="font-medium text-gray-800 mb-2">{t('quizzes.form.selectedQuestions')} ({selectedQuestions.length})</h4>
            {selectedQuestions.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {selectedQuestions.map(q => <SortableQuestionItem key={q.id} question={q} onRemove={removeQuestionFromQuiz} />)}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : <p className="text-sm text-gray-500 p-4 border rounded-md text-center bg-gray-50">{t('quizzes.form.noQuestions')}</p>}
        </div>
    </div>
  );

  const tabs = [
    { name: t('common.settings'), content: settingsTabContent },
    { name: t('common.questions'), content: questionsTabContent },
  ];
  
  const panelTitle = mode === 'create' ? t('quizzes.createNew') : t('quizzes.editTitle', { title: formData.title || '...' });

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-800 truncate pr-4">{panelTitle}</h3>
        <div className="flex items-center gap-4">
            {isContextual && (
                <button onClick={onCancel} className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>
            )}
          <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4"/>
            {isSaving ? t('common.saving') : t('common.save')}
          </button>
           {!isContextual && (
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-800">
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-4">{error}</p>}
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>
    </div>
  );
};

export default QuizEditorPanel;