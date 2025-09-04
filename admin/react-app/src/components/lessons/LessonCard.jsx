import React, { useState, useMemo } from 'react';
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
  MoreHorizontal,
  Play,
  BookOpen,
  Calendar,
  User
} from 'lucide-react';

/**
 * Componente de tarjeta para mostrar información de una lección
 * Soporta vista de tarjeta y vista de lista
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
  // --- STATE ---
  const [showDropdown, setShowDropdown] = useState(false);

  // --- COMPUTED VALUES ---
  const lessonType = lesson.meta?._lesson_type || 'text';
  const contentType = lesson.meta?._content_type || 'free';
  const duration = parseInt(lesson.meta?._duration_minutes || '0');
  const courseId = lesson.meta?._course_id;
  const hasQuiz = lesson.meta?._has_quiz === 'yes' || lesson.meta?._lesson_type === 'quiz';
  const videoUrl = lesson.meta?._video_url;
  
  // FIX: Mejorar la búsqueda del curso asociado
  const associatedCourse = useMemo(() => {
    if (!courseId || !courses.length) return null;
    
    // Intentar buscar por ID como string y como número
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'publish':
        return <Eye className="h-4 w-4" />;
      case 'draft':
        return <EyeOff className="h-4 w-4" />;
      case 'private':
        return <Lock className="h-4 w-4" />;
      default:
        return <EyeOff className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4 text-orange-500" />;
      case 'text':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'assignment':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // --- EVENT HANDLERS ---
  const handleDropdownToggle = (event) => {
    event.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleAction = (action, event) => {
    event.stopPropagation();
    setShowDropdown(false);
    
    switch (action) {
      case 'edit':
        onEdit?.(lesson);
        break;
      case 'delete':
        onDelete?.(lesson);
        break;
      case 'duplicate':
        onDuplicate?.(lesson);
        break;
      default:
        break;
    }
  };

  // Cerrar dropdown cuando se hace click fuera
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // --- RENDER LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Tipo de lección */}
            <div className="flex-shrink-0">
              {getTypeIcon(lessonType)}
            </div>

            {/* Información principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {lesson.title?.rendered || lesson.title}
                </h3>
                
                {/* Estado */}
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lesson.status)}`}>
                  {getStatusIcon(lesson.status)}
                  <span className="ml-1 capitalize">{lesson.status}</span>
                </span>

                {/* Tipo de contenido */}
                {contentType === 'premium' ? (
                  <Lock className="h-4 w-4 text-purple-500" />
                ) : (
                  <Unlock className="h-4 w-4 text-green-500" />
                )}
              </div>

              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                {/* Curso */}
                {showCourse && associatedCourse && (
                  <span className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {associatedCourse.title?.rendered || associatedCourse.title}
                  </span>
                )}

                {/* Duración */}
                {duration > 0 && (
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(duration)}
                  </span>
                )}

                {/* Quiz indicator */}
                {hasQuiz && (
                  <span className="flex items-center text-orange-600">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Has Quiz
                  </span>
                )}

                {/* Fecha de modificación */}
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(lesson.modified)}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex-shrink-0 relative">
            <button
              onClick={handleDropdownToggle}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => handleAction('edit', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Lesson
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => handleAction('duplicate', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => handleAction('delete', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER CARD VIEW ---
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* Header con tipo de lección y acciones */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(lessonType)}
            <span className="text-sm font-medium text-gray-600 capitalize">
              {lessonType}
            </span>
            {contentType === 'premium' && (
              <Lock className="h-4 w-4 text-purple-500" />
            )}
          </div>

          {/* Dropdown de acciones */}
          <div className="relative">
            <button
              onClick={handleDropdownToggle}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => handleAction('edit', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Lesson
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => handleAction('duplicate', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => handleAction('delete', e)}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail o placeholder */}
      <div className="aspect-video bg-gray-100 flex items-center justify-center border-t border-b border-gray-200">
        {lessonType === 'video' && videoUrl ? (
          <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Play className="h-12 w-12 text-white opacity-80" />
            <div className="absolute bottom-2 right-2">
              <Video className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <div className="text-gray-400">
            {getTypeIcon(lessonType)}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        {/* Título */}
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
          {lesson.title?.rendered || lesson.title}
        </h3>

        {/* Curso asociado */}
        {showCourse && associatedCourse && (
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <BookOpen className="h-3 w-3 mr-1" />
            <span className="truncate">
              {associatedCourse.title?.rendered || associatedCourse.title}
            </span>
          </div>
        )}

        {/* Excerpt o contenido */}
        {lesson.excerpt?.rendered && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {lesson.excerpt.rendered.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            {/* Duración y quiz */}
            <div className="flex items-center space-x-3">
              {duration > 0 && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(duration)}
                </div>
              )}
              {hasQuiz && (
                <div className="flex items-center text-orange-600">
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Quiz
                </div>
              )}
            </div>

            {/* Estado */}
            <div className={`flex items-center px-2 py-1 rounded-full ${getStatusColor(lesson.status)}`}>
              {getStatusIcon(lesson.status)}
              <span className="ml-1 text-xs font-medium capitalize">
                {lesson.status}
              </span>
            </div>
          </div>

          {/* Fecha de modificación */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Modified {formatDate(lesson.modified)}</span>
            {lesson.author && (
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                Author
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonCard;