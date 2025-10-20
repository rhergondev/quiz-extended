import React from 'react';
import { Book, Users, Star } from 'lucide-react';
import clsx from 'clsx';

const getCourseTitle = (course) => course?.title?.rendered || course?.title || 'Curso sin título';

const CourseListItem = ({ course, isSelected, onClick }) => {
  const itemClasses = clsx(
    'p-4 cursor-pointer border-l-4 transition-colors duration-150',
    {
      'bg-blue-50 border-blue-600': isSelected,
      'border-transparent hover:bg-gray-50': !isSelected,
    }
  );

  return (
    <div className={itemClasses} onClick={() => onClick(course)}>
      <h3 className="font-semibold text-gray-800 truncate">{getCourseTitle(course)}</h3>
      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Book className="w-3 h-3" />
          <span>{course.lesson_count || 0} Lecciones</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{course.student_count || 0} Estudiantes</span>
        </div>
      </div>
    </div>
  );
};

export default CourseListItem;
