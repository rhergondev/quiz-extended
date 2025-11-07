import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, AlertCircle, Plus, Trash2, GripVertical, Video, FileText, HelpCircle, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

import { getOne as getLesson } from '../../api/services/lessonService';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import Tabs from '../common/layout/Tabs';

// Componentes específicos para los tipos de pasos
import QuizSingleSelector from '../common/QuizSingleSelector';
import PdfStepEditor from './PdfStepEditor';

const getLessonTitle = (lesson) => lesson?.title?.rendered || lesson?.title || 'Lección sin título';

const StepRenderer = ({ step, index, onUpdate, quillRef, onTriggerCreation }) => {
  const imageHandler = useCallback(async () => {
    try {
      const imageUrl = await openMediaSelector();
      if (imageUrl && quillRef.current) {
        const quillEditor = quillRef.current.getEditor();
        const range = quillEditor.getSelection(true);
        quillEditor.insertEmbed(range.index, 'image', imageUrl);
        quillEditor.setSelection(range.index + 1);
      }
    } catch (error) { console.error("Error al abrir el selector de medios:", error); }
  }, [quillRef]);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline'],
        [{'list': 'ordered'}, {'list': 'bullet'}], ['link', 'image'], ['clean']
      ],
      handlers: { 'image': imageHandler },
    },
  }), [imageHandler]);

  switch (step.type) {
    case 'video':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL del Video</label>
          <input type="url" value={step.data?.video_url || ''} onChange={(e) => onUpdate(index, 'data', { ...step.data, video_url: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="https://..." />
        </div>
      );
    case 'quiz':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Seleccionar Cuestionario</label>
          <QuizSingleSelector
            value={step.data?.quiz_id || null}
            onChange={(quizId) => onUpdate(index, 'data', { ...step.data, quiz_id: quizId })}
            onCreateNew={() => onTriggerCreation('quiz', (newQuizId) => {
                onUpdate(index, 'data', { ...step.data, quiz_id: newQuizId });
            })}
          />
        </div>
      );
    case 'pdf':
       return <PdfStepEditor step={step} onUpdate={(field, value) => onUpdate(index, field, value)} />;
    case 'text':
    default:
      return <ReactQuill ref={quillRef} theme="snow" value={step.data?.content || ''} onChange={(content) => onUpdate(index, 'data', { ...step.data, content })} className="bg-white" modules={quillModules} />;
  }
};

const SortableStepItem = ({ step, index, onUpdate, onRemove, onTriggerCreation }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const [isExpanded, setIsExpanded] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const quillRef = useRef(null);

  const stepIcons = {
    text: <FileText className="h-4 w-4 text-green-700" />,
    video: <Video className="h-4 w-4 text-blue-700" />,
    quiz: <HelpCircle className="h-4 w-4 text-purple-700" />,
    pdf: <Download className="h-4 w-4 text-red-700" />,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 flex-1">
          <button type="button" {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="p-2 rounded bg-gray-100">{stepIcons[step.type] || stepIcons.text}</div>
          <div className="flex-1">
            <input type="text" value={step.title} onChange={(e) => onUpdate(index, 'title', e.target.value)} placeholder="Título del paso" className="font-medium text-sm text-gray-900 bg-transparent w-full focus:outline-none" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          <StepRenderer step={step} index={index} onUpdate={onUpdate} quillRef={quillRef} onTriggerCreation={onTriggerCreation} />
        </div>
      )}
    </div>
  );
};

