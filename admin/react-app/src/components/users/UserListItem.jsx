import React, { useMemo } from 'react';
import {
  User,
  Shield,
  Mail,
  Calendar,
  Activity,
  BookOpen,
  TrendingUp,
  Eye,
  UserCheck,
  Crown
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Componente de item de lista para usuarios en el panel lateral
 */
const UserListItem = ({
  user,
  isSelected = false,
  onClick,
  onShowEnrollments,
  onShowProgress,
  className = ''
}) => {
  const { theme } = useTheme();

  // --- COMPUTED VALUES ---
  const role = user.roles?.[0] || 'subscriber';
  const enrollmentData = user.enrollmentData || {};
  const isEnrolled = enrollmentData.isEnrolled || false;
  const progress = enrollmentData.progress || 0;
  const lastActivity = enrollmentData.lastActivity;
  
  // Avatar URL or initials
  const avatarUrl = user.avatar_urls?.['48'] || user.avatar_urls?.['96'] || null;
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

  const getRoleIcon = (role) => {
    switch (role) {
      case 'administrator':
        return Crown;
      case 'editor':
      case 'author':
      case 'contributor':
        return Shield;
      case 'subscriber':
      default:
        return User;
    }
  };

  const getActivityStatus = (lastActivity) => {
    if (!lastActivity) return { status: 'inactive', color: 'text-gray-400' };
    
    const activityDate = new Date(lastActivity);
    const now = new Date();
    const daysDiff = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return { status: 'active', color: 'text-green-500' };
    if (daysDiff <= 7) return { status: 'recent', color: 'text-yellow-500' };
    return { status: 'inactive', color: 'text-red-500' };
  };

  const activityStatus = getActivityStatus(lastActivity);
  const RoleIcon = getRoleIcon(role);

  const handleClick = () => {
    onClick?.(user);
  };

  const handleEnrollmentsClick = (e) => {
    e.stopPropagation();
    onShowEnrollments?.(user.id);
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    onShowProgress?.(user.id);
  };

  // --- RENDER ---
  return (
    <div
      className={`
        relative p-4 rounded-lg border cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-blue-300
        ${isSelected 
          ? 'qe-bg-primary-light qe-border-primary shadow-sm' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
        }
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Header with Avatar and Basic Info */}
      <div className="flex items-start space-x-3 mb-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
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
          {/* Activity Indicator */}
          <div className={`w-3 h-3 rounded-full ${activityStatus.color.replace('text-', 'bg-')} 
            absolute -mt-2 ml-8 border-2 border-white`} 
          />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {user.name || user.username || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-1">
              <RoleIcon className="h-3 w-3 text-gray-400" />
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(role)}`}>
                {role}
              </span>
            </div>
          </div>
          
          <div className="mt-1">
            <p className="text-xs text-gray-500 truncate flex items-center">
              <Mail className="h-3 w-3 mr-1" />
              {user.email || 'No email'}
            </p>
          </div>
        </div>
      </div>

      {/* Enrollment Status */}
      {isEnrolled && (
        <div className="mb-3 p-2 qe-bg-secondary-light rounded-md">
          <div className="flex items-center justify-between text-xs">
            <span className="qe-text-secondary font-medium flex items-center">
              <UserCheck className="h-3 w-3 mr-1" />
              Enrolled
            </span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="mt-1 w-full bg-white rounded-full h-1.5">
            <div
              className="qe-bg-secondary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Registration Date */}
      <div className="flex items-center text-xs text-gray-500 mb-3">
        <Calendar className="h-3 w-3 mr-1" />
        <span>
          Registered {new Date(user.date_registered || user.registered).toLocaleDateString()}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={handleClick}
          className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <Eye className="h-3 w-3 mr-1" />
          View Details
        </button>
        
        <div className="flex items-center space-x-2">
          {isEnrolled && (
            <button
              onClick={handleProgressClick}
              className="flex items-center text-xs qe-text-accent hover:opacity-80 font-medium"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Progress
            </button>
          )}
          <button
            onClick={handleEnrollmentsClick}
            className="flex items-center text-xs qe-text-secondary hover:opacity-80 font-medium"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Courses
          </button>
        </div>
      </div>

      {/* User ID Badge */}
      <div className="absolute top-2 right-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono text-gray-500 bg-gray-100">
          #{user.id}
        </span>
      </div>
    </div>
  );
};

export default UserListItem;
