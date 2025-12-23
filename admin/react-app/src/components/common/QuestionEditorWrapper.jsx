import React from 'react';
import QuestionEditorPanel from '../questions/QuestionEditorPanel';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import useLessons from '../../hooks/useLessons.js';
import useQuizzes from '../../hooks/useQuizzes.js';
import useCourses from '../../hooks/useCourses.js';

/**
 * Componente embebeable para editar preguntas desde cualquier lugar del admin
 * Maneja automáticamente la carga de opciones de taxonomías y datos relacionados
 */
const QuestionEditorWrapper = ({ 
  questionId,
  mode = 'edit', // 'edit' | 'create'
  onSave,
  onCancel,
  // Opcionales: puedes pasar datos precargados para evitar cargas adicionales
  preloadedCategoryOptions = null,
  preloadedProviderOptions = null,
  preloadedLessons = null,
  preloadedQuizzes = null,
  preloadedCourses = null,
}) => {
  // Cargar taxonomías solo si no están precargadas
  const { 
    options: taxonomyOptions, 
    refetch: refetchTaxonomies 
  } = useTaxonomyOptions(
    preloadedCategoryOptions && preloadedProviderOptions 
      ? [] 
      : ['qe_category', 'qe_provider']
  );

  // Cargar datos relacionados solo si no están precargados
  const lessonsHook = useLessons({ autoFetch: !preloadedLessons });
  const quizzesHook = useQuizzes({ autoFetch: !preloadedQuizzes });
  const coursesHook = useCourses({ 
    autoFetch: !preloadedCourses,
    status: 'publish,draft,private'
  });

  // Determinar qué opciones usar
  const categoryOptions = preloadedCategoryOptions || 
    (taxonomyOptions.qe_category || []).filter(opt => opt.value !== 'all');
  
  const providerOptions = preloadedProviderOptions || 
    (taxonomyOptions.qe_provider || []).filter(opt => opt.value !== 'all');
  
  const availableLessons = preloadedLessons || lessonsHook.lessons || [];
  const availableQuizzes = preloadedQuizzes || quizzesHook.quizzes || [];
  const availableCourses = preloadedCourses || coursesHook.courses || [];

  return (
    <QuestionEditorPanel
      questionId={questionId}
      mode={mode}
      onSave={onSave}
      onCancel={onCancel}
      categoryOptions={categoryOptions}
      providerOptions={providerOptions}
      onCategoryCreated={refetchTaxonomies}
      onProviderCreated={refetchTaxonomies}
      availableQuizzes={availableQuizzes}
      availableLessons={availableLessons}
      availableCourses={availableCourses}
    />
  );
};

export default QuestionEditorWrapper;
