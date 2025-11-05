import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Calendar,
  Activity,
  TrendingUp,
  Award,
  Clock,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Mail,
  BarChart3
} from 'lucide-react';

// Hook imports
import { useUsers } from '../hooks/useUsers.js';

// Component imports
import UserCard from '../components/users/UserCard.jsx';
import ContentManager from '../components/common/ContentManager.jsx';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal.jsx';
import QEButton from '../components/common/QEButton';

const UsersPage = () => {
  // --- STATE ---
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // --- HOOKS ---
  const {
    users,
    loading,
    error,
    pagination,
    computed,
    enrollUserInCourse,
    unenrollUserFromCourse,
    updateUserRole,
    refreshUsers
  } = useUsers({
    search: searchTerm,
    role: selectedRole !== 'all' ? selectedRole : null,
    autoFetch: true
  });

  // --- COMPUTED VALUES ---
  const roles = useMemo(() => [
    'all',
    'administrator',
    'editor',
    'author',
    'contributor',
    'subscriber'
  ], []);

  const activityFilters = useMemo(() => [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active (Last 7 days)' },
    { value: 'moderate', label: 'Moderate (Last 30 days)' },
    { value: 'inactive', label: 'Inactive (30+ days)' },
    { value: 'new', label: 'New (Last 7 days)' }
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
    const totalUsers = computed.totalUsers || 0;
    const activeUsers = computed.activeUsers || 0;
    const recentRegistrations = computed.recentRegistrations || 0;
    const averageProgress = computed.averageProgress || 0;
    const enrolledUsers = computed.enrolledUsers || 0;
    const usersByRole = computed.usersByRole || {};

    return [
      {
        label: 'Total Users',
        value: totalUsers,
        icon: Users,
        iconColor: 'qe-icon-primary',
        description: 'Registered users'
      },
      {
        label: 'Active Users',
        value: activeUsers,
        icon: Activity,
        iconColor: 'text-green-500',
        description: 'Active in last 30 days'
      },
      {
        label: 'New This Week',
        value: recentRegistrations,
        icon: UserPlus,
        iconColor: 'qe-icon-secondary',
        description: 'Registrations last 7 days'
      },
      {
        label: 'Avg. Progress',
        value: `${averageProgress}%`,
        icon: TrendingUp,
        iconColor: 'text-purple-500',
        description: 'Average course progress'
      },
      {
        label: 'Enrolled',
        value: enrolledUsers,
        icon: UserCheck,
        iconColor: 'qe-icon-accent',
        description: 'In active courses'
      },
      {
        label: 'Administrators',
        value: usersByRole.administrator || 0,
        icon: Shield,
        iconColor: 'text-red-500',
        description: 'Admin users'
      }
    ];
  }, [computed]);

  // Role distribution for visual display
  const roleDistribution = useMemo(() => {
    const usersByRole = computed.usersByRole || {};
    const total = computed.totalUsers || 1;
    
    return Object.entries(usersByRole).map(([role, count]) => ({
      role,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [computed]);

  // --- EVENT HANDLERS ---
  const handleRoleChange = useCallback((role) => {
    setSelectedRole(role);
  }, []);

  const handleActivityChange = useCallback((activity) => {
    setSelectedActivity(activity);
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleUserView = useCallback((user) => {
    console.log('View user details:', user.id);
    // TODO: Navigate to user detail page or open modal
  }, []);

  const handleDeleteClick = useCallback((user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;
    
    try {
      // TODO: Implement delete user functionality
      console.log('Delete user:', userToDelete.id);
      setShowDeleteModal(false);
      setUserToDelete(null);
      refreshUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }, [userToDelete, refreshUsers]);

  const handleUpdateRole = useCallback(async (userId) => {
    // TODO: Implement role update modal
    console.log('Update role for user:', userId);
  }, []);

  const handleEnrollUser = useCallback(async (userId, courseId) => {
    try {
      await enrollUserInCourse(userId, courseId);
      console.log('User enrolled successfully');
    } catch (error) {
      console.error('Error enrolling user:', error);
    }
  }, [enrollUserInCourse]);

  const handleUnenrollUser = useCallback(async (userId, courseId) => {
    try {
      await unenrollUserFromCourse(userId, courseId);
      console.log('User unenrolled successfully');
    } catch (error) {
      console.error('Error unenrolling user:', error);
    }
  }, [unenrollUserFromCourse]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedRole('all');
    setSelectedActivity('all');
    setSearchTerm('');
  }, []);

  const handleExportUsers = useCallback(() => {
    console.log('Export users to CSV');
    // TODO: Implement CSV export
  }, []);

  const handleBulkEmail = useCallback(() => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }
    console.log('Send bulk email to:', selectedUsers);
    // TODO: Implement bulk email functionality
  }, [selectedUsers]);

  const toggleUserSelection = useCallback((userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // --- FILTER USERS BY ACTIVITY ---
  const filteredUsers = useMemo(() => {
    if (selectedActivity === 'all') return users;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return users.filter(user => {
      const lastActivity = user.enrollmentData?.lastActivity 
        ? new Date(user.enrollmentData.lastActivity) 
        : null;
      const registrationDate = user.date_registered || user.registered 
        ? new Date(user.date_registered || user.registered)
        : null;

      switch (selectedActivity) {
        case 'active':
          return lastActivity && lastActivity > sevenDaysAgo;
        case 'moderate':
          return lastActivity && lastActivity > thirtyDaysAgo && lastActivity <= sevenDaysAgo;
        case 'inactive':
          return !lastActivity || lastActivity <= thirtyDaysAgo;
        case 'new':
          return registrationDate && registrationDate > sevenDaysAgo;
        default:
          return true;
      }
    });
  }, [users, selectedActivity]);

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, enrollments, and permissions</p>
          </div>
          <div className="flex items-center space-x-3">
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 qe-border-primary mr-2"></div>
                Loading...
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} selected
                </span>
                <QEButton
                  onClick={handleBulkEmail}
                  variant="ghost"
                  size="sm"
                  className="inline-flex items-center px-3 py-1.5 text-sm"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </QEButton>
              </div>
            )}
            <QEButton
              onClick={handleExportUsers}
              variant="ghost"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </QEButton>
            <QEButton
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </QEButton>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {statistics.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                  <div className={`flex-shrink-0 ml-3 ${stat.iconColor}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Role Distribution Chart */}
        {roleDistribution.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                User Distribution by Role
              </h3>
              <span className="text-xs text-gray-500">
                {computed.totalUsers || 0} total
              </span>
            </div>
            <div className="space-y-2">
              {roleDistribution.map((item) => (
                <div key={item.role} className="flex items-center">
                  <div className="w-24 text-xs font-medium text-gray-600 capitalize">
                    {item.role}
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full qe-bg-primary transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">×</span>
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {roles.map(role => (
              <option key={role} value={role}>
                {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>

          {/* Activity Filter */}
          <select
            value={selectedActivity}
            onChange={(e) => handleActivityChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {activityFilters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters & Clear Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Content Manager */}
      <ContentManager
        items={filteredUsers}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        renderCard={(user) => (
          <UserCard
            key={user.id}
            user={user}
            onView={handleUserView}
            onUpdateRole={handleUpdateRole}
            onEnroll={handleEnrollUser}
            onUnenroll={handleUnenrollUser}
            showEnrollment={false}
            showProgress={false}
          />
        )}
        emptyState={{
          icon: Users,
          title: 'No users found',
          description: 'Try adjusting your filters or create a new user.',
          actionLabel: 'Add User',
          onAction: () => setShowCreateModal(true)
        }}
      />

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Add New User
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  User creation form will be implemented here...
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete User"
          message={`Are you sure you want to delete "${userToDelete.name || userToDelete.username}"? This action cannot be undone.`}
          confirmLabel="Delete User"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default UsersPage;