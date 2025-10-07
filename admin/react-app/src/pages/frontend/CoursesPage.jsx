import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox } from 'lucide-react';
import useCourses from '../../hooks/useCourses';
import CourseCard from '../../components/frontend/CourseCard';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  return (
    // CAMBIO: Contenedor único con fondo gris claro y padding reducido para ocupar más espacio.
    <div className="bg-gray-100 p-4 h-[97vh] w-full overflow-y-auto">
      
      {/* La cabecera ya no necesita su propio fondo, pero le añadimos un borde inferior para separar. */}
      <header className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('courses.title')}
        </h1>
      </header>
      
      {/* El contenido principal (tarjetas) va dentro del mismo contenedor gris. */}
      <main>
        {renderContent()}
      </main>

    </div>
  );
};

export default CoursesPage;