// src/components/lessons/LessonModal.jsx (Modificado para incluir subida de PDFs)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import {
  X, Plus, Trash2, GripVertical, Video, FileText, Download,
  HelpCircle, FileImage, Volume2, Save, AlertCircle, ChevronDown, ChevronUp, UploadCloud, CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuizSingleSelector from '../common/QuizSingleSelector';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


// ... (El resto del componente LessonModal se mantiene igual hasta SortableStepItem)
const LessonModal = ({
  isOpen,
  onClose,
  lesson = null,
  onSave,
  mode = 'create',
  availableCourses = [],
  isLoading = false
}) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    courseId: '',
    description: '',
    lessonOrder: '1',
    completionCriteria: 'view_all',
    steps: []
  });

  const [errors, setErrors] = useState({});
  const [showStepCreator, setShowStepCreator] = useState(false);
  const [newStep, setNewStep] = useState({ type: 'text', title: '', data: {} });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (lesson && mode !== 'create') {
      setFormData({
        title: lesson.title?.rendered || lesson.title || '',
        content: lesson.content?.rendered || lesson.content || '',
        courseId: lesson.meta?._course_id?.toString() || '',
        description: lesson.meta?._lesson_description || '',
        lessonOrder: lesson.meta?._lesson_order?.toString() || '1',
        completionCriteria: lesson.meta?._completion_criteria || 'view_all',
        steps: lesson.meta?._lesson_steps || []
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        content: '',
        courseId: '',
        description: '',
        lessonOrder: '1',
        completionCriteria: 'view_all',
        steps: []
      });
    }
  }, [lesson, mode]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t('lessons.validation.titleRequired');
    if (!formData.courseId) newErrors.courseId = t('lessons.validation.courseRequired');
    if (formData.steps.length === 0) newErrors.steps = t('lessons.validation.stepsRequired');
    const invalidSteps = formData.steps.filter(step => !step.title?.trim());
    if (invalidSteps.length > 0) newErrors.steps = t('lessons.validation.allStepsMustHaveTitle');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSave = async (nextAction = 'close') => {
    if (!validateForm()) return;
    try {
      const lessonDataForApi = {
        title: formData.title,
        content: formData.content,
        status: 'publish', // Siempre se publica
        courseId: parseInt(formData.courseId),
        description: formData.description,
        lessonOrder: parseInt(formData.lessonOrder),
        completionCriteria: formData.completionCriteria,
        steps: formData.steps.map(({ id, ...restOfStep }) => restOfStep)
      };
      await onSave(lessonDataForApi, nextAction);
      if (nextAction === 'reset') {
        setFormData({
            title: '',
            content: '',
            courseId: '',
            description: '',
            lessonOrder: '1',
            completionCriteria: 'view_all',
            steps: []
        });
        setErrors({});
      }
    } catch (error) {
      setErrors({ submit: error.message || t('lessons.messages.createError') });
    }
  };

  const generateStepId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addStep = (stepData) => {
    const newStepWithId = { ...stepData, id: generateStepId(), order: formData.steps.length + 1 };
    setFormData(prev => ({ ...prev, steps: [...prev.steps, newStepWithId] }));
    setShowStepCreator(false);
    setNewStep({ type: 'text', title: '', data: {} });
  };

  const removeStep = (stepId) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId).map((step, index) => ({ ...step, order: index + 1 }))
    }));
  };

  const updateStep = (stepId, updates) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step => step.id === stepId ? { ...step, ...updates } : step)
    }));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = formData.steps.findIndex(step => step.id === active.id);
      const newIndex = formData.steps.findIndex(step => step.id === over.id);
      const newSteps = arrayMove(formData.steps, oldIndex, newIndex);
      const updatedSteps = newSteps.map((step, index) => ({ ...step, order: index + 1 }));
      setFormData(prev => ({ ...prev, steps: updatedSteps }));
    }
  };

  const stepTypes = {
    video: { label: t('lessons.stepTypes.video.label'), icon: Video, color: 'text-blue-600 bg-blue-50' },
    text: { label: t('lessons.stepTypes.text.label'), icon: FileText, color: 'text-green-600 bg-green-50' },
    pdf: { label: t('lessons.stepTypes.pdf.label'), icon: Download, color: 'text-red-600 bg-red-50' },
    quiz: { label: t('lessons.stepTypes.quiz.label'), icon: HelpCircle, color: 'text-purple-600 bg-purple-50' },
    image: { label: t('lessons.stepTypes.image.label'), icon: FileImage, color: 'text-orange-600 bg-orange-50' },
    audio: { label: t('lessons.stepTypes.audio.label'), icon: Volume2, color: 'text-indigo-600 bg-indigo-50' }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const modalTitle = isCreateMode ? t('lessons.createLesson') : mode === 'edit' ? t('lessons.editLesson') : t('lessons.viewLesson');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{modalTitle}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content (ahora con overflow aquí) */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto space-y-8">
            {/* --- SECCIÓN DE INFORMACIÓN BÁSICA --- */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.fields.title')} *</label>
                <input type="text" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`} placeholder={t('lessons.placeholders.title')} disabled={isViewMode} />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.fields.course')} *</label>
                <select value={formData.courseId} onChange={(e) => handleInputChange('courseId', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${errors.courseId ? 'border-red-500' : 'border-gray-300'}`} disabled={isViewMode}>
                  <option value="">{t('lessons.course.select')}</option>
                  {availableCourses.map(course => <option key={course.value} value={course.value}>{course.label}</option>)}
                </select>
                {errors.courseId && <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.fields.description')}</label>
                <textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder={t('lessons.placeholders.description')} disabled={isViewMode} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.fields.lessonOrder')}</label>
                  <input type="number" min="1" value={formData.lessonOrder} onChange={(e) => handleInputChange('lessonOrder', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isViewMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.completionCriteria.label')}</label>
                  <select value={formData.completionCriteria} onChange={(e) => handleInputChange('completionCriteria', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isViewMode}>
                    <option value="view_all">{t('lessons.completionCriteria.viewAll')}</option>
                    <option value="pass_quiz">{t('lessons.completionCriteria.passQuiz')}</option>
                    <option value="complete_steps">{t('lessons.completionCriteria.completeSteps')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* --- SECCIÓN DE PASOS DE CONTENIDO --- */}
            <div className="space-y-6 pt-8 border-t border-gray-200">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{t('lessons.steps.title')} *</h4>
                    <p className="text-sm text-gray-500">{t('lessons.steps.description')}</p>
                  </div>
                  {!isViewMode && (
                    <button type="button" onClick={() => setShowStepCreator(true)} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                      <Plus className="h-4 w-4 mr-2" /> {t('lessons.steps.addStep')}
                    </button>
                  )}
                </div>

                {errors.steps && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">{errors.steps}</p>
                  </div>
                )}
                
                {formData.steps.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={formData.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {formData.steps.map((step) => <SortableStepItem key={step.id} step={step} onUpdate={updateStep} onRemove={removeStep} isViewMode={isViewMode} stepTypes={stepTypes} t={t} />)}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                     <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t('lessons.steps.noSteps')}</h3>
                    {!isViewMode && (
                      <div className="mt-6">
                        <button type="button" onClick={() => setShowStepCreator(true)} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                          <Plus className="h-4 w-4 mr-2" /> {t('lessons.steps.addFirstStep')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" disabled={isLoading}>{t('common.cancel')}</button>
              <div className="flex space-x-3">
                {isCreateMode && <button type="button" onClick={() => handleSave('reset')} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 disabled:opacity-50">{t('courses.actions.saveAndCreate')}</button>}
                <button type="button" onClick={() => handleSave('close')} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                  <Save className="h-4 w-4 mr-2" />{t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStepCreator && <StepCreatorModal isOpen={showStepCreator} onClose={() => { setShowStepCreator(false); setNewStep({ type: 'text', title: '', data: {} }); }} onSave={addStep} stepTypes={stepTypes} newStep={newStep} setNewStep={setNewStep} t={t} />}
    </div>
  );
};



const SortableStepItem = ({ step, onUpdate, onRemove, isViewMode, stepTypes, t }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = stepTypes[step.type]?.icon || FileText;
  const config = stepTypes[step.type] || stepTypes.text;
  const style = { transform: CSS.Transform.toString(transform), transition };

  const quillRef = useRef(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
          // Muestra un placeholder o mensaje de carga
          const quillEditor = quillRef.current.getEditor();
          const range = quillEditor.getSelection(true);
          quillEditor.insertText(range.index, "\n[Subiendo imagen...]\n");

          // Sube la imagen usando el servicio existente
          const uploadedMedia = await uploadMedia(file);

          // Elimina el placeholder
          quillEditor.deleteText(range.index, "\n[Subiendo imagen...]\n".length);
          
          // Inserta la imagen en el editor
          quillEditor.insertEmbed(range.index, 'image', uploadedMedia.url);
          quillEditor.setSelection(range.index + 1);

        } catch (error) {
          console.error('Error al subir la imagen:', error);
          alert('No se pudo subir la imagen. Por favor, inténtalo de nuevo.');
          // Considera eliminar el placeholder si la subida falla
          const quillEditor = quillRef.current.getEditor();
          const range = quillEditor.getSelection(true);
          quillEditor.deleteText(range.index, "\n[Subiendo imagen...]\n".length);
        }
      }
    };
  };

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'], // Añade 'image' a la barra de herramientas
        ['clean']
      ],
      handlers: {
        'image': imageHandler, // Asigna el manejador personalizado
      },
    },
  }), []);

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3 flex-1">
          {!isViewMode && (
            <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className={`p-2 rounded ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
            <p className="text-xs text-gray-500">{config.label}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {!isViewMode && (
            <button
              type="button"
              onClick={() => onRemove(step.id)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('lessons.steps.stepTitle')}</label>
            <input
              type="text"
              value={step.title}
              onChange={(e) => onUpdate(step.id, { title: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              disabled={isViewMode}
            />
          </div>

          {step.type === 'video' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('lessons.stepTypes.video.videoUrl')}</label>
              <input
                type="url"
                value={step.data?.video_url || ''}
                onChange={(e) => onUpdate(step.id, { data: { ...step.data, video_url: e.target.value } })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder={t('lessons.placeholders.videoUrl')}
                disabled={isViewMode}
              />
            </div>
          )}

          {step.type === 'text' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('lessons.stepTypes.text.content')}</label>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={step.data?.content || ''}
                onChange={(content) => onUpdate(step.id, { data: { ...step.data, content } })}
                readOnly={isViewMode}
                modules={quillModules}
              />
            </div>
          )}

          {step.type === 'quiz' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('lessons.stepTypes.quiz.quizId')}</label>
              <QuizSingleSelector
                value={step.data?.quiz_id || null}
                onChange={(quizId) => onUpdate(step.id, { data: { ...step.data, quiz_id: quizId } })}
                disabled={isViewMode}
              />
            </div>
          )}

          {/* 🔥 NUEVO: Interfaz para el paso de tipo PDF */}
          {step.type === 'pdf' && (
            <PdfStepEditor
              step={step}
              onUpdate={onUpdate}
              isViewMode={isViewMode}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
};

// 🔥 NUEVO: Componente para gestionar la subida y visualización de PDFs
const PdfStepEditor = ({ step, onUpdate, isViewMode, t }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf']
    });

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const uploadedMedia = await uploadMedia(file, { onProgress: setProgress });
      onUpdate(step.id, {
        data: {
          ...step.data,
          file_id: uploadedMedia.id,
          filename: file.name,
          url: uploadedMedia.url
        }
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  const removePdf = () => {
      onUpdate(step.id, {
          data: {
              ...step.data,
              file_id: null,
              filename: null,
              url: null
          }
      })
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">{t('lessons.stepTypes.pdf.label')}</label>
      
      {step.data?.file_id ? (
        <div className="flex items-center justify-between p-2 bg-gray-100 border border-gray-200 rounded-md">
            <div className='flex items-center space-x-2'>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <a href={step.data.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate" title={step.data.filename}>
                {step.data.filename}
              </a>
            </div>
          {!isViewMode && (
            <button type="button" onClick={removePdf} className="p-1 text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || isViewMode}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isViewMode}
            className="w-full flex items-center justify-center px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            {uploading ? `Uploading... ${progress}%` : 'Select a PDF file'}
          </button>
        </div>
      )}
      
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

const StepCreatorModal = ({ isOpen, onClose, onSave, stepTypes, newStep, setNewStep, t }) => {
  if (!isOpen) return null;

  const handleSave = () => {
    if (!newStep.title.trim()) {
      alert(t('lessons.validation.stepTitleRequired'));
      return;
    }
    onSave(newStep);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('lessons.steps.addStep')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.steps.stepType')}</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(stepTypes).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewStep(prev => ({ ...prev, type }))}
                      className={`p-3 border rounded-lg hover:bg-gray-50 ${
                        newStep.type === type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('lessons.steps.stepTitle')}</label>
              <input
                type="text"
                value={newStep.title}
                onChange={(e) => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('lessons.placeholders.stepTitle')}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            {t('lessons.actions.addStep')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;