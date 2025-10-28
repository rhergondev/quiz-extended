import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { openMediaSelector } from '../../api/utils/mediaUtils';

import { getOne as getQuestion } from '../../api/services/questionService';
import { createTaxonomyTerm } from '../../api/services/taxonomyService';
import QEButton from '../common/QEButton';
import Button from '../common/Button';
import QuizSelector from './QuizSelector';
import { SortableOption } from './SortableOption';

const getQuestionTitle = (question) => question?.title?.rendered || question?.title || 'Pregunta sin título';

const QuestionEditorPanel = ({
  questionId,
  mode,
  onSave,
  onCancel,
  categoryOptions,
  providerOptions,
  onCategoryCreated,
  onProviderCreated,
  availableQuizzes,
  availableLessons,
  availableCourses
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const quillRef = useRef(null);
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [showNewProviderForm, setShowNewProviderForm] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [creatingProvider, setCreatingProvider] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const resetForm = useCallback(() => {
    setFormData({
        title: '',
        status: 'publish',
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
        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    });
  }, []);

  useEffect(() => {
    const fetchQuestionData = async () => {
      if (questionId && mode === 'edit') {
        setIsLoading(true);
        try {
          const data = await getQuestion(questionId);
          
          // Extraer HTML limpio del contenido
          const contentHTML = data.content?.rendered || data.meta?._explanation || '';
          
          setFormData({
              title: getQuestionTitle(data),
              status: data.status || 'publish',
              type: data.meta?._question_type || 'multiple_choice',
              difficulty: data.meta?._difficulty_level || 'medium',
              points: data.meta?._points?.toString() || '1',
              pointsIncorrect: data.meta?._points_incorrect?.toString() || '0',
              explanation: contentHTML,
              options: data.meta?._question_options || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
              quizIds: data.meta?._quiz_ids || [],
              lessonId: data.meta?._question_lesson?.toString() || '',
              courseId: data.meta?._course_id?.toString() || '',
              category: data.qe_category?.[0]?.toString() || '',
              provider: data.qe_provider?.[0]?.toString() || '',
          });
        } catch (err) { setError('Failed to load question data.'); }
        finally { setIsLoading(false); }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchQuestionData();
  }, [questionId, mode, resetForm]);
  
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (newType) => {
    let newOptions = [...(formData.options || [])];
    if (newType === 'true_false') {
      newOptions = [
        { text: 'Verdadero', isCorrect: formData.options?.some(o => o.isCorrect && o.text.toLowerCase().includes('verdadero')) || false },
        { text: 'Falso', isCorrect: formData.options?.some(o => o.isCorrect && o.text.toLowerCase().includes('falso')) || false }
      ];
    }
    setFormData(prev => ({ ...prev, type: newType, options: newOptions }));
  };

  const handleOptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [field]: value } : opt)
    }));
  };
  
  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
  };

  const removeOption = (index) => {
    if (formData.options.length > 1) {
      setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
    }
  };

  const setCorrectAnswer = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => ({
        ...opt,
        isCorrect: prev.type === 'multiple_choice' ? (i === index ? !opt.isCorrect : opt.isCorrect) : (i === index)
      }))
    }));
  };
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        const oldIndex = formData.options.findIndex((_, i) => i === active.id);
        const newIndex = formData.options.findIndex((_, i) => i === over.id);
        setFormData(prev => ({ ...prev, options: arrayMove(prev.options, oldIndex, newIndex)}));
    }
  };

  const createNewTaxonomy = async (taxonomy, name, onCreated, setCreating, setName, setShowForm, setField) => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const newTerm = await createTaxonomyTerm(taxonomy, { name: name.trim() });
      if (onCreated) onCreated();
      setField(newTerm.id.toString());
      setName('');
      setShowForm(false);
    } catch (error) {
      if (error.response?.data?.code === 'term_exists' && error.response.data.data.term_id) {
          setField(error.response.data.data.term_id.toString());
          setName('');
          setShowForm(false);
      } else {
        console.error(`Error creating ${taxonomy}:`, error);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Calcular puntos incorrectos automáticamente basado en el número de opciones incorrectas
      let calculatedPointsIncorrect = 0;
      if (formData.type === 'multiple_choice' || formData.type === 'true_false') {
        const incorrectOptionsCount = formData.options.filter(opt => !opt.isCorrect).length;
        if (incorrectOptionsCount > 0) {
          // Si siempre se da 1 punto por correcta, entonces se penaliza proporcionalmente
          calculatedPointsIncorrect = Number((1 / incorrectOptionsCount).toFixed(4));
        }
      }
      
      // Construir el objeto similar al QuestionModal
      const dataToSave = {
        title: formData.title,
        status: formData.status,
        content: formData.explanation,
        type: formData.type,
        difficulty: formData.difficulty,
        points: '1', // Siempre 1 punto por defecto
        pointsIncorrect: calculatedPointsIncorrect.toString(), // Calculado automáticamente
        quizIds: formData.quizIds,
        lessonId: formData.lessonId,
        courseId: formData.courseId,
        options: formData.options,
        explanation: formData.explanation,
        // Taxonomías como arrays de IDs
        qe_category: formData.category ? [parseInt(formData.category)] : [],
        qe_provider: formData.provider ? [parseInt(formData.provider)] : [],
        // Meta con los campos necesarios
        meta: {
          _question_type: formData.type,
          _difficulty_level: formData.difficulty,
          _points: 1, // Siempre 1
          _points_incorrect: calculatedPointsIncorrect, // Calculado
          _question_options: formData.options,
          _quiz_ids: formData.quizIds,
          _question_lesson: formData.lessonId ? parseInt(formData.lessonId) : 0,
          _course_id: formData.courseId ? parseInt(formData.courseId) : 0,
          _explanation: formData.explanation,
        }
      };
      
      await onSave(dataToSave);
      if (mode === 'create') {
        onCancel();
      }
    } catch(err) { 
      console.error('Error saving question:', err);
      setError(err.message || 'Error al guardar la pregunta'); 
    }
    finally { setIsSaving(false); }
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
    } catch (error) { console.error("Error al abrir selector de medios:", error); }
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline'],
        [{'list': 'ordered'}, {'list': 'bullet'}], ['link', 'image'], ['clean']
      ],
      handlers: { 'image': imageHandler },
    },
  }), [imageHandler]);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Opción Múltiple' },
    { value: 'true_false', label: 'Verdadero / Falso' },
    { value: 'fill_in_the_blanks', label: 'Rellenar Huecos' },
    { value: 'short_answer', label: 'Respuesta Corta' },
    { value: 'essay', label: 'Ensayo' },
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Medio' },
    { value: 'hard', label: 'Difícil' }
  ];

  if (isLoading) return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;

  const panelTitle = mode === 'create' ? t('questions.createQuestion') : t('questions.editQuestion');
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div>
            <h3 className="text-lg font-bold text-gray-800">{panelTitle}</h3>
             {mode === 'edit' && <p className="text-xs font-normal text-gray-500">{getQuestionTitle(formData)}</p>}
        </div>
        <div className="flex items-center gap-4">
            <QEButton onClick={handleSave} disabled={isSaving} variant="primary" className="font-semibold py-2 px-4 rounded-lg text-sm">
              {isSaving ? t('common.saving') : t('common.save')}
            </QEButton>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-800">
              <X className="h-5 w-5" />
            </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <input 
          type="text" 
          value={formData.title || ''} 
          onChange={(e) => handleFieldChange('title', e.target.value)} 
          placeholder={t('questions.fields.title')}
          className="w-full text-xl font-bold focus:outline-none bg-transparent border-b pb-2"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('questions.fields.category')}</label>
                {!showNewCategoryForm && ( <button onClick={() => setShowNewCategoryForm(true)} type="button" className="text-sm text-blue-600 hover:text-blue-700"><Plus className="h-4 w-4 inline-block"/></button> )}
              </div>
              {showNewCategoryForm && (
                <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                  <div className="flex items-center gap-2">
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva..." className="flex-1 w-full px-2 py-1 border-gray-300 rounded-md text-sm"/>
                    <Button size="xs" onClick={() => createNewTaxonomy('qe_category', newCategoryName, onCategoryCreated, setCreatingCategory, setNewCategoryName, setShowNewCategoryForm, (val) => handleFieldChange('category', val))} isLoading={creatingCategory}>OK</Button>
                    <Button size="xs" variant="secondary" onClick={() => setShowNewCategoryForm(false)}>X</Button>
                  </div>
                </div>
              )}
              <select value={formData.category || ''} onChange={(e) => handleFieldChange('category', e.target.value)} className="w-full input border-gray-300 rounded-md">
                  <option value="">{t('common.select')}</option>
                  {(categoryOptions || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">{t('questions.fields.provider')}</label>
                {!showNewProviderForm && ( <button onClick={() => setShowNewProviderForm(true)} type="button" className="text-sm text-blue-600 hover:text-blue-700"><Plus className="h-4 w-4 inline-block"/></button> )}
              </div>
              {showNewProviderForm && (
                <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                  <div className="flex items-center gap-2">
                    <input type="text" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)} placeholder="Nuevo..." className="flex-1 w-full px-2 py-1 border-gray-300 rounded-md text-sm"/>
                    <Button size="xs" onClick={() => createNewTaxonomy('qe_provider', newProviderName, onProviderCreated, setCreatingProvider, setNewProviderName, setShowNewProviderForm, (val) => handleFieldChange('provider', val))} isLoading={creatingProvider}>OK</Button>
                    <Button size="xs" variant="secondary" onClick={() => setShowNewProviderForm(false)}>X</Button>
                  </div>
                </div>
              )}
              <select value={formData.provider || ''} onChange={(e) => handleFieldChange('provider', e.target.value)} className="w-full input border-gray-300 rounded-md">
                  <option value="">{t('common.select')}</option>
                  {(providerOptions || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('questions.fields.difficulty')}</label>
                <select value={formData.difficulty || 'medium'} onChange={(e) => handleFieldChange('difficulty', e.target.value)} className="w-full input border-gray-300 rounded-md">
                    {difficultyLevels.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Curso</label>
                <select value={formData.courseId || ''} onChange={(e) => handleFieldChange('courseId', e.target.value)} className="w-full input border-gray-300 rounded-md">
                    <option value="">Sin curso asignado</option>
                    {(availableCourses || []).map(course => ( <option key={course.id} value={course.id}>{course.title?.rendered || course.title}</option> ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Lección</label>
                <select value={formData.lessonId || ''} onChange={(e) => handleFieldChange('lessonId', e.target.value)} className="w-full input border-gray-300 rounded-md">
                    <option value="">Pregunta General</option>
                    {(availableLessons || []).map(lesson => ( <option key={lesson.id} value={lesson.id}>{lesson.title?.rendered || lesson.title}</option> ))}
                </select>
            </div>
        </div>
        
        {['multiple_choice', 'true_false'].includes(formData.type) && (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Respuestas *</label>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={formData.options?.map((_, i) => i) || []} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                        {(formData.options || []).map((option, index) => (
                            <SortableOption
                                key={index}
                                id={index}
                                option={option}
                                index={index}
                                isMultipleChoice={formData.type === 'multiple_choice'}
                                handleOptionChange={handleOptionChange}
                                setCorrectAnswer={setCorrectAnswer}
                                removeOption={removeOption}
                            />
                        ))}
                        </div>
                    </SortableContext>
                </DndContext>
                {formData.type === 'multiple_choice' && (
                  <Button variant="secondary" size="sm" onClick={addOption} className="mt-3" iconLeft={Plus}>Añadir Opción</Button>
                )}
            </div>
        )}
        
        <QuizSelector
            availableQuizzes={availableQuizzes}
            selectedQuizIds={formData.quizIds || []}
            onChange={(ids) => handleFieldChange('quizIds', ids)}
        />
       
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('questions.fields.explanation')}</label>
            <ReactQuill ref={quillRef} theme="snow" value={formData.explanation || ''} onChange={(val) => handleFieldChange('explanation', val)} modules={quillModules} />
        </div>
      </main>
    </div>
  );
};

export default QuestionEditorPanel;