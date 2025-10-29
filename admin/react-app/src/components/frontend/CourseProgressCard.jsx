import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Circle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import useLessons from '../../hooks/useLessons';
import useStudentProgress from '../../hooks/useStudentProgress';
import useQuizAttempts from '../../hooks/useQuizAttempts';

const CourseProgressCard = ({ course }) => {
  const { id, title, excerpt, _embedded } = course;
  const [showLessons, setShowLessons] = useState(false);
  
  // Hooks para datos
  const { lessons, loading: lessonsLoading } = useLessons({ 
    courseId: id, 
    autoFetch: true,
    perPage: 100
  });
  
  const { 
    progress, 
    completedItems, 
    markComplete, 
    isCompleted,
    loading: progressLoading 
  } = useStudentProgress(id, true);

  const { attempts, loading: attemptsLoading } = useQuizAttempts({
    autoFetch: true
  });

  // Calcular estadísticas
  const imageUrl = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const renderedTitle = title?.rendered || title || 'Curso sin título';
  const renderedExcerpt = (excerpt?.rendered || excerpt || '').replace(/<[^>]+>/g, '');
  
  // Progreso de lecciones - CORREGIDO
  const totalLessons = lessons?.length || 0;
  const completedLessons = completedItems?.filter(item => item.content_type === 'lesson')?.length || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Nota media de cuestionarios - CORREGIDO: Filtrar por courseId
  const courseAttempts = attempts?.filter(a => 
    a.course_id === id && 
    a.score_with_risk !== undefined && 
    a.score_with_risk !== null &&
    !isNaN(a.score_with_risk)
  ) || [];
  
  console.log(`📊 Course ${id} attempts:`, {
    allAttempts: attempts?.length,
    courseAttempts: courseAttempts.length,
    scores: courseAttempts.map(a => a.score_with_risk)
  });

  const averageScore = courseAttempts.length > 0 
    ? Math.round(courseAttempts.reduce((sum, attempt) => sum + Number(attempt.score_with_risk), 0) / courseAttempts.length)
    : null;

  // Handler para marcar lección
  const handleToggleLesson = async (lessonId, e) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (isCompleted(lessonId, 'lesson')) {
        console.log('Lesson already completed:', lessonId);
      } else {
        await markComplete(lessonId, 'lesson');
      }
    } catch (error) {
      console.error('Error toggling lesson:', error);
    }
  };

  return (
    <div className="bg-white shadow-lg overflow-visible hover:shadow-2xl transition-all duration-300">
      {/* Tarjeta principal - Altura fija 1/3 viewport */}
      <div className="flex flex-col lg:flex-row lg:h-[33vh]">
        {/* Sección izquierda: Imagen del curso (clickeable) */}
        <Link 
          to={`/courses/${id}`}
          className="lg:w-1/3 flex-shrink-0 relative overflow-hidden group h-48 lg:h-full"
        >
          <div className="w-full h-full">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={renderedTitle}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-white opacity-50" />
              </div>
            )}
          </div>
          {/* Overlay con título en hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
            <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 text-center">
              Ver Curso Completo
            </span>
          </div>
        </Link>

        {/* Sección derecha: Información y progreso */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          {/* Título y descripción */}
          <div className="mb-3">
            <h3 
              className="text-xl font-bold text-gray-900 mb-1 line-clamp-1"
              dangerouslySetInnerHTML={{ __html: renderedTitle }}
            />
            {renderedExcerpt && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {renderedExcerpt}
              </p>
            )}
          </div>

          {/* Barra de progreso y estadísticas */}
          <div className="mb-3 space-y-2">
            {/* Progreso general */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Progreso del curso</span>
                <span className="text-xs font-bold text-primary">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                <span>{completedLessons} de {totalLessons} lecciones completadas</span>
              </div>
            </div>

            {/* Nota media */}
            {averageScore !== null && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Nota media:</span>
                <span className={`font-bold ${averageScore >= 70 ? 'text-green-600' : averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {averageScore}%
                </span>
                <span className="text-gray-500">({courseAttempts.length} {courseAttempts.length === 1 ? 'intento' : 'intentos'})</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLessons(!showLessons)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-sm font-medium text-gray-700"
            >
              {showLessons ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Ocultar lecciones
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Ver lecciones
                </>
              )}
            </button>

            <Link
              to={`/courses/${id}`}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 text-center shadow-md hover:shadow-lg text-sm"
            >
              {progressPercentage > 0 ? 'Continuar' : 'Comenzar'}
            </Link>
          </div>
        </div>
      </div>

      {/* Lista de lecciones EXPANDIBLE (fuera de la tarjeta principal) */}
      {showLessons && (
        <div className="border-t border-gray-200 bg-gray-50 animate-slideDown">
          <div className="p-4">
            {lessonsLoading ? (
              <div className="py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Cargando lecciones...</p>
              </div>
            ) : lessons && lessons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {lessons.map((lesson) => {
                  const completed = isCompleted(lesson.id, 'lesson');
                  return (
                    <div 
                      key={lesson.id}
                      className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-150 flex items-center gap-3"
                    >
                      <button
                        onClick={(e) => handleToggleLesson(lesson.id, e)}
                        className="flex-shrink-0 transition-transform hover:scale-110"
                        disabled={progressLoading}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                        )}
                      </button>
                      <Link
                        to={`/courses/${id}`}
                        className="flex-1 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <span 
                          className={completed ? 'line-through text-gray-500' : ''}
                          dangerouslySetInnerHTML={{ 
                            __html: lesson.title?.rendered || lesson.title || 'Sin título' 
                          }}
                        />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm">
                No hay lecciones disponibles
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseProgressCard;

