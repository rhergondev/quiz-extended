import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import useCourse from '../../hooks/useCourse';
import CoursePageTemplate from '../../components/course/CoursePageTemplate';
import { 
  getCourseNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../api/services/notificationsService';
import { 
  Bell, 
  BookOpen, 
  ClipboardList, 
  Video, 
  FileText, 
  File, 
  RefreshCw, 
  Settings,
  CheckCheck,
  Loader2,
  BellOff
} from 'lucide-react';

const NotificationsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || t('courses.title');
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Dark mode aware colors
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#1a202c'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  };

  // Icon mapping for notification types
  const getNotificationIcon = (type) => {
    const icons = {
      'new_lesson': BookOpen,
      'new_quiz': ClipboardList,
      'new_video': Video,
      'new_pdf': FileText,
      'new_text': File,
      'lesson_updated': RefreshCw,
      'course_updated': Settings,
      'quiz_updated': ClipboardList,
      'question_updated': RefreshCw,
      'study_plan_note': FileText,
      'study_plan_live_class': Video,
    };
    return icons[type] || Bell;
  };

  // Color mapping for notification types
  const getNotificationColor = (type) => {
    const colors = {
      'new_lesson': '#10b981', // green
      'new_quiz': '#8b5cf6',   // purple
      'new_video': '#3b82f6',  // blue
      'new_pdf': '#ef4444',    // red
      'new_text': '#6b7280',   // gray
      'lesson_updated': '#f59e0b', // amber
      'course_updated': '#6366f1', // indigo
      'quiz_updated': '#8b5cf6',   // purple (same as new_quiz)
      'question_updated': '#f59e0b', // amber (same as lesson_updated)
      'study_plan_note': '#8b5cf6',      // purple
      'study_plan_live_class': '#ef4444', // red
    };
    return colors[type] || pageColors.primary;
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getCourseNotifications(courseId, { page, per_page: 20 });
      
      if (response.data?.success) {
        const { notifications: newNotifications, pagination: pag } = response.data.data;
        const filtered = newNotifications
          .filter(n => !n.type.includes('_updated'))
          .filter(n => String(n.course_id) === String(courseId));
        const filteredUnread = filtered.filter(n => !n.is_read).length;

        if (append) {
          setNotifications(prev => [...prev, ...filtered]);
          setUnreadCount(prev => prev + filteredUnread);
        } else {
          setNotifications(filtered);
          setUnreadCount(filteredUnread);
        }

        setPagination(pag);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchNotifications(1);
    }
  }, [courseId, fetchNotifications]);

  // Load more notifications
  const handleLoadMore = () => {
    if (pagination.page < pagination.total_pages && !loadingMore) {
      fetchNotifications(pagination.page + 1, true);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Emit event to update Topbar badge
      window.dispatchEvent(new CustomEvent('notificationRead'));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead(courseId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      // Emit event to update Topbar badge
      window.dispatchEvent(new CustomEvent('notificationsMarkedAllRead'));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Notification item component
  const NotificationItem = ({ notification }) => {
    const Icon = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type);
    const isUnread = !notification.is_read;

    return (
      <div 
        className={`p-4 rounded-xl border transition-all duration-200 ${isUnread ? 'cursor-pointer' : ''}`}
        style={{ 
          backgroundColor: isUnread 
            ? (isDarkMode ? 'rgba(255,255,255,0.05)' : `${pageColors.primary}05`)
            : pageColors.cardBg,
          borderColor: isUnread ? `${pageColors.primary}30` : pageColors.border,
        }}
        onClick={() => isUnread && handleMarkAsRead(notification.id)}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div 
            className="flex-shrink-0 p-3 rounded-xl"
            style={{ 
              backgroundColor: isDarkMode ? `${iconColor}20` : `${iconColor}15`,
            }}
          >
            <Icon size={22} style={{ color: iconColor }} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 
                className={`font-semibold text-sm ${isUnread ? '' : 'opacity-80'}`}
                style={{ color: pageColors.text }}
              >
                {notification.title}
              </h3>
              {isUnread && (
                <span 
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: pageColors.accent }}
                />
              )}
            </div>
            
            <p 
              className="text-sm mb-2"
              style={{ color: pageColors.textMuted }}
            >
              {notification.message}
            </p>
            
            <span 
              className="text-xs"
              style={{ color: pageColors.textMuted, opacity: 0.7 }}
            >
              {notification.time_ago}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (courseLoading || loading) {
    return (
      <CoursePageTemplate
        courseId={courseId}
        courseName={courseName}
        sectionName={t('courseNotifications.title')}
      >
        <div 
          className="flex items-center justify-center h-64"
          style={{ backgroundColor: pageColors.secondaryBg }}
        >
          <div className="text-center">
            <Loader2 
              className="animate-spin h-10 w-10 mx-auto mb-3"
              style={{ color: pageColors.primary }}
            />
            <p style={{ color: pageColors.textMuted }}>{t('common.loading')}</p>
          </div>
        </div>
      </CoursePageTemplate>
    );
  }

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courseNotifications.title')}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Header with mark all read */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? `${pageColors.primary}20` : `${pageColors.primary}10` }}
            >
              <Bell size={20} style={{ color: pageColors.primary }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: pageColors.text }}>
                {t('courseNotifications.title')}
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs" style={{ color: pageColors.textMuted }}>
                  {unreadCount} {t('courseNotifications.unread')}
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isDarkMode ? pageColors.accent : `${pageColors.primary}10`,
                color: isDarkMode ? '#ffffff' : pageColors.primary
              }}
            >
              {markingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              {t('courseNotifications.markAllRead')}
            </button>
          )}
        </div>

        {/* Notifications list */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
            
            {/* Load more button */}
            {pagination.page < pagination.total_pages && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    color: pageColors.text,
                    border: `1px solid ${pageColors.border}`
                  }}
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  {t('courseNotifications.loadMore')}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div 
            className="flex flex-col items-center justify-center py-16 rounded-xl border"
            style={{ 
              backgroundColor: pageColors.cardBg,
              borderColor: pageColors.border
            }}
          >
            <div 
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
            >
              <BellOff size={48} style={{ color: pageColors.textMuted }} />
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: pageColors.text }}
            >
              {t('courseNotifications.empty')}
            </h3>
            <p 
              className="text-sm text-center max-w-sm"
              style={{ color: pageColors.textMuted }}
            >
              {t('courseNotifications.emptyDescription')}
            </p>
          </div>
        )}
      </div>
    </CoursePageTemplate>
  );
};

export default NotificationsPage;
