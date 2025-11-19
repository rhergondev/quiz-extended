import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronRight } from 'lucide-react';
import CourseSidebar from './CourseSidebar';

/**
 * Template para páginas de curso con breadcrumbs
 * @param {Object} props
 * @param {string} props.courseId - ID del curso
 * @param {string} props.courseName - Nombre del curso
 * @param {string} props.sectionName - Nombre de la sección actual
 * @param {React.ReactNode} props.children - Contenido de la página
 */
const CoursePageTemplate = ({ courseId, courseName, sectionName, children }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();

  return (
    <div className="flex h-full w-full overflow-hidden">
      <CourseSidebar />
      <div 
        className="flex-1 flex flex-col h-full w-full overflow-hidden"
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
        {/* Page Content - Sin breadcrumbs header */}
        <main className="flex-1 w-full h-full overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CoursePageTemplate;
