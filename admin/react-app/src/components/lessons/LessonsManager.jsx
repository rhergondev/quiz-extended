import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx'; // Utility for conditional classes

// Hooks
import useLessons from '../../hooks/useLessons.js';
import useCourses from '../../hooks/useCourses.js';
import useQuizzes from '../../hooks/useQuizzes.js';

// Componentes comunes y de layout
import ListPanel from '../common/layout/ListPanel';
import FilterBar from '../common/FilterBar'; // CORREGIDO: Ruta de importación.

// Componentes específicos
import LessonListItem from './LessonListItem';
import LessonEditorPanel from './LessonEditorPanel';
import QuizEditorPanel from '../quizzes/QuizEditorPanel';

const LessonsManager = () => {
  const { t } = useTranslation();

  // --- GESTIÓN DE ESTADO PRINCIPAL---
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [mode, setMode] = useState('view');
  
  // --- ESTADO PARA LA CREACIÓN EN CONTEXTO ---
  const [creationContext, setCreationContext] = useState({
    isActive: false,
    childType: null,
    onCreated: null,
  });

  // --- OBTENCIÓN DE DATOS ---
  const lessonsHook = useLessons({ autoFetch: true, perPage: 50 });
  const coursesHook = useCourses({ autoFetch: true, perPage: 100 });
  const quizzesHook = useQuizzes({ autoFetch: true, perPage: 100 });

  // --- MANEJADORES DE LA UI ---
  const handleSelectLesson = (lesson) => {
    setSelectedLessonId(lesson.id);
    setMode('edit');
  };

  const handleCreateNew = () => {
    setSelectedLessonId(null);
    setMode('create');
  };

  // --- MANEJADORES PARA CREACIÓN EN CONTEXTO ---
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

  const handleSaveAndSelectChild = async (childData) => {
    if (creationContext.childType === 'quiz') {
      try {
        const newQuiz = await quizzesHook.createQuiz(childData);
        if (creationContext.onCreated) {
          creationContext.onCreated(newQuiz.id);
        }
        handleCancelCreation();
      } catch (error) {
        console.error("Failed to create quiz in context:", error);
      }
    }
  };


  // --- CONFIGURACIONES PARA COMPONENTES HIJO ---
  const courseOptions = useMemo(() => [
    { value: 'all', label: t('courses.category.all') },
    ...(coursesHook.courses || []).map(c => ({ value: c.id.toString(), label: c.title?.rendered || c.title }))
  ], [coursesHook.courses, t]);
  
  const filtersConfig = useMemo(() => {
    if (!lessonsHook.filters || !lessonsHook.updateFilter) return [];
    return [
      {
        label: 'Curso',
        value: lessonsHook.filters.courseId || 'all',
        onChange: (value) => lessonsHook.updateFilter('courseId', value),
        options: courseOptions,
        isLoading: coursesHook.loading,
      },
    ];
  }, [lessonsHook.filters, lessonsHook.updateFilter, courseOptions, coursesHook.loading, t]);

  const searchConfig = useMemo(() => {
    if (!lessonsHook.filters || !lessonsHook.updateFilter) {
      return {
        value: '',
        onChange: () => {},
        placeholder: t('lessons.searchPlaceholder', 'Buscar lecciones...'),
        isLoading: false,
      };
    }
    return {
      value: lessonsHook.filters.search || '',
      onChange: (e) => lessonsHook.updateFilter('search', e.target.value),
      placeholder: t('lessons.searchPlaceholder', 'Buscar lecciones...'),
      isLoading: lessonsHook.loading,
    };
  }, [lessonsHook.filters, lessonsHook.updateFilter, lessonsHook.loading, t]);

  // --- RENDERIZADO ---
  const isInitialLoading = !lessonsHook.filters || !lessonsHook.computed || !coursesHook.courses;

  if (isInitialLoading) {
    return <div className="flex items-center justify-center h-full"><p>{t('common.loading')}</p></div>;
  }
  
  const isContextualCreationActive = creationContext.isActive && creationContext.childType === 'quiz';

  return (
    // CORREGIDO: Añadido padding horizontal (px-6) y vertical (py-6) para espaciado simétrico.
    <div className="qe-lms-admin-app h-full flex overflow-hidden px-6">
      {/* Panel 1: Lista de Lecciones */}
      <div className={clsx(
        "transition-all duration-500 ease-in-out h-full flex-shrink-0",
        {
          "w-full lg:w-[20%]": !isContextualCreationActive,
          "w-[20%] opacity-60 pointer-events-none": isContextualCreationActive
        }
      )}>
        <ListPanel
          title="Lecciones"
          itemCount={lessonsHook.computed.total || 0}
          createButtonText="Crear Lección"
          onCreate={handleCreateNew}
          isCreating={lessonsHook.creating}
          filters={<FilterBar searchConfig={searchConfig} filtersConfig={filtersConfig} />}
        >
          {(lessonsHook.lessons || []).map(lesson => (
            <LessonListItem
              key={lesson.id}
              lesson={lesson}
              isSelected={selectedLessonId === lesson.id}
              onClick={handleSelectLesson}
            />
          ))}
        </ListPanel>
      </div>

      {/* Panel 2: Editor de Lección (Panel Principal o Colapsado) */}
      <div className={clsx(
        "transition-all duration-500 ease-in-out h-full flex-shrink-0",
        {
          "flex-1": !isContextualCreationActive && (selectedLessonId || mode === 'create'),
          "w-0": !selectedLessonId && !isContextualCreationActive && mode !== 'create',
          "w-[7%]": isContextualCreationActive,
        }
      )}>
        {(mode === 'edit' || mode === 'create') && (
          <LessonEditorPanel
            key={selectedLessonId || 'new'}
            lessonId={selectedLessonId}
            mode={mode}
            onSave={mode === 'create' ? lessonsHook.createLesson : (data) => lessonsHook.updateLesson(selectedLessonId, data)}
            onCancel={() => setMode('view')}
            availableCourses={courseOptions.filter(opt => opt.value !== 'all')}
            onTriggerCreation={handleTriggerCreation}
            isCollapsed={isContextualCreationActive}
          />
        )}
      </div>

      {/* Panel 3: Creador de Cuestionarios (Contextual) */}
      <div className={clsx(
          "transition-all duration-500 ease-in-out h-full",
          {
              "flex-1": isContextualCreationActive,
              "w-0": !isContextualCreationActive,
          }
      )}>
        {isContextualCreationActive && (
            <QuizEditorPanel
                mode="create"
                onSave={handleSaveAndSelectChild}
                onCancel={handleCancelCreation}
                availableCourses={courseOptions.filter(opt => opt.value !== 'all')}
                availableCategories={[]}
                isContextual
            />
        )}
      </div>
    </div>
  );
};

export default LessonsManager;
