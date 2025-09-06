import React, { useState, useMemo, useCallback } from 'react';
import { 
  Users, 
  UserPlus,
  Shield, 
  BookOpen,
  Activity,
  TrendingUp,
  Award,
  Mail,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

// Hook imports
import { useUsers } from '../components/hooks/useUsers.js';
import { useCourses } from '../components/hooks/useCourses.js';

// Component imports
import UserCard from '../components/users/UserCard.jsx';
import ContentManager from '../components/common/ContentManager.jsx';

const UsersPage = () => {
  // --- STATE ---
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');

  // --- HOOKS ---
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
    search: searchTerm,
    role: selectedRole !== 'all' ? selectedRole : null,
    courseId: selectedCourse !== 'all' ? selectedCourse : null,
    enrollmentStatus: selectedEnrollmentStatus !== 'all' ? selectedEnrollmentStatus : null,
    autoFetch: true
  });

  const { courses } = useCourses({
    status: 'publish,draft',
    perPage: 100,
    autoFetch: true
  });

  // --- COMPUTED VALUES ---
  const validCourses = useMemo(() => {
    return courses.filter(course => 
      course.title && (course.title.rendered || course.title)
    ).map(course => ({
      ...course,
      title: course.title.rendered || course.title
    }));
  }, [courses]);

  const roles = useMemo(() => [
    'all',
    'administrator',
    'editor',
    'author',
    'contributor',
    'subscriber'
  ], []);

  const enrollmentStatuses = useMemo(() => [
    'all',
    'enrolled',
    'not_enrolled'
  ], []);

  // --- STATISTICS ---
  const statistics = useMemo(() => {
    const totalUsers = computed.totalUsers || 0;
    const enrolledUsers = computed.enrolledUsers || 0;
    const activeUsers = computed.activeUsers || 0;
    const averageProgress = computed.averageProgress || 0;
    const recentRegistrations = computed.recentRegistrations || 0;
    const usersByRole = computed.usersByRole || {};

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
        label: 'Administrators',
        value: usersByRole.administrator || 0,
        icon: Shield,
        iconColor: 'text-red-500'
      }
    ];
  }, [computed]);

  // --- EVENT HANDLERS ---
  const handleRoleChange = useCallback((role) => {
    setSelectedRole(role);
  }, []);

  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
  }, []);

  const handleEnrollmentStatusChange = useCallback((status) => {
    setSelectedEnrollmentStatus(status);
  }, []);

  const handleSearchChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleUserView = useCallback((user) => {
    console.log('View user details:', user.id);
    // Navigate to user details page
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

  const handleExportUsers = useCallback(() => {
    // Create CSV export
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

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedRole('all');
    setSelectedCourse('all');
    setSelectedEnrollmentStatus('all');
    setSearchTerm('');
  }, []);

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
            {(loading || updating) && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                {updating ? 'Updating...' : 'Loading...'}
              </div>
            )}
            <button
              onClick={handleExportUsers}
              disabled={users.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={refreshUsers}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statistics.map((stat, index) => {
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
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
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
            {roles.map(role => (
              <option key={role} value={role}>
                {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>

          {/* Course Filter */}
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Courses</option>
            {validCourses.map(course => (
              <option key={course.id} value={course.id.toString()}>
                {course.title}
              </option>
            ))}
          </select>

          {/* Enrollment Status Filter */}
          <select
            value={selectedEnrollmentStatus}
            onChange={(e) => handleEnrollmentStatusChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {enrollmentStatuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : 
                 status === 'enrolled' ? 'Enrolled' : 
                 status === 'not_enrolled' ? 'Not Enrolled' : status}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Administrative Tools */}
      {selectedCourse !== 'all' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Award className="h-5 w-5 text-yellow-600 mr-2" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Course Management Mode
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You're viewing users in the context of: {validCourses.find(c => c.id.toString() === selectedCourse)?.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Manager */}
      <ContentManager
        items={users}
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
          description: 'No users match your current filters. Try adjusting your search or filter criteria.',
          actionLabel: 'Clear Filters',
          onAction: resetFilters
        }}
      />
    </div>
  );
};

export default UsersPage;