import React, { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Clock,
  Users,
  HelpCircle,
  Trophy,
  BarChart3,
  Calendar,
  BookOpen,
  Target,
  Zap,
  Play,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de un quiz
 * Usa el componente Card genérico
 * 
 * @param {Object} props
 * @param {Object} props.quiz - Datos del quiz
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEdit] - Callback para editar quiz
 * @param {Function} [props.onDelete] - Callback para eliminar quiz
 * @param {Function} [props.onDuplicate] - Callback para duplicar quiz
 * @param {Function} [props.onClick] - Callback para hacer click en el quiz
 * @param {Array} [props.courses] - Lista de cursos disponibles
 * @param {boolean} [props.showCourse=true] - Si mostrar información del curso
 * @param {boolean} [props.showStats=true] - Si mostrar estadísticas
 * @param {string} [props.className] - Clases CSS adicionales
 */
const QuizCard = ({
  quiz,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  courses = [],
  showCourse = true,
  showStats = true,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const timeLimit = parseInt(quiz.meta?._time_limit || '0');
  const maxAttempts = parseInt(quiz.meta?._max_attempts || '0');
  const passingScore = parseInt(quiz.meta?._passing_score || '70');
  const randomizeQuestions = quiz.meta?._randomize_questions === 'yes';
  const showResults = quiz.meta?._show_results === 'yes';
  const courseId = quiz.meta?._course_id;
  const category = quiz.meta?._quiz_category;
  const difficulty = quiz.meta?._difficulty_level || 'medium';
  
  // Buscar el curso asociado
  const associatedCourse = useMemo(() => {
    if (!courseId || !courses.length) return null;
    
    return courses.find(course => 
      course.id.toString() === courseId.toString() ||
      course.id === parseInt(courseId, 10)
    );
  }, [courseId, courses]);

  // Calcular estadísticas del quiz (datos simulados - vendrían de la API)
  const quizStats = {
    totalQuestions: Math.floor(Math.random() * 20) + 5,
    totalAttempts: Math.floor(Math.random() * 200) + 10,
    averageScore: Math.floor(Math.random() * 30) + 70, // 70-100%
    completionRate: Math.floor(Math.random() * 40) + 60, // 60-100%
    averageTime: Math.floor(Math.random() * 25) + 5, // 5-30 minutes
    passRate: Math.floor(Math.random() * 40) + 60 // 60-100%
  };
  
  // --- UTILITY FUNCTIONS ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'publish':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-yellow-600 bg-yellow-100';
      case 'private':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  // --- ACTIONS ---
  const actions = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: onEdit,
      color: 'text-blue-600'
    },
    {
      label: 'Preview',
      icon: Play,
      onClick: (quiz) => console.log('Preview quiz:', quiz),
      color: 'text-green-600'
    },
    {
      label: 'Duplicate',
      icon: Copy,
      onClick: onDuplicate,
      color: 'text-purple-600'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
      color: 'text-red-600',
      divider: true
    }
  ].filter(action => action.onClick);

  // --- RENDER HELPERS ---
  const renderCardContent = () => (
    <>
      {/* Header con categoría y estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-indigo-600">
            <HelpCircle className="h-4 w-4" />
            <span>Quiz</span>
          </div>
          {category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {category}
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
        
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
          {quiz.status === 'publish' ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Published
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              {quiz.status}
            </>
          )}
        </span>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {quiz.title?.rendered || quiz.title || 'Untitled Quiz'}
      </h3>

      {/* Descripción */}
      {quiz.excerpt?.rendered && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {quiz.excerpt.rendered.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {/* Curso asociado */}
      {showCourse && associatedCourse && (
        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
          <BookOpen className="h-4 w-4" />
          <span className="truncate">
            Course: {associatedCourse.title?.rendered || associatedCourse.title}
          </span>
        </div>
      )}

      {/* Configuración del quiz */}
      <div className="space-y-3">
        {/* Configuración básica */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-1 text-gray-600">
            <HelpCircle className="h-4 w-4" />
            <span>{quizStats.totalQuestions} questions</span>
          </div>
          {timeLimit > 0 && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeLimit)}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-gray-600">
            <Target className="h-4 w-4" />
            <span>{passingScore}% to pass</span>
          </div>
          {maxAttempts > 0 && (
            <div className="flex items-center space-x-1 text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>{maxAttempts} attempts</span>
            </div>
          )}
        </div>

        {/* Características especiales */}
        <div className="flex flex-wrap gap-2">
          {randomizeQuestions && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Zap className="h-3 w-3 mr-1" />
              Randomized
            </span>
          )}
          {showResults && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Shows Results
            </span>
          )}
        </div>

        {/* Estadísticas */}
        {showStats && (
          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1 text-gray-500">
              <Users className="h-4 w-4" />
              <span>{quizStats.totalAttempts} attempts</span>
            </div>
            <div className={`flex items-center space-x-1 ${getScoreColor(quizStats.averageScore)}`}>
              <Trophy className="h-4 w-4" />
              <span>{quizStats.averageScore}% avg</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{quizStats.averageTime}m avg time</span>
            </div>
            <div className={`flex items-center space-x-1 ${getScoreColor(quizStats.passRate)}`}>
              <TrendingUp className="h-4 w-4" />
              <span>{quizStats.passRate}% pass</span>
            </div>
          </div>
        )}

        {/* Fecha de modificación */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
          <span>Modified {formatDate(quiz.modified)}</span>
          <span>ID: {quiz.id}</span>
        </div>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Icono de quiz */}
      <div className="flex-shrink-0 mr-4">
        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {quiz.title?.rendered || quiz.title || 'Untitled Quiz'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
            {showStats && (
              <span className={`text-xs font-medium ${getScoreColor(quizStats.averageScore)}`}>
                {quizStats.averageScore}%
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
              {quiz.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <HelpCircle className="h-3 w-3" />
            <span>{quizStats.totalQuestions}q</span>
          </div>
          {timeLimit > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(timeLimit)}</span>
            </div>
          )}
          {showCourse && associatedCourse && (
            <span className="truncate">
              {associatedCourse.title?.rendered || associatedCourse.title}
            </span>
          )}
          {showStats && (
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{quizStats.totalAttempts}</span>
            </div>
          )}
          <span>
            {formatDate(quiz.modified)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      item={quiz}
      viewMode={viewMode}
      actions={actions}
      className={className}
      clickable={!!onClick}
      onClick={onClick}
    >
      {viewMode === 'cards' ? renderCardContent() : renderListContent()}
    </Card>
  );
};

export default QuizCard;