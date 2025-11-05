import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  X,
  Eye,
  EyeOff,
  BookOpen,
  TrendingUp,
  Activity,
  Award,
  Clock,
  MapPin,
  Phone,
  Globe,
  Edit3
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import QEButton from '../common/QEButton';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Panel de edición/creación de usuarios con información detallada
 */
const UserEditorPanel = ({
  userId,
  mode = 'edit', // 'create' | 'edit'
  onSave,
  onCancel,
  onShowEnrollments,
  onShowProgress,
  isCollapsed = false,
  roleOptions = [],
  className = ''
}) => {
  const { theme } = useTheme();

  // --- STATE ---
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    roles: ['subscriber'],
    password: '',
    description: '',
    url: '',
    nickname: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // --- EFFECTS ---
  useEffect(() => {
    if (mode === 'edit' && userId && userId !== 'new') {
      loadUserData();
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        roles: ['subscriber'],
        password: '',
        description: '',
        url: '',
        nickname: ''
      });
    }
  }, [userId, mode]);

  // --- DATA LOADING ---
  const loadUserData = async () => {
    if (!userId || userId === 'new') return;

    try {
      setLoading(true);
      
      // Use the getApiConfig for proper authentication
      const { getApiConfig } = await import('../../api/config/apiConfig.js');
      const config = getApiConfig();
      
      console.log('🔄 Loading user data for ID:', userId);
      
      const response = await fetch(`${config.endpoints.users}/${userId}?context=edit`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        // If context=edit fails (401/403), try without context (public data)
        console.warn(`⚠️ Failed to load user with context=edit (${response.status}), trying without context...`);
        
        const fallbackResponse = await fetch(`${config.endpoints.users}/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': config.nonce,
          },
          credentials: 'same-origin'
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}`);
        }
        
        const user = await fallbackResponse.json();
        console.log('📥 User data loaded (public context):', user);
        
        setUserData(user);
        setFormData({
          username: user.username || user.slug || '',
          email: '', // Not available in public context
          first_name: user.name?.split(' ')[0] || '',
          last_name: user.name?.split(' ').slice(1).join(' ') || '',
          roles: user.roles || ['subscriber'],
          password: '',
          description: user.description || '',
          url: user.url || user.link || '',
          nickname: user.name || user.username || user.slug || ''
        });
        
        setLoading(false);
        return;
      }
      
      const user = await response.json();
      console.log('📥 User data loaded:', user);
      
      setUserData(user);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        roles: user.roles || ['subscriber'],
        password: '', // Don't populate password
        description: user.description || '',
        url: user.url || '',
        nickname: user.nickname || user.username || ''
      });
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- EVENT HANDLERS ---
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await onSave?.(formData);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  // --- COMPUTED VALUES ---
  const isNewUser = mode === 'create' || userId === 'new';
  const displayName = userData?.name || `${formData.first_name} ${formData.last_name}`.trim() || formData.username;
  const avatarUrl = userData?.avatar_urls?.[96] || userData?.avatar_urls?.[48];

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'enrollments', label: 'Enrollments', icon: BookOpen }
  ];

  // --- RENDER ---
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className}`}>
        {/* Compact Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex flex-col items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover mb-1.5"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mb-1.5">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <p className="text-xs font-medium text-gray-900 truncate text-center w-full px-1 leading-tight">{displayName}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{formData.roles?.[0] || 'subscriber'}</p>
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex-1 p-2 space-y-1.5">
          <button
            onClick={onShowEnrollments}
            className="w-full p-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center justify-center"
            title="View Enrollments"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onShowProgress}
            className="w-full p-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center justify-center"
            title="View Progress"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isNewUser && avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isNewUser ? 'Create New User' : displayName}
              </h2>
              <p className="text-sm text-gray-500">
                {isNewUser ? 'Add a new user to the system' : `User #${userId}`}
              </p>
              {!isNewUser && userData && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Registered {new Date(userData.registered_date || userData.registered || userData.date_registered).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    {userData.roles?.[0] || 'subscriber'}
                  </span>
                  {userData.enrollmentData?.lastActivity && (
                    <span className="flex items-center">
                      <Activity className="h-3 w-3 mr-1" />
                      Last active {new Date(userData.enrollmentData.lastActivity).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'qe-border-primary qe-text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username {isNewUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                  required={isNewUser}
                  disabled={!isNewUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={formData.roles[0]}
                  onChange={(e) => handleInputChange('roles', [e.target.value])}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isNewUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description about the user..."
                />
              </div>
            </div>
          </form>
        )}

        {activeTab === 'activity' && !isNewUser && (
          <div className="space-y-6">
            {/* User Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Registration Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {userData?.registered_date || userData?.registered || userData?.date_registered
                        ? new Date(userData.registered_date || userData.registered || userData.date_registered).toLocaleDateString()
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Current Role</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {userData?.roles?.[0] || 'subscriber'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Mail className="h-8 w-8 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Email Status</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {userData?.email ? 'Verified' : 'No Email'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-orange-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">User ID</p>
                    <p className="text-lg font-semibold text-gray-900">
                      #{userData?.id || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Capabilities */}
            {userData?.capabilities && Object.keys(userData.capabilities).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Capabilities</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(userData.capabilities).slice(0, 12).map((capability) => (
                      <span key={capability} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {capability.replace('_', ' ')}
                      </span>
                    ))}
                    {Object.keys(userData.capabilities).length > 12 && (
                      <span className="text-xs text-gray-500">
                        +{Object.keys(userData.capabilities).length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User Meta Information */}
            {userData?.meta && Object.keys(userData.meta).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    {userData.nickname && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Nickname:</span>
                        <span className="text-gray-900">{userData.nickname}</span>
                      </div>
                    )}
                    {userData.locale && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Locale:</span>
                        <span className="text-gray-900">{userData.locale}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Username:</span>
                      <span className="text-gray-900 font-mono">{userData.username}</span>
                    </div>
                    {userData.link && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Profile URL:</span>
                        <a href={userData.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          View Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'enrollments' && !isNewUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Course Enrollments</h3>
              <QEButton
                onClick={onShowEnrollments}
                variant="ghost"
                size="sm"
                className="flex items-center"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Enrollments
              </QEButton>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Enrollment details will be shown here...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {activeTab === 'general' && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <QEButton
            onClick={handleCancel}
            variant="ghost"
            disabled={saving}
          >
            Cancel
          </QEButton>
          <QEButton
            onClick={handleSubmit}
            variant="primary"
            disabled={saving}
            loading={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : isNewUser ? 'Create User' : 'Save Changes'}
          </QEButton>
        </div>
      )}
    </div>
  );
};

export default UserEditorPanel;
