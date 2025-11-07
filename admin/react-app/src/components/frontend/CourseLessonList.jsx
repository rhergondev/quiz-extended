import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  FileText, 
  CheckSquare, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';


const CourseLessonList = ({ lessons, isLoading, selectedStepId, onSelectStep }) => {
  const { t } = useTranslation();
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  // ✅ Estado para controlar el colapso del panel completo
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 🔍 DEBUG: Log para ver el orden de las lecciones recibidas
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      console.log('🔍 DEBUG CourseLessonList: Orden de lecciones recibidas:', 
        lessons.map((l, idx) => ({ 
          index: idx, 
          id: l.id, 
          title: l.title?.rendered || l.title,
          _lesson_order: l.meta?._lesson_order 
        }))
      );
    }
  }, [lessons]);

  useEffect(() => {
    if (selectedStepId && !expandedLessonId) {
      const lessonWithStep = lessons.find(l => l.meta?._lesson_steps?.some(s => s.id === selectedStepId));
      if (lessonWithStep) {
        setExpandedLessonId(lessonWithStep.id);
      }
    }
  }, [selectedStepId, expandedLessonId, lessons]);
  
  const getStepIcon = (stepType) => {
    switch(stepType) {
      case 'video': return <PlayCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />;
      case 'quiz': return <CheckSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />;
      default: return <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const handleLessonClick = (lessonId) => {
    // No permitir expandir/colapsar lecciones si el panel entero está colapsado
    if (isCollapsed) return;
    setExpandedLessonId(prevId => (prevId === lessonId ? null : lessonId));
  };
  
  const getStepTitle = (step) => {
    // For quiz steps, use the quiz_title from the step data if available
    if (step.type === 'quiz' && step.data?.quiz_title) {
      return step.data.quiz_title;
    }
    // Otherwise use the step title
    return step.title || t('untitled');
  };

  const loadingSkeleton = (
    <div className="p-4 animate-pulse">
      {!isCollapsed && <div className="h-6 bg-gray-300 rounded w-3/4 mb-6"></div>}
      <div className="space-y-4">
        <div className="h-5 bg-gray-300 rounded w-full"></div>
        <div className="h-5 bg-gray-300 rounded w-5/6"></div>
        <div className="h-5 bg-gray-300 rounded w-full"></div>
      </div>
    </div>
  );

  return (
    // ✅ El ancho del panel es dinámico y se mantiene responsive
    <aside className={`transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'w-24' : 'lg:w-80 w-full'}`}>

      <div className="h-[100%] border-l-2 border-black-200">
        <div className="bg-gray-100 h-full flex flex-col">
          {/* ✅ Cabecera con título condicional y botón de colapso */}
          <div className={`p-4 border-b border-gray-200 flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <h2 className="text-xl font-semibold text-gray-800">
                {t('courses.courseContent')}
              </h2>
            )}
            <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed(!isCollapsed); }}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className="text-primary hover:text-accent transition-colors cursor-pointer"
          >
              {isCollapsed ? <ChevronLeft size={24}/> : <ChevronRight size={24}/>}
            </div >
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              loadingSkeleton
            ) : lessons && lessons.length > 0 ? (
              <ul>
                {lessons.map((lesson) => {
                  const isExpanded = expandedLessonId === lesson.id;
                  const steps = lesson.meta?._lesson_steps || [];
                  // Extract title properly from API response
                  const lessonTitle = lesson.title?.rendered || lesson.title || 'Sin título';
                  
                  return (
                    <li key={lesson.id} className="border-b border-gray-200">
                      <div
                        onClick={() => handleLessonClick(lesson.id)}
                        className={`p-4 flex justify-between items-center ${!isCollapsed ? 'cursor-pointer' : ''} ${isExpanded && !isCollapsed ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
                        title={isCollapsed ? lessonTitle : ''}
                      >
                        <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                          <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          {/* ✅ Título de la lección condicional */}
                          {!isCollapsed && <span className="text-sm font-bold text-gray-800">{lessonTitle}</span>}
                        </div>
                        {/* ✅ Icono de expandir/colapsar lección condicional */}
                        {!isCollapsed && steps.length > 0 && (
                           isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      
                      {/* ✅ Los pasos solo se muestran si la lección está expandida Y el panel NO está colapsado */}
                      {isExpanded && !isCollapsed && steps.length > 0 && (
                        <ul className="bg-white">
                          {steps.map((step) => {
                            const isSelected = step.id === selectedStepId;
                            const title = getStepTitle(step);
                            return (
                              <li 
                                key={step.id}
                                onClick={() => onSelectStep(step, lesson)}
                                className={`flex items-center space-x-2 py-3 px-4 border-l-4 transition-colors cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
                                style={{ paddingLeft: '2rem' }}
                              >
                                {getStepIcon(step.type)}
                                <span className={`text-sm ${isSelected ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>{title}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              // ✅ Mensaje de "no hay lecciones" condicional
              !isCollapsed && <p className="p-4 text-gray-500">{t('noLessonsForCourse')}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CourseLessonList;