const AddStepMenu = ({ onAddStep }) => {
  const [isOpen, setIsOpen] = useState(false);
  const stepTypes = [
    { type: 'text', label: 'Texto', icon: <FileText className="w-4 h-4" /> },
    { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
    { type: 'quiz', label: 'Cuestionario', icon: <HelpCircle className="w-4 h-4" /> },
    { type: 'pdf', label: 'PDF', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Añadir Paso
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {stepTypes.map(({ type, label, icon }) => (
              <button key={type} onClick={() => { onAddStep(type); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LessonEditorPanel = ({ lessonId, mode, onSave, onCancel, availableCourses, onTriggerCreation, isCollapsed = false }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor));

  const resetForm = useCallback(() => {
    setFormData({ title: '', content: '', status: 'publish', courseId: '', steps: [] });
    setActiveTab(0);
  }, []);

  useEffect(() => {
    const fetchLessonData = async () => {
      if (lessonId && (mode === 'edit' || mode === 'view')) {
        setIsLoading(true);
        setError(null);
        setActiveTab(0);
        try {
          const data = await getLesson(lessonId);
          setFormData({
            title: getLessonTitle(data),
            content: data.content?.rendered || '',
            status: data.status || 'publish',
            courseId: data.meta?._course_id?.toString() || '',
            steps: (data.meta?._lesson_steps || []).map((step, i) => ({ ...step, id: `step-${i}` })),
          });
        } catch (err) { setError('Failed to load lesson data.'); } finally { setIsLoading(false); }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchLessonData();
  }, [lessonId, mode, resetForm]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStepUpdate = (index, field, value) => {
    const newSteps = [...formData.steps];
    if (field === 'data') newSteps[index].data = value;
    else newSteps[index][field] = value;
    handleFieldChange('steps', newSteps);
  };

  const addStep = (type) => {
    const currentSteps = formData.steps || [];
    const newOrder = currentSteps.length + 1; // El nuevo order será el siguiente índice (comenzando desde 1)
    const newStep = { 
      id: `step-${Date.now()}`, 
      title: `Nuevo Paso (${type})`, 
      type: type, 
      order: newOrder,
      data: {} 
    };
    handleFieldChange('steps', [...currentSteps, newStep]);
  };

  const removeStep = (index) => {
    const filteredSteps = formData.steps.filter((_, i) => i !== index);
    // Recalcular el orden después de eliminar (comenzando desde 1)
    const stepsWithUpdatedOrder = filteredSteps.map((step, idx) => ({
      ...step,
      order: idx + 1
    }));
    handleFieldChange('steps', stepsWithUpdatedOrder);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formData.steps.findIndex(s => s.id === active.id);
      const newIndex = formData.steps.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSteps = arrayMove(formData.steps, oldIndex, newIndex);
        
        // Recalcular el campo 'order' basado en la nueva posición
        const stepsWithUpdatedOrder = reorderedSteps.map((step, index) => ({
          ...step,
          order: index + 1  // Comenzar desde 1 en lugar de 0
        }));
        
        handleFieldChange('steps', stepsWithUpdatedOrder);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Recalcular el orden secuencial antes de guardar y eliminar el id temporal (comenzando desde 1)
      const stepsForApi = formData.steps.map(({ id, ...rest }, index) => ({
        ...rest,
        order: index + 1
      }));
      
      // 🔥 CAMBIO: Solo incluir _course_id si tiene un valor válido
      // "0" o "" significa "sin curso seleccionado"
      const meta = { _lesson_steps: stepsForApi };
      if (formData.courseId && formData.courseId !== '' && formData.courseId !== '0') {
        meta._course_id = formData.courseId;
      }
      
      const lessonDataForApi = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        meta,
      };
      await onSave(lessonDataForApi);
    } catch (err) { setError(err.message || 'Failed to save the lesson.'); } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><p>Cargando...</p></div>;

  const settingsTabContent = (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Lección</label>
        <input type="text" value={formData.title || ''} onChange={(e) => handleFieldChange('title', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
        <select value={formData.courseId || ''} onChange={(e) => handleFieldChange('courseId', e.target.value)} className="w-full input border-gray-300 rounded-md">
          <option value="">Seleccionar curso...</option>
          {availableCourses.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Contenido Principal</label>
        <ReactQuill theme="snow" value={formData.content || ''} onChange={(val) => handleFieldChange('content', val)} />
      </div>
    </div>
  );

  const stepsTabContent = (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={(formData.steps || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
          {(formData.steps || []).map((step, index) => (
            <SortableStepItem key={step.id} step={step} index={index} onUpdate={handleStepUpdate} onRemove={removeStep} onTriggerCreation={onTriggerCreation}/>
          ))}
        </SortableContext>
      </DndContext>
      <AddStepMenu onAddStep={addStep} />
    </div>
  );

  const tabs = [
    { name: 'Ajustes', content: settingsTabContent },
    { name: 'Pasos', content: stepsTabContent },
  ];

  const panelTitle = mode === 'create' ? 'Crear Nueva Lección' : `Editando: ${getLessonTitle(formData) || '...'}`;

  return (
    <div className={clsx("bg-white rounded-lg border border-gray-200 flex flex-col h-full", { 'overflow-hidden': isCollapsed })}>
      <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <h3 className={clsx("text-lg font-bold text-gray-800 truncate", { "transform -rotate-90 whitespace-nowrap": isCollapsed })}>{panelTitle}</h3>
        {!isCollapsed && (
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
              <Save className="w-4 h-4"/>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>
      <main className={clsx("flex-1 overflow-y-auto", { 'p-6': !isCollapsed, 'hidden': isCollapsed })}>
        {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-4">{error}</p>}
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>
    </div>
  );
};

export default LessonEditorPanel;

