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
  TrendingUp,
  User,
  Award
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de un curso
 * Usa el componente Card genérico
 * FIXED VERSION - Aligned with common structure
 * 
 * @param {Object} props
 * @param {Object} props.course - Datos del curso
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEdit] - Callback para editar curso
 * @param {Function} [props.onDelete] - Callback para eliminar curso
 * @param {Function} [props.onDuplicate] - Callback para duplicar curso
 * @param {Function} [props.onClick] - Callback para hacer click en el curso
 * @param {boolean} [props.showPrice=true] - Si mostrar información de precio
 * @param {boolean} [props.showStats=true] - Si mostrar estadísticas
 * @param {string} [props.className] - Clases CSS adicionales
 */
const CourseCard = ({
  course,
  viewMode = 'cards',
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  showPrice = true,
  showStats = true,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const price = parseFloat(course.meta?._course_price || '0');
  const salePrice = parseFloat(course.meta?._sale_price || '0');
  const category = course.meta?._course_category;
  const difficulty = course.meta?._course_difficulty || 'beginner';
  const duration = course.meta?._course_duration || '';
  const instructor = course.meta?._course_instructor || '';
  const maxStudents = parseInt(course.meta?._course_max_students || '0');
  const featured = course.meta?._course_featured === 'yes';
  const enrolledStudents = parseInt(course.meta?._enrolled_students || '0');

  // --- UTILITY FUNCTIONS ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'publish':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-yellow-600 bg-yellow-100';
      case 'private':
        return 'text-gray-600 bg-gray-100';
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-orange-600 bg-orange-100';
      case 'expert':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price, salePrice) => {
    if (price === 0) return 'Free';
    if (salePrice > 0 && salePrice < price) {
      return (
        <span>
          <span className="line-through text-gray-400">${price}</span>
          <span className="ml-1 text-green-600">${salePrice}</span>
        </span>
      );
    }
    return `$${price}`;
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
      color: 'text-red-600'
    }
  ].filter(action => action.onClick);

  // --- RENDER CONTENT ---
  const renderCardContent = () => (
    <>
      {/* Header with status and featured badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
            {course.status}
          </span>
          {featured && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-100">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </span>
          )}
        </div>
        {showPrice && (
          <div className="text-lg font-semibold text-gray-900">
            {formatPrice(price, salePrice)}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {course.title?.rendered || course.title || 'Untitled Course'}
      </h3>

      {/* Description */}
      {course.excerpt && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {course.excerpt.rendered || course.excerpt}
        </p>
      )}

      {/* Course metadata */}
      <div className="space-y-2 mb-4">
        {/* Difficulty and Category */}
        <div className="flex items-center space-x-2">
          {difficulty && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
              <Award className="h-3 w-3 mr-1" />
              {difficulty}
            </span>
          )}
          {category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
              <Tag className="h-3 w-3 mr-1" />
              {category}
            </span>
          )}
        </div>

        {/* Duration and Instructor */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {duration && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{duration}h</span>
            </div>
          )}
          {instructor && (
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span className="truncate">{instructor}</span>
            </div>
          )}
        </div>

        {/* Students stats */}
        {showStats && (
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {maxStudents > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{enrolledStudents}/{maxStudents} students</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with date */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>Updated {formatDate(course.modified)}</span>
        </div>
        <span>ID: {course.id}</span>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Course Icon */}
      <div className="flex-shrink-0 mr-4">
        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <BookOpen className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {course.title?.rendered || course.title || 'Untitled Course'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            {featured && (
              <Star className="h-4 w-4 text-yellow-500" />
            )}
            {difficulty && (
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
            <span className="truncate">{category}</span>
          )}
          {duration && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{duration}h</span>
            </div>
          )}
          {instructor && (
            <div className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span className="truncate">{instructor}</span>
            </div>
          )}
          {showPrice && price > 0 && (
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>{formatPrice(price, salePrice)}</span>
            </div>
          )}
          <span>{formatDate(course.modified)}</span>
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