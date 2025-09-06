import React, { useMemo } from 'react';
import {
  User,
  Mail,
  Calendar,
  Shield,
  BookOpen,
  Activity,
  Clock,
  TrendingUp,
  UserPlus,
  UserMinus,
  Settings,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Award,
  Eye
} from 'lucide-react';
import Card from '../common/Card.jsx';

/**
 * Componente de tarjeta para mostrar información de usuario
 * ADMINISTRATIVE VERSION - For user management and enrollment
 * 
 * @param {Object} props
 * @param {Object} props.user - Datos del usuario
 * @param {string} [props.viewMode='cards'] - Modo de vista ('cards' o 'list')
 * @param {Function} [props.onEnroll] - Callback para inscribir usuario
 * @param {Function} [props.onUnenroll] - Callback para desinscribir usuario
 * @param {Function} [props.onUpdateRole] - Callback para actualizar rol
 * @param {Function} [props.onView] - Callback para ver detalles del usuario
 * @param {boolean} [props.showEnrollment=true] - Si mostrar información de inscripción
 * @param {boolean} [props.showProgress=true] - Si mostrar progreso
 * @param {string} [props.courseId] - ID del curso para contexto de inscripción
 * @param {string} [props.className] - Clases CSS adicionales
 */
const UserCard = ({
  user,
  viewMode = 'cards',
  onEnroll,
  onUnenroll,
  onUpdateRole,
  onView,
  showEnrollment = true,
  showProgress = true,
  courseId = null,
  className = ''
}) => {
  // --- COMPUTED VALUES ---
  const role = user.roles?.[0] || 'subscriber';
  const isEnrolled = user.enrollmentData?.isEnrolled || false;
  const progress = user.enrollmentData?.progress || 0;
  const enrollmentDate = user.enrollmentData?.enrollmentDate;
  const lastActivity = user.enrollmentData?.lastActivity;
  const registrationDate = user.date_registered || user.registered;
  
  // Avatar URL or initials
  const avatarUrl = user.avatar_urls?.['96'] || user.avatar_urls?.['48'] || null;
  const initials = user.name ? 
    user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() : 
    user.username?.charAt(0).toUpperCase() || 'U';

  // --- UTILITY FUNCTIONS ---
  const getRoleColor = (role) => {
    switch (role) {
      case 'administrator':
        return 'text-red-600 bg-red-100';
      case 'editor':
        return 'text-purple-600 bg-purple-100';
      case 'author':
        return 'text-blue-600 bg-blue-100';
      case 'contributor':
        return 'text-green-600 bg-green-100';
      case 'subscriber':
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getActivityStatus = (lastActivity) => {
    if (!lastActivity) return { status: 'inactive', label: 'Never', color: 'text-gray-500' };
    
    const activityDate = new Date(lastActivity);
    const now = new Date();
    const daysDiff = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return { status: 'today', label: 'Today', color: 'text-green-600' };
    if (daysDiff <= 7) return { status: 'recent', label: `${daysDiff}d ago`, color: 'text-green-500' };
    if (daysDiff <= 30) return { status: 'moderate', label: `${daysDiff}d ago`, color: 'text-yellow-500' };
    return { status: 'inactive', label: `${daysDiff}d ago`, color: 'text-red-500' };
  };

  const activityStatus = getActivityStatus(lastActivity);

  // --- ACTIONS ---
  const actions = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: onView,
      color: 'text-blue-600'
    },
    ...(showEnrollment && courseId ? [
      isEnrolled ? {
        label: 'Unenroll',
        icon: UserMinus,
        onClick: () => onUnenroll?.(user.id, courseId),
        color: 'text-red-600'
      } : {
        label: 'Enroll',
        icon: UserPlus,
        onClick: () => onEnroll?.(user.id, courseId),
        color: 'text-green-600'
      }
    ] : []),
    {
      label: 'Update Role',
      icon: Settings,
      onClick: () => onUpdateRole?.(user.id),
      color: 'text-purple-600'
    }
  ].filter(action => action.onClick);

  // --- RENDER CONTENT ---
  const renderCardContent = () => (
    <>
      {/* Header with avatar and enrollment status */}
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 mr-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name || user.username}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-lg font-medium text-gray-600">{initials}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {user.name || user.username || 'Unknown User'}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
              <Shield className="h-3 w-3 mr-1" />
              {role}
            </span>
            {showEnrollment && courseId && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isEnrolled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
              }`}>
                {isEnrolled ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enrolled
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Enrolled
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Information */}
      <div className="space-y-2 mb-4">
        {/* Email */}
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2" />
          <span className="truncate">{user.email || 'No email'}</span>
        </div>

        {/* Registration Date */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Registered {formatDate(registrationDate)}</span>
        </div>

        {/* Last Activity */}
        <div className="flex items-center text-sm">
          <Activity className="h-4 w-4 mr-2 text-gray-400" />
          <span className={activityStatus.color}>
            Last active: {activityStatus.label}
          </span>
        </div>
      </div>

      {/* Enrollment Information */}
      {showEnrollment && courseId && isEnrolled && (
        <div className="space-y-3 mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900">Course Enrollment</h4>
          
          {/* Enrollment Date */}
          <div className="flex items-center text-sm text-blue-700">
            <Calendar className="h-3 w-3 mr-2" />
            <span>Enrolled {formatDate(enrollmentDate)}</span>
          </div>

          {/* Progress */}
          {showProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Progress</span>
                <span className="font-medium text-blue-900">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with ID */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <span>ID: {user.id}</span>
        <span>{user.username}</span>
      </div>
    </>
  );

  const renderListContent = () => (
    <div className="flex items-center w-full">
      {/* Avatar */}
      <div className="flex-shrink-0 mr-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.name || user.username}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">{initials}</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {user.name || user.username || 'Unknown User'}
          </h3>
          <div className="flex items-center space-x-2 ml-4">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
              {role}
            </span>
            {showEnrollment && courseId && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isEnrolled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
              }`}>
                {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span className="truncate">{user.email}</span>
          <span>Registered {formatDate(registrationDate)}</span>
          <span className={activityStatus.color}>
            {activityStatus.label}
          </span>
          {showProgress && isEnrolled && (
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      item={user}
      viewMode={viewMode}
      actions={actions}
      className={className}
      clickable={!!onView}
      onClick={onView ? () => onView(user) : undefined}
    >
      {viewMode === 'cards' ? renderCardContent() : renderListContent()}
    </Card>
  );
};

export default UserCard;