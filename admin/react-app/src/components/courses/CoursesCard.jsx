import React, { useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Clock,
  Users,
  DollarSign,
  Calendar,
  BookOpen,
  BarChart3,
  Tag,
  Star,
  TrendingUp
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de un curso
 * Usa el componente Card genérico
 * 
 * @param {Object} props
 * @param {Object} props.course - Datos del curso
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEdit] - Callback para editar curso
 * @param {Function} [props.onDelete] - Callback para eliminar curso
 * @param {Function} [props.onDuplicate] - Callback para duplicar curso
 * @param {Function} [props.onClick] - Callback para hacer click en el curso
 * @param {boolean} [props.showLessons=true] - Si mostrar información de lecciones
 * @param {boolean} [props.showPrice=true] - Si mostrar información de precio
 * @param {string} [props.className] - Clases CSS adicionales
 */
const CourseCard = ({
  course,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  showLessons = true,
  showPrice = true,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const startDate = course.meta?._start_date;
  const endDate = course.meta?._end_date;
  const price = parseFloat(course.meta?._price || '0');
  const salePrice = parseFloat(course.meta?._sale_price || '0');
  const category = course.meta?._course_category;
  const difficulty = course.meta?._difficulty_level || 'beginner';
  const durationWeeks = parseInt(course.meta?._duration_weeks || '0');
  const maxStudents = parseInt(course.meta?._max_students || '0');
  
  // Calcular estadísticas del curso (estas vendrían de la API en una implementación real)
  const courseStats = {
    totalLessons: 0, // Se podría calcular desde las lecciones del curso
    enrolledStudents: 0, // Se podría obtener de la API
    completionRate: 0, // Se podría calcular
    rating: 0 // Se podría obtener de reviews
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
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-blue-600 bg-blue-100';
      case 'advanced':
        return 'text-orange-600 bg-orange-100';
      case 'expert':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPrice = (price, salePrice) => {
    if (price === 0) return 'Free';
    
    if (salePrice > 0 && salePrice < price) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold text-green-600">${salePrice}</span>
          <span className="text-sm text-gray-500 line-through">${price}</span>
        </div>
      );
    }
    
    return <span className="text-lg font-semibold text-gray-900">${price}</span>;
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
  const renderCardContent = () => (
    <>
      {/* Header con estado y categoría */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {category && (
            <div className="flex items-center space-x-1 text-sm text-indigo-600">
              <Tag className="h-4 w-4" />
              <span className="capitalize">{category}</span>
            </div>
          )}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
        
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
          {course.status === 'publish' ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Published
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              {course.status}
            </>
          )}
        </span>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {course.title?.rendered || course.title || 'Untitled Course'}
      </h3>

      {/* Descripción/Excerpt */}
      {course.excerpt?.rendered && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {course.excerpt.rendered.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {/* Precio */}
      {showPrice && (
        <div className="mb-4">
          {formatPrice(price, salePrice)}
        </div>
      )}

      {/* Metadatos */}
      <div className="space-y-3">
        {/* Duración y fechas */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          {durationWeeks > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{durationWeeks} week{durationWeeks !== 1 ? 's' : ''}</span>
            </div>
          )}
          {startDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(startDate)}</span>
            </div>
          )}
        </div>

        {/* Estadísticas del curso */}
        {showLessons && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-1 text-gray-500">
              <BookOpen className="h-4 w-4" />
              <span>{courseStats.totalLessons} lessons</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Users className="h-4 w-4" />
              <span>{courseStats.enrolledStudents} students</span>
            </div>
            {maxStudents > 0 && (
              <div className="flex items-center space-x-1 text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>Max {maxStudents}</span>
              </div>
            )}
            {courseStats.rating > 0 && (
              <div className="flex items-center space-x-1 text-yellow-500">
                <Star className="h-4 w-4" />
                <span>{courseStats.rating}/5</span>
              </div>
            )}
          </div>
        )}

        {/* Fecha de modificación */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
          <span>Modified {formatDate(course.modified)}</span>
          <span>ID: {course.id}</span>
        </div>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Icono/Image placeholder */}
      <div className="flex-shrink-0 mr-4">
        <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-indigo-600" />
        </div>
      </div>

      {/* Información principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {course.title?.rendered || course.title || 'Untitled Course'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            {category && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
              {course.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          {category && (
            <span className="truncate">
              {category}
            </span>
          )}
          {durationWeeks > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{durationWeeks}w</span>
            </div>
          )}
          {showPrice && price > 0 && (
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>${salePrice > 0 && salePrice < price ? salePrice : price}</span>
            </div>
          )}
          <span>
            {formatDate(course.modified)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      item={course}
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

export default CourseCard;