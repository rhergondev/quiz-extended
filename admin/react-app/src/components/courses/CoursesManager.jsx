import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

// Hooks
import useCourses from '../../hooks/useCourses.js';
import useLessons from '../../hooks/useLessons.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Componentes comunes
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';

// Componentes de Cursos
import CourseListItem from './CourseListItem';
import CourseEditorPanel from './CourseEditorPanel';
import LessonEditorPanel from '../lessons/LessonEditorPanel';

const CoursesManager = () => {
  const { t } = useTranslation();

  // --- ESTADOS PRINCIPALES ---
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [mode, setMode] = useState('view');
  
  // --- ESTADO DE CREACIÓN CONTEXTUAL ---
  const [creationContext, setCreationContext] = useState({
    isActive: false,
    childType: null,
    onCreated: null,
  });

  // --- HOOKS DE DATOS ---
  const coursesHook = useCourses({ autoFetch: true, perPage: 50 });
  const lessonsHook = useLessons({ autoFetch: false });
  // CORRECCIÓN: Extraemos la función para refrescar las taxonomías
  const { options: taxonomyOptions, isLoading: isLoadingTaxonomies, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- MANEJADORES DE UI ---
  const handleSelectCourse = (course) => {
    setSelectedCourseId(course.id);
    setMode('edit');
  };

  const handleCreateNew = () => {
    setSelectedCourseId(null);
    setMode('create');
  };

  // --- MANEJADORES DE CREACIÓN CONTEXTUAL ---
  const handleTriggerCreation = (childType, onCreatedCallback) => {
    setCreationContext({
      isActive: true,
      childType: childType,
      onCreated: onCreatedCallback,
    });
  };

  const handleCancelCreation = () => {
    setCreationContext({ isActive: false, childType: null, onCreated: null });
  };

  const handleSaveAndAttachChild = async (childData) => {
    if (creationContext.childType === 'lesson') {
      try {
        const lessonData = { ...childData, courseId: selectedCourseId };
        const newLesson = await lessonsHook.createLesson(lessonData);
        if (creationContext.onCreated) {
          creationContext.onCreated(newLesson);
        }
        handleCancelCreation();
        coursesHook.refresh();
      } catch (error) {
        console.error("Failed to create lesson in context:", error);
      }
    }
  };

  // --- CONFIGS PARA COMPONENTES HIJO ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);

  const filtersConfig = useMemo(() => {
    if (!coursesHook.filters) return [];
    return [
      {
        label: t('filters.category'),
        value: coursesHook.filters.category || 'all',
        onChange: (value) => coursesHook.updateFilter('category', value),
        options: categoryOptions,
        isLoading: isLoadingTaxonomies,
      },
    ];
  }, [coursesHook.filters, categoryOptions, isLoadingTaxonomies, t]);

  const searchConfig = useMemo(() => ({
      value: coursesHook.filters?.search || '',
      onChange: (e) => coursesHook.updateFilter('search', e.target.value),
      placeholder: t('courses.searchPlaceholder'),
      isLoading: coursesHook.loading,
  }), [coursesHook.filters, coursesHook.loading, t]);

  // --- RENDERIZADO ---
  const isInitialLoading = !coursesHook.filters || !coursesHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }
  
  const isContextualCreationActive = creationContext.isActive && creationContext.childType === 'lesson';

  return (
    <div className="qe-lms-admin-app h-full flex overflow-hidden px-6 py-6 space-x-6">
      <div className={clsx("transition-all duration-500 ease-in-out h-full flex-shrink-0", { "w-full lg:w-[20%]": !isContextualCreationActive, "w-[20%] opacity-60 pointer-events-none": isContextualCreationActive })}>
        <ListPanel
          title={t('courses.title')}
          itemCount={coursesHook.computed.totalCourses || 0}
          createButtonText={t('courses.addNew')}
          onCreate={handleCreateNew}
          isCreating={coursesHook.creating}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
        >
          {(coursesHook.courses || []).map(course => (
            <CourseListItem key={course.id} course={course} isSelected={selectedCourseId === course.id} onClick={handleSelectCourse} />
          ))}
        </ListPanel>
      </div>

      <div className={clsx("transition-all duration-500 ease-in-out h-full flex-shrink-0", { "flex-1": !isContextualCreationActive && (selectedCourseId || mode === 'create'), "w-0": !selectedCourseId && !isContextualCreationActive && mode !== 'create', "w-[7%]": isContextualCreationActive })}>
        {(mode === 'edit' || mode === 'create') && (
          <CourseEditorPanel
            key={selectedCourseId || 'new'}
            courseId={selectedCourseId}
            mode={mode}
            onSave={mode === 'create' ? coursesHook.createCourse : (data) => coursesHook.updateCourse(selectedCourseId, data)}
            onCancel={() => { setSelectedCourseId(null); setMode('view'); }}
            onTriggerCreation={handleTriggerCreation}
            isCollapsed={isContextualCreationActive}
            categoryOptions={categoryOptions.filter(opt => opt.value !== 'all')}
            // CORRECCIÓN: Pasamos la función de refresco al editor
            onCategoryCreated={refetchTaxonomies}
          />
        )}
      </div>

      <div className={clsx("transition-all duration-500 ease-in-out h-full", { "flex-1": isContextualCreationActive, "w-0": !isContextualCreationActive })}>
        {isContextualCreationActive && (
          <LessonEditorPanel
            mode="create"
            onSave={handleSaveAndAttachChild}
            onCancel={handleCancelCreation}
            availableCourses={[{ value: selectedCourseId, label: 'Curso Actual' }]}
            isContextual
          />
        )}
      </div>
    </div>
  );
};

export default CoursesManager;