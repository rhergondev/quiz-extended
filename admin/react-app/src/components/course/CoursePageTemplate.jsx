import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useOutletContext();

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}>
      <CourseSidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden min-h-0">
        {/* Page Content */}
        <main className="flex-1 w-full h-full overflow-hidden min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CoursePageTemplate;
