import React, { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  HelpCircle,
  BookOpen,
  Calendar,
  BarChart3,
  Target,
  Zap,
  AlertCircle
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de una pregunta
 * Usa el componente Card genérico
 * 
 * @param {Object} props
 * @param {Object} props.question - Datos de la pregunta
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEdit] - Callback para editar pregunta
 * @param {Function} [props.onDelete] - Callback para eliminar pregunta
 * @param {Function} [props.onDuplicate] - Callback para duplicar pregunta
 * @param {Function} [props.onClick] - Callback para hacer click en la pregunta
 * @param {Array} [props.quizzes] - Lista de quizzes disponibles
 * @param {boolean} [props.showQuiz=true] - Si mostrar información del quiz asociado
 * @param {boolean} [props.showStats=true] - Si mostrar estadísticas
 * @param {string} [props.className] - Clases CSS adicionales
 */
const QuestionCard = ({
  question,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  quizzes = [],
  showQuiz = true,
  showStats = true,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const questionType = question.meta?._question_type || 'multiple_choice';
  const difficulty = question.meta?._difficulty_level || 'medium';
  const points = parseInt(question.meta?._points || '1');
  const timeLimit = parseInt(question.meta?._time_limit || '0');
  const quizId = question.meta?._quiz_id;
  const category = question.meta?._question_category;
  const explanation = question.meta?._explanation;
  
  // Buscar el quiz asociado
  const associatedQuiz = useMemo(() => {
    if (!quizId || !quizzes.length) return null;
    
    return quizzes.find(quiz => 
      quiz.id.toString() === quizId.toString() ||
      quiz.id === parseInt(quizId, 10)
    );
  }, [quizId, quizzes]);

  // Calcular estadísticas de la pregunta (datos simulados - vendrían de la API)
  const questionStats = {
    timesAsked: Math.floor(Math.random() * 100) + 1,
    correctAnswers: Math.floor(Math.random() * 80) + 10,
    averageTime: Math.floor(Math.random() * 30) + 10, // segundos
    difficultyScore: Math.random() * 5 + 1
  };

  const successRate = questionStats.timesAsked > 0 
    ? Math.round((questionStats.correctAnswers / questionStats.timesAsked) * 100)
    : 0;
  
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'multiple_choice':
        return CheckCircle;
      case 'true_false':
        return Target;
      case 'short_answer':
        return Edit;
      case 'essay':
        return BookOpen;
      case 'fill_blank':
        return Hash;
      default:
        return HelpCircle;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'short_answer':
        return 'Short Answer';
      case 'essay':
        return 'Essay';
      case 'fill_blank':
        return 'Fill in Blank';
      default:
        return 'Question';
    }
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
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
      label: 'Duplicate',
      icon: Copy,
      onClick: onDuplicate,
      color: 'text-green-600'
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
  const TypeIcon = getTypeIcon(questionType);

  const renderCardContent = () => (
    <>
      {/* Header con tipo y estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-blue-600">
            <TypeIcon className="h-4 w-4" />
            <span>{getTypeLabel(questionType)}</span>
          </div>
          {category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {category}
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
        
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(question.status)}`}>
          {question.status === 'publish' ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Published
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              {question.status}
            </>
          )}
        </span>
      </div>

      {/* Título/Pregunta */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-3">
        {question.title?.rendered || question.title || 'Untitled Question'}
      </h3>

      {/* Quiz asociado */}
      {showQuiz && associatedQuiz && (
        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
          <BookOpen className="h-4 w-4" />
          <span className="truncate">
            Quiz: {associatedQuiz.title?.rendered || associatedQuiz.title}
          </span>
        </div>
      )}

      {/* Explicación */}
      {explanation && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {explanation}
        </p>
      )}

      {/* Metadatos */}
      <div className="space-y-3">
        {/* Puntos y tiempo */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span>{points} point{points !== 1 ? 's' : ''}</span>
            </div>
            {timeLimit > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{timeLimit}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        {showStats && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <BarChart3 className="h-4 w-4" />
              <span>{questionStats.timesAsked} attempts</span>
            </div>
            <div className={`flex items-center space-x-1 ${getSuccessRateColor(successRate)}`}>
              <Target className="h-4 w-4" />
              <span>{successRate}% success</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{questionStats.averageTime}s avg</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <AlertCircle className="h-4 w-4" />
              <span>{questionStats.difficultyScore.toFixed(1)}/5</span>
            </div>
          </div>
        )}

        {/* Fecha de modificación */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
          <span>Modified {formatDate(question.modified)}</span>
          <span>ID: {question.id}</span>
        </div>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Icono de tipo */}
      <div className="flex-shrink-0 mr-4">
        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <TypeIcon className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {question.title?.rendered || question.title || 'Untitled Question'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
            {showStats && (
              <span className={`text-xs font-medium ${getSuccessRateColor(successRate)}`}>
                {successRate}%
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(question.status)}`}>
              {question.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span>{getTypeLabel(questionType)}</span>
          {showQuiz && associatedQuiz && (
            <span className="truncate">
              {associatedQuiz.title?.rendered || associatedQuiz.title}
            </span>
          )}
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>{points}pt</span>
          </div>
          {timeLimit > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{timeLimit}s</span>
            </div>
          )}
          <span>
            {formatDate(question.modified)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      item={question}
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

export default QuestionCard;