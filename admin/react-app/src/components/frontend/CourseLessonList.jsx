import React from 'react';
import { BookOpen, PlayCircle, FileText, CheckSquare } from 'lucide-react';

const CourseLessonList = ({ lessons, isLoading }) => {
  const getStepIcon = (stepType) => {
    switch(stepType) {
      case 'video': return <PlayCircle className="w-4 h-4 text-gray-500" />;
      case 'quiz': return <CheckSquare className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const loadingSkeleton = (
    <div className="p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-full"></div>
          <div className="h-6 bg-gray-200 rounded w-5/6"></div>
          <div className="h-6 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );

  return (
    <aside className="lg:w-1/3 w-full">
      {/* 🔥 CORRECCIÓN: Contenedor "sticky" para que la lista se quede fija al hacer scroll */}
      <div className="sticky top-8">
        <div className="bg-white rounded-lg shadow-md max-h-[calc(100vh-4rem)] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 p-4 border-b sticky top-0 bg-white z-10">
            Lecciones del Curso
          </h2>
          {isLoading ? (
            loadingSkeleton
          ) : lessons && lessons.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-700">{lesson.title}</h3>
                  </div>
                  {lesson.meta?._lesson_steps && lesson.meta._lesson_steps.length > 0 && (
                    <ul className="pl-8 space-y-2 text-sm border-l-2 border-gray-200 ml-2.5">
                      {lesson.meta._lesson_steps.map((step, index) => (
                        <li key={index} className="flex items-center space-x-2 text-gray-600">
                          {getStepIcon(step.type)}
                          <span>{step.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-gray-500">Este curso aún no tiene lecciones.</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default CourseLessonList;