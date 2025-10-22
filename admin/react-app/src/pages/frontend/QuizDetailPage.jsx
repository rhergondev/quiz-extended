import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  Target,
  Play,
  ChevronLeft,
  Info,
  Award
} from 'lucide-react';

// Hooks
import { useQuizzes } from '../../hooks/useQuizzes';
import useCourses from '../../hooks/useCourses';
import useLessons from '../../hooks/useLessons';

// Components
import Quiz from '../../components/frontend/Quiz';

const QuizDetailPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const { quizzes, loading: quizzesLoading } = useQuizzes({ perPage: 100 });
  const { courses, loading: coursesLoading } = useCourses({ perPage: 100 });
  const { lessons, loading: lessonsLoading } = useLessons({ perPage: 100 });

  useEffect(() => {
    if (quizzes.length > 0 && quizId) {
      const quiz = quizzes.find(q => q.id === parseInt(quizId));
      setSelectedQuiz(quiz);
    }
  }, [quizzes, quizId]);

  const loading = quizzesLoading || coursesLoading || lessonsLoading;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando cuestionario...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedQuiz) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Cuestionario no encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              El cuestionario que buscas no existe o ha sido eliminado.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si ya empezó el quiz, mostrar el componente Quiz
  if (hasStarted) {
    return <Quiz quizId={selectedQuiz.id} />;
  }

  // Obtener información del curso y lección
  const quizLessonIds = selectedQuiz.meta?._lesson_ids || [];
  const relatedLessons = lessons.filter(l => quizLessonIds.includes(l.id));
  
  const relatedCourses = courses.filter(c => {
    return relatedLessons.some(lesson => {
      const lessonCourseIds = lesson.meta?._course_ids || [];
      return lessonCourseIds.includes(c.id);
    });
  });

  const questionCount = selectedQuiz.meta?._quiz_question_ids?.length || 0;
  const timeLimit = selectedQuiz.meta?._time_limit || 0;
  const passingScore = selectedQuiz.meta?._passing_score || 0;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Botón de volver */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver al Dashboard
        </button>

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">
                  {selectedQuiz.title?.rendered || selectedQuiz.title}
                </h1>
                
                {/* Breadcrumb de curso y lección */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-100">
                  {relatedCourses.map((course, idx) => (
                    <React.Fragment key={course.id}>
                      {idx > 0 && <span>•</span>}
                      <span className="bg-white/10 px-2 py-1 rounded">
                        {course.title?.rendered || course.title}
                      </span>
                    </React.Fragment>
                  ))}
                  {relatedLessons.length > 0 && <span>›</span>}
                  {relatedLessons.map((lesson, idx) => (
                    <React.Fragment key={lesson.id}>
                      {idx > 0 && <span>•</span>}
                      <span className="bg-white/10 px-2 py-1 rounded">
                        {lesson.title?.rendered || lesson.title}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8">
            {/* Estadísticas del quiz */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Preguntas</p>
                    <p className="text-2xl font-bold text-blue-900">{questionCount}</p>
                  </div>
                </div>
              </div>

              {timeLimit > 0 && (
                <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-700 font-medium">Tiempo Límite</p>
                      <p className="text-2xl font-bold text-orange-900">{timeLimit} min</p>
                    </div>
                  </div>
                </div>
              )}

              {passingScore > 0 && (
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">Puntuación Mínima</p>
                      <p className="text-2xl font-bold text-green-900">{passingScore}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción (si existe) */}
            {selectedQuiz.content?.rendered && (
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Descripción del Cuestionario
                    </h3>
                    <div 
                      className="text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedQuiz.content.rendered }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Instrucciones */}
            <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-start space-x-3">
                <Award className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                    Instrucciones
                  </h3>
                  <ul className="text-sm text-indigo-800 space-y-2">
                    <li>• Lee cada pregunta cuidadosamente antes de responder</li>
                    <li>• Selecciona la opción que consideres correcta</li>
                    {timeLimit > 0 && (
                      <li>• El cuestionario tiene un límite de tiempo de {timeLimit} minutos</li>
                    )}
                    <li>• Puedes marcar preguntas con riesgo si no estás seguro</li>
                    <li>• Revisa tus respuestas antes de enviar el cuestionario</li>
                    {passingScore > 0 && (
                      <li>• Necesitas obtener al menos {passingScore}% para aprobar</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Botón de inicio */}
            <div className="flex justify-center">
              <button
                onClick={() => setHasStarted(true)}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Play className="w-6 h-6 mr-2" />
                Comenzar Cuestionario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizDetailPage;
