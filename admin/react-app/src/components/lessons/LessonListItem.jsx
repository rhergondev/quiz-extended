import React from 'react';
import { BookOpen, CheckSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/**
 * Renderiza un único ítem en la lista de lecciones.
 */
const LessonListItem = ({ lesson, isSelected, onClick }) => {
  const { t } = useTranslation();

  // CORRECCIÓN: Función robusta para obtener el título
  const getLessonTitle = (lesson) => {
    return lesson?.title?.rendered || lesson?.title || t('lessons.untitled', 'Untitled Lesson');
  };

  const itemClasses = clsx(
    'p-4 cursor-pointer border-l-4 transition-colors duration-150',
    {
      'bg-blue-50 border-blue-600': isSelected,
      'border-transparent hover:bg-gray-50': !isSelected,
    }
  );

  return (
    <div className={itemClasses} onClick={() => onClick(lesson)}>
      <div className="flex items-center w-full gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={getLessonTitle(lesson)}>
            {/* CORRECCIÓN: Usar la nueva función */}
            {getLessonTitle(lesson)}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <CheckSquare className="w-3 h-3" />
            <span>{lesson.steps_count || 0} Pasos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonListItem;

