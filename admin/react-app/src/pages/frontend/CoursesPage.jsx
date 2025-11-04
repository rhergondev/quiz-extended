import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox } from 'lucide-react';
import useCourses from '../../hooks/useCourses';
import CompactCourseCard from '../../components/frontend/CompactCourseCard';

const PageState = ({ icon: Icon, title, message }) => (
  <div className="text-center py-16">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
  </div>
);

const CoursesPage = () => {
  const { t } = useTranslation();
  const { courses, loading, error } = useCourses({ 
    autoFetch: true,
    _embed: true 
  });

  const renderContent = () => {
    if (loading && courses.length === 0) {
      return <PageState icon={Loader} title={t('courses.loadingCourses')} message={t('common.processing')} />;
    }
  
    if (error) {
      return <PageState icon={AlertTriangle} title={t('notifications.error')} message={error} />;
    }
    
    if (!courses || courses.length === 0) {
      return <PageState icon={Inbox} title={t('courses.noCourses')} message={t('courses.noCoursesDescription')} />;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map(course => (
          <CompactCourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  return (
    // Contenedor con fondo y scroll vertical
    <div className="qe-bg-primary-light p-6 h-[97vh] w-full overflow-y-auto">
      
      {/* Cabecera */}
      <header className="border-b qe-border-primary pb-4 mb-8">
        <h1 className="text-3xl font-bold qe-text-primary">
          {t('courses.title')}
        </h1>
        <p className="qe-text-secondary mt-2">
          Gestiona tu progreso y accede rápidamente a tus lecciones
        </p>
      </header>
      
      {/* Contenido principal */}
      <main>
        {renderContent()}
      </main>

    </div>
  );
};

export default CoursesPage;