import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import { useUsers } from '../../../hooks/useUsers';
import { getEnrolledUsers, enrollUserInCourse, unenrollUserFromCourse } from '../../../api/services/userEnrollmentService';
import { generateGhostUsers, deleteGhostUsers } from '../../../api/services/ghostUsersService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { Users, Search, UserPlus, UserMinus, Mail, Trophy, X, Check, Loader2, AlertTriangle, Ghost, Trash2, Sparkles } from 'lucide-react';
import { isUserAdmin } from '../../../utils/userUtils';
import { toast } from 'react-toastify';

const CourseStudentsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Colors - same as VideosPage/SupportMaterialPage
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
    dangerBg: '#ef4444',
    dangerHover: '#dc2626',
  };

  // State
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [unenrollingId, setUnenrollingId] = useState(null);
  
  // Add student modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);
  
  // Confirm unenroll modal
  const [confirmUnenroll, setConfirmUnenroll] = useState(null);

  // Ghost users state
  const [isGhostModalOpen, setIsGhostModalOpen] = useState(false);
  const [ghostCount, setGhostCount] = useState(20);
  const [generatingGhosts, setGeneratingGhosts] = useState(false);
  const [confirmDeleteGhosts, setConfirmDeleteGhosts] = useState(false);
  const [deletingGhosts, setDeletingGhosts] = useState(false);

  // User hook for searching users
  const { users: allUsers, fetchUsers, loading: usersLoading } = useUsers({ autoFetch: false });

  // Check admin
  const userIsAdmin = isUserAdmin();

  // Redirect if not admin
  useEffect(() => {
    if (!userIsAdmin) {
      window.location.hash = '#/courses';
    }
  }, [userIsAdmin]);

  // Fetch enrolled students - include ghosts to see all users
  const fetchEnrolledStudents = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      console.log('📚 Fetching enrolled students for course:', courseId);
      const result = await getEnrolledUsers(parseInt(courseId, 10), { 
        perPage: 100,
        includeGhosts: true // Include ghost users to see all enrolled
      });
      console.log('📚 Enrolled students result:', result);
      console.log('📚 Students data:', result.data);
      console.log('📚 Meta info:', result.meta);
      setEnrolledStudents(result.data || []);
      setMeta(result.meta || {});
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      toast.error(t('courses.students.errors.loadStudents'));
    } finally {
      setLoading(false);
    }
  }, [courseId, t]);

  useEffect(() => {
    fetchEnrolledStudents();
  }, [fetchEnrolledStudents]);

  // Search users for adding
  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      return;
    }
    
    try {
      await fetchUsers({ reset: true, search: query, perPage: 50 });
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, [fetchUsers]);

  // Filter out already enrolled users from search results
  const filteredSearchResults = useMemo(() => {
    const enrolledIds = new Set(enrolledStudents.map(s => s.id));
    return allUsers.filter(user => !enrolledIds.has(user.id));
  }, [allUsers, enrolledStudents]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAddModalOpen && searchQuery.length >= 2) {
        handleSearch(searchQuery);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, isAddModalOpen, handleSearch]);

  // Handle enroll user
  const handleEnrollUser = async (userId) => {
    setEnrollingId(userId);
    try {
      console.log('🎓 Enrolling user:', userId, 'in course:', courseId);
      const result = await enrollUserInCourse(userId, parseInt(courseId, 10));
      console.log('🎓 Enroll result:', result);
      if (result?.success !== false) {
        toast.success(t('courses.students.enrollSuccess'));
        await fetchEnrolledStudents();
        setSearchQuery('');
      } else {
        toast.error(result?.error || t('courses.students.errors.enroll'));
      }
    } catch (error) {
      console.error('Error enrolling user:', error);
      toast.error(t('courses.students.errors.enroll'));
    } finally {
      setEnrollingId(null);
    }
  };

  // Handle unenroll user
  const handleUnenrollUser = async (userId) => {
    setUnenrollingId(userId);
    try {
      const result = await unenrollUserFromCourse(userId, parseInt(courseId, 10));
      if (result?.success !== false) {
        toast.success(t('courses.students.unenrollSuccess'));
        setEnrolledStudents(prev => prev.filter(s => s.id !== userId));
        setConfirmUnenroll(null);
      } else {
        toast.error(result?.error || t('courses.students.errors.unenroll'));
      }
    } catch (error) {
      console.error('Error unenrolling user:', error);
      toast.error(t('courses.students.errors.unenroll'));
    } finally {
      setUnenrollingId(null);
    }
  };

  // Handle generate ghost users
  const handleGenerateGhosts = async () => {
    if (!courseId || ghostCount < 1) return;
    
    setGeneratingGhosts(true);
    try {
      const result = await generateGhostUsers(parseInt(courseId, 10), ghostCount);
      if (result?.success !== false) {
        const createdCount = result?.created_users?.length || result?.count || ghostCount;
        toast.success(t('courses.students.ghostUsers.generateSuccess', { count: createdCount }));
        setIsGhostModalOpen(false);
        setGhostCount(20);
        await fetchEnrolledStudents();
      } else {
        toast.error(result?.error || t('courses.students.ghostUsers.errors.generate'));
      }
    } catch (error) {
      console.error('Error generating ghost users:', error);
      toast.error(t('courses.students.ghostUsers.errors.generate'));
    } finally {
      setGeneratingGhosts(false);
    }
  };

  // Handle delete all ghost users
  const handleDeleteGhosts = async () => {
    if (!courseId) return;
    
    setDeletingGhosts(true);
    try {
      const result = await deleteGhostUsers(parseInt(courseId, 10));
      if (result?.success !== false) {
        const deletedCount = result?.deleted_count || result?.count || 0;
        toast.success(t('courses.students.ghostUsers.deleteSuccess', { count: deletedCount }));
        setConfirmDeleteGhosts(false);
        await fetchEnrolledStudents();
      } else {
        toast.error(result?.error || t('courses.students.ghostUsers.errors.delete'));
      }
    } catch (error) {
      console.error('Error deleting ghost users:', error);
      toast.error(t('courses.students.ghostUsers.errors.delete'));
    } finally {
      setDeletingGhosts(false);
    }
  };

  // Count ghost users in current list
  const ghostUserCount = useMemo(() => {
    return enrolledStudents.filter(s => s.is_ghost).length;
  }, [enrolledStudents]);

  // Format score for display - score comes in base 10 (0-10), not percentage
  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    // Round to 1 decimal place, no percentage sign since it's base 10
    return Math.round(score * 10) / 10;
  };

  if (!userIsAdmin) {
    return null;
  }

  return (
    <CoursePageTemplate 
      courseId={courseId} 
      courseName={courseName}
      sectionName={t('courses.students.title')}
    >
      <div className="h-full overflow-y-auto">
        {/* Admin: Add Student Button */}
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={20} style={{ color: pageColors.accent }} />
            <span 
              className="text-sm font-medium"
              style={{ color: pageColors.textMuted }}
            >
              {meta.total || enrolledStudents.length} {t('courses.students.enrolledCount')}
            </span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
            style={{
              backgroundColor: pageColors.accent,
              color: '#ffffff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <UserPlus size={18} />
            {t('courses.students.addStudent')}
          </button>
        </div>

        {/* Ghost Users Actions Bar */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <div 
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.1)' : 'rgba(107, 114, 128, 0.08)',
              border: `1px dashed ${isDarkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(107, 114, 128, 0.25)'}`
            }}
          >
            <div className="flex items-center gap-2">
              <Ghost size={18} style={{ color: pageColors.textMuted }} />
              <span className="text-sm" style={{ color: pageColors.textMuted }}>
                {ghostUserCount > 0 
                  ? `${ghostUserCount} ${t('courses.students.ghostUsers.title').toLowerCase()}`
                  : t('courses.students.ghostUsers.noGhosts')
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGhostModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.15)',
                  color: isDarkMode ? '#d1d5db' : '#4b5563'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(156, 163, 175, 0.3)' : 'rgba(107, 114, 128, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.15)';
                }}
              >
                <Sparkles size={14} />
                {t('courses.students.ghostUsers.generate')}
              </button>
              {ghostUserCount > 0 && (
                <button
                  onClick={() => setConfirmDeleteGhosts(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: `${pageColors.dangerBg}15`,
                    color: pageColors.dangerBg
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = pageColors.dangerBg;
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${pageColors.dangerBg}15`;
                    e.currentTarget.style.color = pageColors.dangerBg;
                  }}
                >
                  <Trash2 size={14} />
                  {t('courses.students.ghostUsers.deleteAll')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-4 pb-12">
          {loading ? (
            <div 
              className="rounded-xl border-2 overflow-hidden"
              style={{ 
                backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
              }}
            >
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className="px-4 sm:px-6 py-4 flex items-center gap-4 animate-pulse"
                  style={{ borderBottom: i < 3 ? `1px solid ${getColor('borderColor', '#e5e7eb')}` : 'none' }}
                >
                  <div className="w-10 h-10 rounded-full" style={{ backgroundColor: pageColors.text + '20' }}></div>
                  <div className="flex-1">
                    <div className="h-4 rounded w-32 mb-2" style={{ backgroundColor: pageColors.text + '15' }}></div>
                    <div className="h-3 rounded w-48" style={{ backgroundColor: pageColors.text + '10' }}></div>
                  </div>
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: pageColors.text + '10' }}></div>
                </div>
              ))}
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div 
              className="text-center py-12 rounded-xl border-2"
              style={{ 
                backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
              }}
            >
              <Users size={40} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
              <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                {t('courses.students.noStudents')}
              </p>
              <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                {t('courses.students.noStudentsDescription')}
              </p>
            </div>
          ) : (
            /* Students list - card style like VideosPage */
            <div className="py-4">
              <div 
                className="rounded-xl border-2 overflow-hidden"
                style={{ 
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
                }}
              >
                {enrolledStudents.map((student, index) => {
                  const isLast = index === enrolledStudents.length - 1;
                  
                  return (
                    <div 
                      key={student.id}
                      className="px-4 sm:px-6 py-4 flex items-center gap-4 transition-all duration-200"
                      style={{ 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
                        borderBottom: !isLast ? `1px solid ${getColor('borderColor', '#e5e7eb')}` : 'none'
                      }}
                    >
                      {/* Avatar */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ 
                          backgroundColor: student.is_ghost ? `${pageColors.textMuted}30` : `${pageColors.accent}20`,
                          color: student.is_ghost ? pageColors.textMuted : pageColors.accent
                        }}
                      >
                        {student.is_ghost ? (
                          <Ghost size={18} />
                        ) : (
                          student.display_name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      
                      {/* Name, Email & Ghost badge - single horizontal line */}
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span 
                          className="font-medium text-sm"
                          style={{ color: pageColors.text }}
                        >
                          {student.display_name}
                        </span>
                        <span style={{ color: pageColors.textMuted }}>·</span>
                        <span 
                          className="text-sm truncate"
                          style={{ color: pageColors.textMuted }}
                        >
                          {student.email}
                        </span>
                        {student.is_ghost && (
                          <span 
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ 
                              backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.15)',
                              color: isDarkMode ? '#9ca3af' : '#6b7280'
                            }}
                          >
                            <Ghost size={10} />
                            {t('courses.students.ghost')}
                          </span>
                        )}
                      </div>
                      
                      {/* Score */}
                      <div 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0"
                        style={{ 
                          backgroundColor: `${pageColors.accent}15`
                        }}
                      >
                        <Trophy size={14} style={{ color: pageColors.accent }} />
                        <span 
                          className="font-semibold text-sm"
                          style={{ color: pageColors.accent }}
                        >
                          {formatScore(student.avg_score)}
                        </span>
                      </div>
                      
                      {/* Remove button */}
                      <button
                        onClick={() => setConfirmUnenroll(student)}
                        disabled={unenrollingId === student.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0"
                        style={{
                          backgroundColor: `${pageColors.dangerBg}15`,
                          color: pageColors.dangerBg,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = pageColors.dangerBg;
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${pageColors.dangerBg}15`;
                          e.currentTarget.style.color = pageColors.dangerBg;
                        }}
                      >
                        {unenrollingId === student.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserMinus size={14} />
                        )}
                        <span className="hidden sm:inline">
                          {t('courses.students.remove')}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsAddModalOpen(false);
              setSearchQuery('');
            }}
          />
          <div 
            className="relative w-full max-w-lg rounded-xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
          >
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: getColor('borderColor', '#e5e7eb') }}
            >
              <h2 
                className="text-lg font-bold flex items-center gap-2"
                style={{ color: pageColors.text }}
              >
                <UserPlus size={20} style={{ color: pageColors.accent }} />
                {t('courses.students.addStudent')}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ 
                  color: pageColors.text,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="px-5 py-4 border-b" style={{ borderColor: getColor('borderColor', '#e5e7eb') }}>
              <div 
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ 
                  backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                  border: `1px solid ${getColor('borderColor', '#e5e7eb')}`
                }}
              >
                <Search size={18} style={{ color: pageColors.textMuted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('courses.students.searchPlaceholder')}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: pageColors.text }}
                  autoFocus
                />
                {usersLoading && (
                  <Loader2 size={18} className="animate-spin" style={{ color: pageColors.accent }} />
                )}
              </div>
              <p 
                className="text-xs mt-2"
                style={{ color: pageColors.textMuted }}
              >
                {t('courses.students.searchHint')}
              </p>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ maxHeight: '400px' }}>
              {searchQuery.length > 0 && searchQuery.length < 2 ? (
                <p 
                  className="text-center py-8 text-sm"
                  style={{ color: pageColors.textMuted }}
                >
                  {t('courses.students.minSearchChars')}
                </p>
              ) : searchQuery.length === 0 ? (
                <p 
                  className="text-center py-8 text-sm"
                  style={{ color: pageColors.textMuted }}
                >
                  {t('courses.students.searchHint')}
                </p>
              ) : filteredSearchResults.length === 0 ? (
                <p 
                  className="text-center py-8 text-sm"
                  style={{ color: pageColors.textMuted }}
                >
                  {usersLoading ? t('common.loading') : t('courses.students.noResults')}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredSearchResults.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                        border: `1px solid ${getColor('borderColor', '#e5e7eb')}`
                      }}
                    >
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                        style={{ 
                          backgroundColor: `${pageColors.primary}20`,
                          color: pageColors.primary
                        }}
                      >
                        {user.displayName?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="font-medium text-sm truncate"
                          style={{ color: pageColors.text }}
                        >
                          {user.displayName || user.name}
                        </p>
                        <p 
                          className="text-xs truncate"
                          style={{ color: pageColors.textMuted }}
                        >
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEnrollUser(user.id)}
                        disabled={enrollingId === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0"
                        style={{
                          backgroundColor: pageColors.buttonBg,
                          color: pageColors.buttonText,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {enrollingId === user.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserPlus size={14} />
                        )}
                        {t('courses.students.enroll')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Unenroll Modal */}
      {confirmUnenroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmUnenroll(null)}
          />
          <div 
            className="relative w-full max-w-md rounded-xl shadow-xl p-6"
            style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="p-2.5 rounded-full"
                style={{ backgroundColor: `${pageColors.dangerBg}15` }}
              >
                <AlertTriangle size={24} style={{ color: pageColors.dangerBg }} />
              </div>
              <h3 
                className="text-lg font-bold"
                style={{ color: pageColors.text }}
              >
                {t('courses.students.confirmUnenroll')}
              </h3>
            </div>
            
            <p 
              className="mb-6"
              style={{ color: pageColors.textMuted }}
            >
              {t('courses.students.confirmUnenrollMessage', { name: confirmUnenroll.display_name })}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmUnenroll(null)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                  color: pageColors.text
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleUnenrollUser(confirmUnenroll.id)}
                disabled={unenrollingId === confirmUnenroll.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: pageColors.dangerBg }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = pageColors.dangerHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = pageColors.dangerBg}
              >
                {unenrollingId === confirmUnenroll.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Ghost Users Modal */}
      {isGhostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => !generatingGhosts && setIsGhostModalOpen(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-xl shadow-xl p-6"
            style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="p-2.5 rounded-full"
                style={{ backgroundColor: isDarkMode ? 'rgba(156, 163, 175, 0.2)' : 'rgba(107, 114, 128, 0.15)' }}
              >
                <Sparkles size={24} style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }} />
              </div>
              <h3 
                className="text-lg font-bold"
                style={{ color: pageColors.text }}
              >
                {t('courses.students.ghostUsers.generate')}
              </h3>
            </div>
            
            <p 
              className="mb-4 text-sm"
              style={{ color: pageColors.textMuted }}
            >
              {t('courses.students.ghostUsers.generateDescription')}
            </p>

            <div className="mb-6">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: pageColors.text }}
              >
                {t('courses.students.ghostUsers.count')}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={ghostCount}
                onChange={(e) => setGhostCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ 
                  backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                  border: `1px solid ${getColor('borderColor', '#e5e7eb')}`,
                  color: pageColors.text
                }}
              />
              <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                Máximo: 50
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsGhostModalOpen(false)}
                disabled={generatingGhosts}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                  color: pageColors.text
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGenerateGhosts}
                disabled={generatingGhosts || ghostCount < 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: isDarkMode ? '#6b7280' : '#4b5563' }}
              >
                {generatingGhosts ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('courses.students.ghostUsers.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t('courses.students.ghostUsers.generate')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Ghosts Modal */}
      {confirmDeleteGhosts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => !deletingGhosts && setConfirmDeleteGhosts(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-xl shadow-xl p-6"
            style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="p-2.5 rounded-full"
                style={{ backgroundColor: `${pageColors.dangerBg}15` }}
              >
                <AlertTriangle size={24} style={{ color: pageColors.dangerBg }} />
              </div>
              <h3 
                className="text-lg font-bold"
                style={{ color: pageColors.text }}
              >
                {t('courses.students.ghostUsers.deleteAllConfirm')}
              </h3>
            </div>
            
            <p 
              className="mb-6"
              style={{ color: pageColors.textMuted }}
            >
              {t('courses.students.ghostUsers.deleteConfirmMessage')}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteGhosts(false)}
                disabled={deletingGhosts}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                  color: pageColors.text
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteGhosts}
                disabled={deletingGhosts}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
                style={{ backgroundColor: pageColors.dangerBg }}
                onMouseEnter={(e) => !deletingGhosts && (e.currentTarget.style.backgroundColor = pageColors.dangerHover)}
                onMouseLeave={(e) => !deletingGhosts && (e.currentTarget.style.backgroundColor = pageColors.dangerBg)}
              >
                {deletingGhosts ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('courses.students.ghostUsers.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </CoursePageTemplate>
  );
};

export default CourseStudentsPage;
