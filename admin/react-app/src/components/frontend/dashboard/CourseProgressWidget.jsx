import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourses from '../../../hooks/useCourses';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useLessons from '../../../hooks/useLessons';
import { isUserAdmin } from '../../../utils/userUtils';

// Componente separado para cada curso que usa el hook correctamente
const CourseProgressItem = ({ course }) => {
  const { completedItems } = useStudentProgress(course.id, true);
  const { lessons } = useLessons({ 
    courseId: course.id, 
    autoFetch: true,
    perPage: 100
  });
  
  const imageUrl = course._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const title = course.title?.rendered || course.title || 'Curso sin título';
  
  // Calcular progreso igual que en CourseProgressCard
  const totalLessons = lessons?.length || 0;
  const completedLessons = completedItems?.filter(item => item.content_type === 'lesson')?.length || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary hover:shadow-lg transition-all">
      <div className="flex items-center gap-3">
        {/* Image */}
        <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--qe-primary)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 
            className="text-sm font-semibold qe-text-primary truncate mb-1"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 qe-bg-card rounded-full h-2 overflow-hidden">
              <div 
                className="h-full transition-all duration-500 rounded-full"
                style={{ 
                  width: `${progressPercent}%`,
                  backgroundColor: 'var(--qe-primary)'
                }}
              />
            </div>
            <span className="text-xs font-medium qe-text-primary whitespace-nowrap">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Link
          to={`/courses/${course.id}`}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all flex-shrink-0"
          style={{ backgroundColor: 'var(--qe-primary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
          }}
        >
          {progressPercent > 0 ? 'Continuar' : 'Comenzar'}
        </Link>
      </div>
    </div>
  );
};

const CourseProgressWidget = () => {
  const { getColor } = useTheme();
  
  // 🎯 Check if user is admin to determine if we should filter by enrollment
  const userIsAdmin = isUserAdmin();
  
  const { courses, loading, error } = useCourses({ 
    autoFetch: true,
    embed: true,
    perPage: 3, // Solo mostrar 3 cursos más recientes
    status: 'publish', // 🎯 Frontend: solo cursos publicados
    enrolledOnly: !userIsAdmin // 🎯 Solo mostrar cursos matriculados si NO es admin
  });

  if (error) {
    return (
      <div 
        className="rounded-xl shadow-lg border-2 p-6" 
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
          borderColor: getColor('primary', '#3b82f6')
        }}
      >
        <p className="text-sm qe-text-error">Error al cargar cursos</p>
      </div>
    );
  }

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2 h-full flex flex-col" 
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
          <h2 className="text-xl font-bold qe-text-primary">Mis Cursos</h2>
        </div>

        <Link
          to="/courses"
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all"
          style={{ backgroundColor: getColor('primary', '#3b82f6') }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6');
          }}
        >
          Ver todos
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && courses.length === 0 ? (
          <div className="text-center py-8 qe-text-secondary">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
              style={{ borderColor: getColor('primary', '#3b82f6') }}
            ></div>
            <p className="text-sm">Cargando cursos...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 qe-text-secondary mx-auto mb-3 opacity-30" />
            <p className="text-sm qe-text-secondary">No estás inscrito en ningún curso</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <CourseProgressItem key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseProgressWidget;
