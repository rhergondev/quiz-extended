import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import { useTheme } from '../../contexts/ThemeContext';

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
  availableCourses,
  simpleMode = false // When true, only shows title, answers and explanation
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  };

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
          // 🔥 FIX: Usar context=view para obtener content.rendered (context=edit lo devuelve vacío)
          const data = await getQuestion(questionId, { context: 'view' });
          
          // Extraer HTML del contenido (prioridad: content.rendered)
          let contentHTML = '';
          if (data.content?.rendered) {
            contentHTML = data.content.rendered.trim();
          } else if (typeof data.content === 'string') {
            contentHTML = data.content.trim();
          }
          
          console.log('📝 Question Data:', {
            id: data.id,
            contentRendered: data.content?.rendered,
            contentType: typeof data.content,
            finalContentHTML: contentHTML,
            htmlLength: contentHTML.length
          });
          
          const newFormData = {
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
          };
          
          console.log('🔄 Setting formData with explanation:', {
            explanation: newFormData.explanation,
            explanationLength: newFormData.explanation?.length || 0
          });
          
          setFormData(newFormData);
        } catch (err) { 
          console.error('Error loading question:', err);
          setError('Failed to load question data.'); 
        }
        finally { setIsLoading(false); }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchQuestionData();
  }, [questionId, mode, resetForm]);
  
  // 🔥 FIX: Sincronizar ReactQuill cuando cambia formData.explanation solo si hay contenido real
  useEffect(() => {
    // Solo actualizar si hay contenido Y el editor está listo
    if (!quillRef.current || !formData.explanation || formData.explanation.length === 0) {
      return;
    }
    
    const editor = quillRef.current.getEditor();
    const currentContent = editor.root.innerHTML;
    
    // Solo actualizar si el contenido es realmente diferente y hay algo que poner
    if (currentContent !== formData.explanation && formData.explanation.trim() !== '') {
      console.log('🔄 Updating Quill content:', {
        from: currentContent.substring(0, 50),
        to: formData.explanation.substring(0, 50)
      });
      editor.clipboard.dangerouslyPasteHTML(formData.explanation);
    }
  }, [formData.explanation]);
  
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
      
      console.log('💾 Saving question with explanation:', {
        explanationLength: formData.explanation?.length || 0,
        explanationPreview: formData.explanation?.substring(0, 100) || 'EMPTY',
      });
      
      // Construir el objeto similar al QuestionModal
      // 🔥 CAMBIO: Construir meta sin incluir IDs inválidos
      const meta = {
        _question_type: formData.type,
        _difficulty_level: formData.difficulty,
        _points: 1, // Siempre 1
        _points_incorrect: calculatedPointsIncorrect, // Calculado
        _question_options: formData.options,
        _quiz_ids: formData.quizIds,
        _explanation: formData.explanation,
      };
      
      // Solo incluir _question_lesson si tiene un valor válido
      if (formData.lessonId && formData.lessonId !== '' && formData.lessonId !== '0') {
        meta._question_lesson = parseInt(formData.lessonId);
      }
      
      // Solo incluir _course_id si tiene un valor válido
      if (formData.courseId && formData.courseId !== '' && formData.courseId !== '0') {
        meta._course_id = parseInt(formData.courseId);
      }
      
      const dataToSave = {
        title: formData.title,
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
        meta
      };
      
      console.log('💾 Data being saved:', dataToSave);
      
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
    <div 
      className="rounded-2xl flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: pageColors.bgCard,
        border: `1px solid ${pageColors.cardBorder}`,
        boxShadow: pageColors.shadow,
      }}
    >
      <header 
        className="p-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}
      >
        <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: pageColors.text }}>{panelTitle}</h3>
             {mode === 'edit' && <p className="text-sm font-normal mt-0.5" style={{ color: pageColors.textMuted }}>{getQuestionTitle(formData)}</p>}
        </div>
        <div className="flex items-center gap-4">
            <button 
              onClick={onCancel} 
              className="p-2 rounded-xl transition-all duration-200"
              style={{ 
                color: pageColors.textMuted,
                backgroundColor: pageColors.hoverBg
              }}
            >
              <X className="h-5 w-5" />
            </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
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
          className="w-full text-xl font-bold focus:outline-none border-b pb-3"
          style={{
            backgroundColor: 'transparent',
            borderColor: pageColors.cardBorder,
            color: pageColors.text
          }}
        />

        {/* Category, Provider and Difficulty selectors - hidden in simpleMode */}
        {!simpleMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: pageColors.text }}>{t('questions.fields.category')}</label>
                  {!showNewCategoryForm && ( <button onClick={() => setShowNewCategoryForm(true)} type="button" className="text-sm" style={{ color: pageColors.accent }}><Plus className="h-4 w-4 inline-block"/></button> )}
                </div>
                {showNewCategoryForm && (
                  <div className="mb-2 p-2 border rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border }}>
                    <div className="flex items-center gap-2">
                      <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva..." className="flex-1 w-full px-2 py-1 rounded-md text-sm" style={{ backgroundColor: pageColors.bgCard, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}/>
                      <Button size="xs" onClick={() => createNewTaxonomy('qe_category', newCategoryName, onCategoryCreated, setCreatingCategory, setNewCategoryName, setShowNewCategoryForm, (val) => handleFieldChange('category', val))} isLoading={creatingCategory}>OK</Button>
                      <Button size="xs" variant="secondary" onClick={() => setShowNewCategoryForm(false)}>X</Button>
                    </div>
                  </div>
                )}
                <select value={formData.category || ''} onChange={(e) => handleFieldChange('category', e.target.value)} className="w-full input rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}>
                    <option value="">{t('common.select')}</option>
                    {(categoryOptions || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: pageColors.text }}>{t('questions.fields.provider')}</label>
                  {!showNewProviderForm && ( <button onClick={() => setShowNewProviderForm(true)} type="button" className="text-sm" style={{ color: pageColors.accent }}><Plus className="h-4 w-4 inline-block"/></button> )}
                </div>
                {showNewProviderForm && (
                  <div className="mb-2 p-2 border rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border }}>
                    <div className="flex items-center gap-2">
                      <input type="text" value={newProviderName} onChange={(e) => setNewProviderName(e.target.value)} placeholder="Nuevo..." className="flex-1 w-full px-2 py-1 rounded-md text-sm" style={{ backgroundColor: pageColors.bgCard, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}/>
                      <Button size="xs" onClick={() => createNewTaxonomy('qe_provider', newProviderName, onProviderCreated, setCreatingProvider, setNewProviderName, setShowNewProviderForm, (val) => handleFieldChange('provider', val))} isLoading={creatingProvider}>OK</Button>
                      <Button size="xs" variant="secondary" onClick={() => setShowNewProviderForm(false)}>X</Button>
                    </div>
                  </div>
                )}
                <select value={formData.provider || ''} onChange={(e) => handleFieldChange('provider', e.target.value)} className="w-full input rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}>
                    <option value="">{t('common.select')}</option>
                    {(providerOptions || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>{t('questions.fields.difficulty')}</label>
                  <select value={formData.difficulty || 'medium'} onChange={(e) => handleFieldChange('difficulty', e.target.value)} className="w-full input rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}>
                      {difficultyLevels.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
              </div>
          </div>
        )}
        
        {/* Course and Lesson assignment - hidden in simpleMode */}
        {!simpleMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>Asignar a Curso</label>
                  <select value={formData.courseId || ''} onChange={(e) => handleFieldChange('courseId', e.target.value)} className="w-full input rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}>
                      <option value="">Sin curso asignado</option>
                      {(availableCourses || []).map(course => ( <option key={course.id} value={course.id}>{course.title?.rendered || course.title}</option> ))}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>Asignar a Lección</label>
                  <select value={formData.lessonId || ''} onChange={(e) => handleFieldChange('lessonId', e.target.value)} className="w-full input rounded-md" style={{ backgroundColor: pageColors.inputBg, borderColor: pageColors.border, border: `1px solid ${pageColors.border}`, color: pageColors.text }}>
                      <option value="">Pregunta General</option>
                      {(availableLessons || []).map(lesson => ( <option key={lesson.id} value={lesson.id}>{lesson.title?.rendered || lesson.title}</option> ))}
                  </select>
              </div>
          </div>
        )}
        
        {['multiple_choice', 'true_false'].includes(formData.type) && (
             <div>
                <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>Respuestas *</label>
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
        
        {/* Quiz selector - hidden in simpleMode */}
        {!simpleMode && (
          <QuizSelector
              availableQuizzes={availableQuizzes}
              selectedQuizIds={formData.quizIds || []}
              onChange={(ids) => handleFieldChange('quizIds', ids)}
          />
        )}
       
        <div className="qe-quill-wrapper">
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>{t('questions.fields.explanation')}</label>
            <ReactQuill 
              key={`quill-${questionId || 'new'}-${mode}`} 
              ref={quillRef} 
              theme="snow" 
              value={formData.explanation || ''} 
              onChange={(val) => handleFieldChange('explanation', val)} 
              modules={quillModules}
              style={{ minHeight: '200px' }}
            />
        </div>
      </main>
      
      {/* Footer con botón de guardar */}
      <footer 
        className="p-4 flex justify-end flex-shrink-0"
        style={{ borderTop: `1px solid ${pageColors.cardBorder}`, backgroundColor: pageColors.bgCard }}
      >
        <QEButton onClick={handleSave} disabled={isSaving} variant="primary" className="font-semibold py-2.5 px-6 rounded-xl text-sm">
          {isSaving ? t('common.saving') : t('common.save')}
        </QEButton>
      </footer>
    </div>
  );
};

export default QuestionEditorPanel;