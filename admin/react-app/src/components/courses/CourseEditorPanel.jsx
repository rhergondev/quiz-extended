import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Plus, GripVertical, Trash2, UploadCloud, ImageIcon, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

import { getOne as getCourse } from '../../api/services/courseService';
import { createTaxonomyTerm } from '../../api/services/taxonomyService';
import { getCourseLessons } from '../../api/services/courseLessonService';
import useLessons from '../../hooks/useLessons';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import Tabs from '../common/layout/Tabs';
import Button from '../common/Button';
import ResourceSelectorModal from '../common/ResourceSelectorModal'; // Importamos el nuevo modal

const getCourseTitle = (course) => course?.title?.rendered || course?.title || 'Curso sin título';

const SortableLessonItem = ({ lesson, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
      <div className="flex items-center gap-3">
        <button type="button" {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
          <GripVertical className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-gray-900">{lesson.title?.rendered || lesson.title}</p>
      </div>
      <button type="button" onClick={() => onRemove(lesson.id)} className="text-red-600 hover:text-red-800">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const CourseEditorPanel = ({ courseId, mode, onSave, onCancel, onTriggerCreation, isCollapsed, categoryOptions, onCategoryCreated }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor));
  
  const { lessons: fetchedLessons, fetchLessons } = useLessons({ courseId: courseId, autoFetch: false, perPage: 100 });
  const [lessons, setLessons] = useState([]);
  
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false); // Estado para el modal

  // No longer needed - we'll fetch lessons directly from the course endpoint
  // useEffect(() => {
  //   setLessons(fetchedLessons);
  // }, [fetchedLessons]);

  const resetForm = useCallback(() => {
    setFormData({
        title: '', content: '', status: 'publish', 
        duration: '',
        featured_image_id: null, featured_image_url: '',
        _course_position: '0', _start_date: '', _end_date: '',
        qe_category: []
    });
    setLessons([]);
  }, []);

  useEffect(() => {
    const fetchCourseData = async () => {
      if (courseId && (mode === 'edit' || mode === 'view')) {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getCourse(courseId);
          const meta = data.meta || {};
          setFormData({
            title: getCourseTitle(data),
            content: data.content?.rendered || '',
            status: data.status || 'publish',
            qe_category: data.qe_category || [],
            duration: meta._course_duration || '',
            featured_image_id: data.featured_media || null,
            featured_image_url: data._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
            _course_position: meta._course_position || '0',
            _start_date: meta._start_date || '',
            _end_date: meta._end_date || '',
          });
          
          // Fetch lessons using the new course-specific endpoint
          try {
            const lessonsResult = await getCourseLessons(courseId, { perPage: 100 });
            setLessons(lessonsResult.data || []);
            console.log(`✅ Loaded ${lessonsResult.data?.length || 0} lessons for course ${courseId}`);
          } catch (lessonErr) {
            console.error('Failed to load lessons:', lessonErr);
            setLessons([]);
          }
          
        } catch (err) { 
          setError('Failed to load course data.'); 
        } finally { 
          setIsLoading(false); 
        }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchCourseData();
  }, [courseId, mode, resetForm]);
  
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        featured_media: formData.featured_image_id,
        qe_category: formData.qe_category,
        meta: {
          _course_duration: formData.duration,
          _lesson_ids: lessons.map(l => l.id),
          _course_position: parseInt(formData._course_position) || 0,
          _start_date: formData._start_date || '',
          _end_date: formData._end_date || '',
        }
      };
      await onSave(dataToSave);
      if (mode === 'create') {
        onCancel();
      }
    } catch(err) { setError(err.message); }
    finally { setIsSaving(false); }
  };
  
  const handleImageUpload = async () => {
    try {
      const media = await openMediaSelector({
        title: 'Seleccionar Imagen Destacada',
        buttonText: 'Usar esta imagen'
      });
      if (media && media.id && media.url) {
        handleFieldChange('featured_image_id', media.id);
        handleFieldChange('featured_image_url', media.url);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
    }
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const newTerm = await createTaxonomyTerm('qe_category', { name: newCategoryName.trim() });
      if (onCategoryCreated) onCategoryCreated(newTerm);
      handleFieldChange('qe_category', [newTerm.id.toString()]);
      setNewCategoryName('');
      setShowNewCategoryForm(false);
    } catch (error) { console.error('Error creating category:', error); }
    finally { setCreatingCategory(false); }
  };

  const handleAddLessonsFromModal = (newLessons) => {
    const lessonsToAdd = newLessons.filter(
      (nl) => !lessons.some((l) => l.id === nl.id)
    );
    setLessons(prev => [...prev, ...lessonsToAdd]);
  };

  const removeLesson = (lessonId) => {
    setLessons(prev => prev.filter(l => l.id !== lessonId));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex(l => l.id === active.id);
      const newIndex = lessons.findIndex(l => l.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setLessons(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const settingsTabContent = (
    <div className="flex flex-col gap-6 h-full">
      <input 
        type="text" 
        value={formData.title || ''} 
        onChange={(e) => handleFieldChange('title', e.target.value)} 
        placeholder={t('courses.fields.title')} 
        className={clsx(
            "w-full focus:outline-none bg-transparent flex-shrink-0",
            mode === 'create' 
                ? "text-2xl font-bold" 
                : "text-xl font-semibold border-b pb-2 border-gray-200"
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('courses.fields.image')}</label>
          {formData.featured_image_url ? (
            <div className="group relative">
                <img src={formData.featured_image_url} alt="Imagen destacada" className="w-full h-48 object-cover rounded-lg"/>
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <button onClick={handleImageUpload} className="text-white text-sm font-semibold bg-gray-800 bg-opacity-70 px-4 py-2 rounded-md">Cambiar Imagen</button>
                </div>
            </div>
          ) : (
            <button onClick={handleImageUpload} className="w-full h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
                <ImageIcon className="h-10 w-10 text-gray-400 mb-2"/>
                Subir Imagen
            </button>
          )}
        </div>
        <div className="flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('courses.fields.position')}</label>
          <input type="number" value={formData._course_position || '0'} onChange={(e) => handleFieldChange('_course_position', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
        </div>
      </div>

      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">{t('courses.fields.category')}</label>
            {!showNewCategoryForm && (
                <button onClick={() => setShowNewCategoryForm(true)} type="button" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Añadir Nueva
                </button>
            )}
        </div>
        {showNewCategoryForm && (
            <div className="mb-3 p-3 bg-gray-50 border rounded-md">
                <div className="flex gap-2">
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nombre de la categoría" className="flex-1 input border-gray-300 rounded-md"/>
                    <Button size="sm" onClick={createNewCategory} isLoading={creatingCategory}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowNewCategoryForm(false)}>Cancelar</Button>
                </div>
            </div>
        )}
        <select value={formData.qe_category?.[0] || ''} onChange={(e) => handleFieldChange('qe_category', [e.target.value])} className="w-full input border-gray-300 rounded-md">
            <option value="">{t('common.select')}</option>
            {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('courses.fields.startDate')}</label>
            <input type="date" value={formData._start_date || ''} onChange={(e) => handleFieldChange('_start_date', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('courses.fields.endDate')}</label>
            <input type="date" value={formData._end_date || ''} onChange={(e) => handleFieldChange('_end_date', e.target.value)} className="w-full input border-gray-300 rounded-md"/>
        </div>
      </div>
       <div className="flex-shrink-0">
         <label className="block text-sm font-medium text-gray-700 mb-1">{t('courses.fields.duration')}</label>
         <input type="text" value={formData.duration || ''} onChange={(e) => handleFieldChange('duration', e.target.value)} placeholder="Ej: 10 horas" className="w-full input border-gray-300 rounded-md"/>
      </div>

       <div className="flex flex-col flex-1 min-h-0">
        <label className="block text-sm font-medium text-gray-700 mb-1 flex-shrink-0">{t('courses.fields.description')}</label>
        <ReactQuill theme="snow" value={formData.content || ''} onChange={(val) => handleFieldChange('content', val)} className="h-full" />
      </div>
    </div>
  );

  const builderTabContent = (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
         <button onClick={() => setIsSelectorModalOpen(true)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg text-sm">Añadir Existente</button>
         <button onClick={() => onTriggerCreation('lesson', (newLesson) => setLessons(prev => [...prev, newLesson]))} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">Crear Nueva Lección</button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {lessons.map(lesson => <SortableLessonItem key={lesson.id} lesson={lesson} onRemove={removeLesson} />)}
          </div>
        </SortableContext>
      </DndContext>
      {lessons.length === 0 && <p className="text-center text-gray-500 py-8">Este curso aún no tiene lecciones.</p>}
    </div>
  );

  const tabs = [
    { name: t('common.settings'), content: settingsTabContent },
    { name: 'Constructor', content: builderTabContent },
  ];
  
  if (isLoading) return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;

  const panelTitle = mode === 'create' ? t('courses.createCourse') : t('courses.editCourse');
  
  return (
    <>
      <div className={clsx("bg-white rounded-lg border border-gray-200 flex flex-col h-full", { 'overflow-hidden': isCollapsed })}>
        <header className={clsx(
          "flex-shrink-0",
          { 
            "p-4 border-b flex items-center justify-between": !isCollapsed,
            "h-full flex items-center justify-center border-r": isCollapsed,
          }
        )}>
          <div className={clsx("font-bold text-gray-800", { "transform -rotate-90 whitespace-nowrap text-sm tracking-wider uppercase": isCollapsed })}>
              {isCollapsed ? getCourseTitle(formData) : (
                  <div>
                      <h3 className="text-lg">{panelTitle}</h3>
                      {mode === 'edit' && <p className="text-xs font-normal text-gray-500">{getCourseTitle(formData)}</p>}
                  </div>
              )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-4">
              <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">
                {isSaving ? t('common.saving') : t('common.save')}
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
      
      <ResourceSelectorModal
        isOpen={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        onAdd={handleAddLessonsFromModal}
        resourceName="Lecciones"
        useResourceHook={useLessons}
        itemsKey="lessons"
        alreadyAddedIds={lessons.map(l => l.id)}
      />
    </>
  );
};

export default CourseEditorPanel;

