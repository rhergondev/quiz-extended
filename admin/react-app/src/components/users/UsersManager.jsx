import React, { useState, useCallback, useMemo } from 'react';
import { 
  Users, 
  UserPlus,
  UserMinus,
  Shield, 
  BookOpen,
  Activity,
  TrendingUp,
  Award,
  Clock,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Settings
} from 'lucide-react';

// FIXED: Import the updated hooks with debouncing
import { useUsers } from '../hooks/useUsers.js';
import { useCourses } from '../hooks/useCourses.js';

// Import debounce utilities
import { useSearchInput, useFilterDebounce } from '../../utils/debounceUtils.js';

// Component imports
import ContentManager from '../common/ContentManager.jsx';
import UserCard from './UserCard.jsx';
import DeleteConfirmModal from '../common/DeleteConfirmModal.jsx';

const UsersManager = () => {
  // --- LOCAL STATE ---
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState('all');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewMode, setViewMode] = useState('cards');

  // --- DEBOUNCED SEARCH INPUT ---
  const {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch
  } = useSearchInput('', async (searchTerm) => {
    // This will automatically trigger the debounced fetch in useUsers
    console.log('🔍 User search triggered:', searchTerm);
  }, 500);

  // --- DEBOUNCED FILTERS ---
  const {
    filters,
    isFiltering,
    updateFilter,
    resetFilters
  } = useFilterDebounce(
    {
      role: 'all',
      courseId: 'all',
      enrollmentStatus: 'all'
    },
    async (newFilters) => {
      // This will automatically trigger the debounced fetch in useUsers
      console.log('🔧 User filters changed:', newFilters);
    },
    300
  );

  // --- HOOKS WITH PROPER DEBOUNCING ---
  const { 
    users, 
    loading, 
    updating,
    error, 
    pagination,
    computed,
    enrollUserInCourse,
    unenrollUserFromCourse,
    updateUserRole,
    refreshUsers
  } = useUsers({
    // Pass current filter values
    search: searchValue,
    role: filters.role !== 'all' ? filters.role : null,
    courseId: filters.courseId !== 'all' ? filters.courseId : null,
    enrollmentStatus: filters.enrollmentStatus !== 'all' ? filters.enrollmentStatus : null,
    autoFetch: true,
    debounceMs: 500 // Configure debounce delay
  });

  const { courses } = useCourses({
    autoFetch: true,
    debounceMs: 300
  });

  // --- EVENT HANDLERS (NO MORE DIRECT API CALLS) ---
  const handleRoleChange = useCallback((role) => {
    setSelectedRole(role);
    updateFilter('role', role);
  }, [updateFilter]);

  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
    updateFilter('courseId', courseId);
  }, [updateFilter]);

  const handleEnrollmentStatusChange = useCallback((status) => {
    setSelectedEnrollmentStatus(status);
    updateFilter('enrollmentStatus', status);
  }, [updateFilter]);

  // No more direct search handling - use the debounced version
  const handleSearchChangeWrapper = useCallback((event) => {
    const value = event.target.value;
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleUserView = useCallback((user) => {
    console.log('View user details:', user.id);
    // Navigate to user details page or open modal
  }, []);

  const handleEnrollUser = useCallback(async (userId, courseId) => {
    try {
      await enrollUserInCourse(userId, courseId);
    } catch (error) {
      console.error('Error enrolling user:', error);
    }
  }, [enrollUserInCourse]);

  const handleUnenrollUser = useCallback(async (userId, courseId) => {
    try {
      await unenrollUserFromCourse(userId, courseId);
    } catch (error) {
      console.error('Error unenrolling user:', error);
    }
  }, [unenrollUserFromCourse]);

  const handleUpdateUserRole = useCallback(async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  }, [updateUserRole]);

  const handleRefresh = useCallback(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleBulkEnroll = useCallback(async () => {
    if (!selectedCourse || selectedCourse === 'all' || selectedUsers.length === 0) {
      alert('Please select a course and users to enroll');
      return;
    }

    try {
      const enrollPromises = selectedUsers.map(userId => 
        enrollUserInCourse(userId, selectedCourse)
      );
      await Promise.all(enrollPromises);
      setSelectedUsers([]);
      alert(`Successfully enrolled ${selectedUsers.length} users`);
    } catch (error) {
      console.error('Error in bulk enrollment:', error);
      alert('Error during bulk enrollment');
    }
  }, [selectedUsers, selectedCourse, enrollUserInCourse]);

  const handleBulkUnenroll = useCallback(async () => {
    if (!selectedCourse || selectedCourse === 'all' || selectedUsers.length === 0) {
      alert('Please select a course and users to unenroll');
      return;
    }

    try {
      const unenrollPromises = selectedUsers.map(userId => 
        unenrollUserFromCourse(userId, selectedCourse)
      );
      await Promise.all(unenrollPromises);
      setSelectedUsers([]);
      alert(`Successfully unenrolled ${selectedUsers.length} users`);
    } catch (error) {
      console.error('Error in bulk unenrollment:', error);
      alert('Error during bulk unenrollment');
    }
  }, [selectedUsers, selectedCourse, unenrollUserFromCourse]);

  const handleExportUsers = useCallback(() => {
    // Create CSV export of users
    const csvContent = [
      ['ID', 'Name', 'Email', 'Role', 'Registration Date', 'Enrollment Status', 'Progress'].join(','),
      ...users.map(user => [
        user.id,
        user.name || user.username,
        user.email,
        user.roles?.[0] || 'subscriber',
        user.date_registered || user.registered,
        user.enrollmentData?.isEnrolled ? 'Enrolled' : 'Not Enrolled',
        user.enrollmentData?.progress || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users_export.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }, [users]);

  // --- COMPUTED VALUES ---
  const statsCards = useMemo(() => {
    const totalUsers = computed.totalUsers || 0;
    const enrolledUsers = computed.enrolledUsers || 0;
    const unenrolledUsers = computed.unenrolledUsers || 0;
    const activeUsers = computed.activeUsers || 0;
    const averageProgress = computed.averageProgress || 0;
    const recentRegistrations = computed.recentRegistrations || 0;

    return [
      {
        label: 'Total Users',
        value: totalUsers,
        icon: Users,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Enrolled Users',
        value: enrolledUsers,
        icon: BookOpen,
        iconColor: 'text-green-500'
      },
      {
        label: 'Active Users',
        value: activeUsers,
        icon: Activity,
        iconColor: 'text-purple-500'
      },
      {
        label: 'Avg. Progress',
        value: `${averageProgress}%`,
        icon: TrendingUp,
        iconColor: 'text-yellow-500'
      },
      {
        label: 'New This Week',
        value: recentRegistrations,
        icon: UserPlus,
        iconColor: 'text-blue-400'
      },
      {
        label: 'Unenrolled',
        value: unenrolledUsers,
        icon: UserMinus,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed]);

  // --- FILTER OPTIONS ---
  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'administrator', label: 'Administrator' },
    { value: 'editor', label: 'Editor' },
    { value: 'author', label: 'Author' },
    { value: 'contributor', label: 'Contributor' },
    { value: 'subscriber', label: 'Subscriber' }
  ];

  const courseOptions = useMemo(() => [
    { value: 'all', label: 'All Courses' },
    ...courses.map(course => ({
      value: course.id.toString(),
      label: course.title?.rendered || course.title || `Course ${course.id}`
    }))
  ], [courses]);

  const enrollmentStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'not_enrolled', label: 'Not Enrolled' }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, enrollments, and permissions</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Loading indicator */}
            {(loading || isSearching || isFiltering || updating) && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                {updating ? 'Updating...' : isSearching ? 'Searching...' : isFiltering ? 'Filtering...' : 'Loading...'}
              </div>
            )}
            <button
              onClick={handleExportUsers}
              disabled={users.length === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.iconColor}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input with Debouncing */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchValue}
              onChange={handleSearchChangeWrapper}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="sr-only">Clear search</span>
                ×
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Course Filter */}
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {courseOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Enrollment Status Filter */}
          <select
            value={selectedEnrollmentStatus}
            onChange={(e) => handleEnrollmentStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {enrollmentStatusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedCourse !== 'all' && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Selected: {selectedUsers.length} users
              </span>
              <button
                onClick={handleBulkEnroll}
                disabled={selectedUsers.length === 0 || updating}
                className="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Bulk Enroll
              </button>
              <button
                onClick={handleBulkUnenroll}
                disabled={selectedUsers.length === 0 || updating}
                className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Bulk Unenroll
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Content Manager */}
      <ContentManager
        items={users}
        loading={loading}
        error={error}
        pagination={pagination}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectable={selectedCourse !== 'all'}
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        renderCard={(user) => (
          <UserCard
            key={user.id}
            user={user}
            onView={handleUserView}
            onEnroll={handleEnrollUser}
            onUnenroll={handleUnenrollUser}
            onUpdateRole={handleUpdateUserRole}
            showEnrollment={selectedCourse !== 'all'}
            courseId={selectedCourse !== 'all' ? selectedCourse : null}
            viewMode={viewMode}
          />
        )}
        emptyState={{
          icon: Users,
          title: 'No users found',
          description: 'No users match your current filters.',
          actionLabel: 'Clear Filters',
          onAction: resetFilters
        }}
      />
    </div>
  );
};

export default UsersManager;