import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

// Hooks
import useCourses from '../../hooks/useCourses.js';
import useLessons from '../../hooks/useLessons.js';
import useQuizzes from '../../hooks/useQuizzes.js';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';

// Componentes
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar';
import CourseListItem from './CourseListItem';
import CourseEditorPanel from './CourseEditorPanel';
import LessonEditorPanel from '../lessons/LessonEditorPanel';
import QuizEditorPanel from '../quizzes/QuizEditorPanel';

const CoursesManager = () => {
  const { t } = useTranslation();

  // --- ESTADO PRINCIPAL: GESTIÓN DE LA PILA DE PANELES ---
  const [panelStack, setPanelStack] = useState([{ type: 'courseList' }]);

  // --- HOOKS DE DATOS ---
  const coursesHook = useCourses({ 
    autoFetch: true, 
    perPage: 50,
    debounceMs: 300,
    status: 'publish,draft,private' // 🎯 Admin muestra todos los estados
  });
  const lessonsHook = useLessons({ autoFetch: false });
  const quizzesHook = useQuizzes({ autoFetch: false });
  const { options: taxonomyOptions, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category']);

  // --- MANEJADORES DE LA PILA DE PANELES ---
  const handleSelectCourse = (course) => {
    setPanelStack([{ type: 'courseList' }, { type: 'course', id: course.id }]);
  };

  const handleCreateNewCourse = () => {
    setPanelStack([{ type: 'courseList' }, { type: 'course', id: 'new' }]);
  };

  const handleClosePanel = () => {
    setPanelStack(prev => prev.slice(0, -1));
  };
  
  const handleTriggerCreation = (childType, onCreatedCallback) => {
    setPanelStack(prev => [...prev, { type: childType, id: 'new', onCreated: onCreatedCallback }]);
  };

  const handleSaveAndAttachChild = async (childData, childType) => {
    let hook, createFn;
    if (childType === 'lesson') {
        hook = lessonsHook;
        createFn = 'createLesson';
    } else if (childType === 'quiz') {
        hook = quizzesHook;
        createFn = 'createQuiz';
    }

    if (!hook || !createFn) return;

    try {
        const lastPanel = panelStack[panelStack.length - 1];
        const newChild = await hook[createFn](childData);
        if (lastPanel.onCreated) {
            lastPanel.onCreated(newChild);
        }
        handleClosePanel();
        coursesHook.refresh(); 
        lessonsHook.refresh();
    } catch (error) {
        console.error(`Failed to create ${childType} in context:`, error);
    }
  };


  // --- CONFIGS PARA COMPONENTES HIJO ---
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions.qe_category]);
  const courseOptionsForLessons = useMemo(() => (coursesHook.courses || []).map(c => ({ value: c.id.toString(), label: c.title?.rendered || c.title })), [coursesHook.courses]);

  const searchConfig = useMemo(() => ({
      value: coursesHook.filters?.search || '',
      onChange: (e) => coursesHook.updateFilter('search', e.target.value),
      placeholder: t('courses.searchPlaceholder'),
      isLoading: coursesHook.loading,
  }), [coursesHook.filters, coursesHook.loading, t]);

  const filtersConfig = useMemo(() => {
    if (!coursesHook.filters) return [];
    return [
      {
        label: t('filters.category'),
        value: coursesHook.filters.category || 'all',
        onChange: (value) => coursesHook.updateFilter('category', value),
        options: categoryOptions,
        isLoading: !taxonomyOptions.qe_category,
      },
    ];
  }, [coursesHook.filters, categoryOptions, taxonomyOptions.qe_category, t]);


  // --- LÓGICA DE RENDERIZADO ---
  const isInitialLoading = !coursesHook.filters || !coursesHook.computed;
  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }

  const panelWidths = {
      1: ['20%'],
      2: ['20%', '79%'],
      3: ['20%', '7%', '71%'],
      4: ['20%', '7%', '7%', '63%']
  };
  const widths = panelWidths[panelStack.length] || panelWidths[4];

  const renderPanel = (panel, index) => {
      const isLastPanel = index === panelStack.length - 1;
      const isCollapsed = !isLastPanel;

      switch(panel.type) {
          case 'courseList':
              return (
                  <ListPanel
                      title={t('courses.title')}
                      itemCount={coursesHook.pagination?.total || 0}
                      createButtonText={t('courses.addNew')}
                      onCreate={handleCreateNewCourse}
                      isCreating={coursesHook.creating}
                      onLoadMore={coursesHook.loadMoreCourses}
                      hasMore={coursesHook.hasMore}
                      isLoadingMore={coursesHook.loading && (coursesHook.courses?.length || 0) > 0}
                      filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
                  >
                      {(coursesHook.courses || []).map(course => (
                          <CourseListItem key={course.id} course={course} isSelected={panelStack[1]?.id === course.id} onClick={handleSelectCourse} />
                      ))}
                  </ListPanel>
              );
          case 'course':
              return (
                  <CourseEditorPanel
                      key={panel.id}
                      courseId={panel.id === 'new' ? null : panel.id}
                      mode={panel.id === 'new' ? 'create' : 'edit'}
                      onSave={panel.id === 'new' ? coursesHook.createCourse : (data) => coursesHook.updateCourse(panel.id, data)}
                      onCancel={handleClosePanel}
                      onTriggerCreation={handleTriggerCreation}
                      isCollapsed={isCollapsed}
                      categoryOptions={categoryOptions.filter(opt => opt.value !== 'all')}
                      onCategoryCreated={refetchTaxonomies}
                  />
              );
          case 'lesson':
              return (
                  <LessonEditorPanel
                      key={panel.id}
                      lessonId={panel.id === 'new' ? null : panel.id}
                      mode='create' // Siempre en modo creación contextual
                      onSave={(data) => handleSaveAndAttachChild(data, 'lesson')}
                      onCancel={handleClosePanel}
                      availableCourses={courseOptionsForLessons}
                      onTriggerCreation={handleTriggerCreation}
                      isCollapsed={isCollapsed}
                      isContextual
                  />
              );
         case 'quiz':
              return (
                  <QuizEditorPanel
                      key={panel.id}
                      mode='create' // Siempre en modo creación contextual
                      onSave={(data) => handleSaveAndAttachChild(data, 'quiz')}
                      onCancel={handleClosePanel}
                      availableCourses={courseOptionsForLessons}
                      availableCategories={[]}
                      onTriggerCreation={handleTriggerCreation}
                      isCollapsed={isCollapsed}
                      isContextual
                  />
              );
          default:
              return null;
      }
  }

  return (
    <div className="qe-lms-admin-app h-full flex overflow-hidden px-6 py-6 space-x-6">
        {panelStack.map((panel, index) => (
            <div 
                key={`${panel.type}-${panel.id}-${index}`}
                className="transition-all duration-300 ease-in-out h-full flex-shrink-0"
                style={{ width: widths[index] }}
            >
                {renderPanel(panel, index)}
            </div>
        ))}
    </div>
  );
};

export default CoursesManager;