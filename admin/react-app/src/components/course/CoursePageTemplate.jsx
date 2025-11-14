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
        {/* Breadcrumbs Header */}
        <header className="px-6 py-3 border-b flex-shrink-0" style={{ borderBottomColor: `${getColor('primary', '#1a202c')}20`, borderBottomWidth: '1px' }}>
          <nav className="flex items-center text-sm space-x-2">
            <Link 
              to="/courses"
              className="transition-colors duration-200 hover:underline"
              style={{ color: getColor('primary', '#1a202c') }}
            >
              {t('sidebar.studyPlanner')}
            </Link>
            
            <ChevronRight size={16} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
            
            <Link 
              to={`/courses/${courseId}/dashboard`}
              className="transition-colors duration-200 hover:underline"
              style={{ color: getColor('primary', '#1a202c') }}
              dangerouslySetInnerHTML={{ __html: courseName }}
            />
            
            <ChevronRight size={16} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
            
            <span 
              className="font-medium"
              style={{ color: getColor('primary', '#1a202c') }}
            >
              {sectionName}
            </span>
          </nav>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CoursePageTemplate;
