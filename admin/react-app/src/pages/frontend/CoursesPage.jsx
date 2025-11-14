import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useCourses from '../../hooks/useCourses';
import CompactCourseCard from '../../components/frontend/CompactCourseCard';
import { isUserAdmin } from '../../utils/userUtils';

const PageState = ({ icon: Icon, title, message }) => (
  <div className="text-center py-16">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
  </div>
);

const CoursesPage = () => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const userIsAdmin = isUserAdmin();
  
  const { courses, loading, error } = useCourses({ 
    autoFetch: true,
    embed: true,
    status: 'publish',
    enrolledOnly: !userIsAdmin
  });

  const sortedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    
    return [...courses].sort((a, b) => {
      const positionA = parseInt(a.meta?._course_position) || 0;
      const positionB = parseInt(b.meta?._course_position) || 0;
      
      if (positionA !== positionB) {
        return positionA - positionB;
      }
      
      const titleA = (a.title?.rendered || a.title || '').toLowerCase();
      const titleB = (b.title?.rendered || b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [courses]);

  const renderContent = () => {
    if (loading && sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Loader} 
          title={t('courses.loadingCourses')} 
          message={t('common.processing')} 
        />
      );
    }
  
    if (error) {
      return (
        <PageState 
          icon={AlertTriangle} 
          title={t('notifications.error')} 
          message={error} 
        />
      );
    }
    
    if (!sortedCourses || sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Inbox} 
          title={t('courses.noCourses')} 
          message={t('courses.noCoursesDescription')} 
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {sortedCourses.map(course => (
          <CompactCourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  return (
    <div 
      className="p-6 min-h-full w-full overflow-y-auto" 
      style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
    >
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default CoursesPage;