import React, { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Clock,
  Video,
  FileText,
  HelpCircle,
  Users,
  Lock,
  Unlock,
  Play,
  BookOpen,
  Calendar,
  User
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de una lección
 * Ahora usa el componente Card genérico
 * 
 * @param {Object} props
 * @param {Object} props.lesson - Datos de la lección
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEdit] - Callback para editar lección
 * @param {Function} [props.onDelete] - Callback para eliminar lección
 * @param {Function} [props.onDuplicate] - Callback para duplicar lección
 * @param {Array} [props.courses] - Lista de cursos disponibles
 * @param {boolean} [props.showCourse=true] - Si mostrar información del curso
 * @param {string} [props.className] - Clases CSS adicionales
 */
const LessonCard = ({
  lesson,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  courses = [],
  showCourse = true,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const lessonType = lesson.meta?._lesson_type || 'text';
  const contentType = lesson.meta?._content_type || 'free';
  const duration = parseInt(lesson.meta?._duration_minutes || '0');
  const courseId = lesson.meta?._course_id;
  const hasQuiz = lesson.meta?._has_quiz === 'yes' || lesson.meta?._lesson_type === 'quiz';
  const videoUrl = lesson.meta?._video_url;
  
  // Buscar el curso asociado
  const associatedCourse = useMemo(() => {
    if (!courseId || !courses.length) return null;
    
    return courses.find(course => 
      course.id.toString() === courseId.toString() ||
      course.id === parseInt(courseId, 10)
    );
  }, [courseId, courses]);
  
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return Video;
      case 'quiz':
        return HelpCircle;
      case 'text':
      default:
        return FileText;
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'premium':
        return Lock;
      case 'free':
      default:
        return Unlock;
    }
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
  ].filter(action => action.onClick); // Solo mostrar acciones que tienen callback

  // --- RENDER HELPERS ---
  const TypeIcon = getTypeIcon(lessonType);
  const ContentIcon = getContentTypeIcon(contentType);

  const renderCardContent = () => (
    <>
      {/* Header con tipo y estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <TypeIcon className="h-4 w-4" />
            <span className="capitalize">{lessonType}</span>
          </div>
          {hasQuiz && (
            <div className="flex items-center space-x-1 text-sm text-purple-600">
              <HelpCircle className="h-3 w-3" />
              <span>Quiz</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <ContentIcon className="h-4 w-4 text-gray-400" />
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lesson.status)}`}>
            {lesson.status === 'publish' ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Published
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                {lesson.status}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {lesson.title?.rendered || lesson.title || 'Untitled Lesson'}
      </h3>

      {/* Descripción */}
      {lesson.excerpt?.rendered && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {lesson.excerpt.rendered.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {/* Metadatos */}
      <div className="space-y-2">
        {/* Duración y URL de video */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          {duration > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{duration} min</span>
            </div>
          )}
          {videoUrl && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Play className="h-4 w-4" />
              <span>Video</span>
            </div>
          )}
        </div>

        {/* Información del curso */}
        {showCourse && associatedCourse && (
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <BookOpen className="h-4 w-4" />
            <span className="truncate">{associatedCourse.title}</span>
          </div>
        )}

        {/* Fecha de modificación */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(lesson.modified).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>ID: {lesson.id}</span>
          </div>
        </div>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Icono de tipo */}
      <div className="flex-shrink-0 mr-4">
        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <TypeIcon className="h-5 w-5 text-gray-600" />
        </div>
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {lesson.title?.rendered || lesson.title || 'Untitled Lesson'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            {hasQuiz && (
              <HelpCircle className="h-4 w-4 text-purple-500" />
            )}
            <ContentIcon className="h-4 w-4 text-gray-400" />
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lesson.status)}`}>
              {lesson.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          {showCourse && associatedCourse && (
            <span className="truncate">
              {associatedCourse.title}
            </span>
          )}
          {duration > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{duration}m</span>
            </div>
          )}
          <span>
            {new Date(lesson.modified).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      item={lesson}
      viewMode={viewMode}
      actions={actions}
      className={className}
      clickable={false}
    >
      {viewMode === 'cards' ? renderCardContent() : renderListContent()}
    </Card>
  );
};

export default LessonCard;