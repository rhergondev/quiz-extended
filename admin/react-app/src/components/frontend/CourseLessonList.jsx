import React, { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, FileText, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';

const CourseLessonList = ({ lessons, isLoading, selectedStepId, onSelectStep, quizzes }) => {
  const [expandedLessonId, setExpandedLessonId] = useState(null);

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
      case 'video': return <PlayCircle className="w-4 h-4 text-gray-500" />;
      case 'quiz': return <CheckSquare className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleLessonClick = (lessonId) => {
    setExpandedLessonId(prevId => (prevId === lessonId ? null : lessonId));
  };
  
  // 🔥 CORRECCIÓN: Se extrae el título correctamente del objeto 'rendered'.
  const getQuizTitle = (quizId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz ? (quiz.title.rendered || quiz.title) : 'Cuestionario';
  };

  const loadingSkeleton = (
    <div className="p-4 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-3/4 mb-6"></div>
      <div className="space-y-4">
        <div className="h-5 bg-gray-300 rounded w-full"></div>
        <div className="h-5 bg-gray-300 rounded w-5/6"></div>
        <div className="h-5 bg-gray-300 rounded w-full"></div>
      </div>
    </div>
  );

  return (
    <aside className="lg:w-96 w-full flex-shrink-0">
      <div className="sticky top-0 h-screen">
        <div className="bg-gray-100 h-full flex flex-col">
          <h2 className="text-xl font-semibold text-gray-800 p-4 border-b border-gray-200 flex-shrink-0">
            Contenido del Curso
          </h2>
          <div className="overflow-y-auto">
            {isLoading ? (
              loadingSkeleton
            ) : lessons && lessons.length > 0 ? (
              <ul>
                {lessons.map((lesson) => {
                  const isExpanded = expandedLessonId === lesson.id;
                  const steps = lesson.meta?._lesson_steps || [];
                  return (
                    <li key={lesson.id} className="border-b border-gray-200">
                      <div
                        onClick={() => handleLessonClick(lesson.id)}
                        className={`p-4 cursor-pointer flex justify-between items-center ${isExpanded ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
                      >
                        <div className="flex items-center space-x-3">
                          <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <h3 className="font-semibold text-gray-700">{lesson.title}</h3>
                        </div>
                        {steps.length > 0 && (
                           isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      
                      {isExpanded && steps.length > 0 && (
                        <ul className="bg-white">
                          {steps.map((step) => {
                            const isSelected = step.id === selectedStepId;
                            const title = step.type === 'quiz' ? getQuizTitle(step.data.quiz_id) : step.title;
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
              <p className="p-4 text-gray-500">Este curso aún no tiene lecciones.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CourseLessonList;