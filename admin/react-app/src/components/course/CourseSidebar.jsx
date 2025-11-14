import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, FileText, ChevronLeft, ChevronRight,
  Calendar, ClipboardList, Video, BarChart3, Sparkles, Clock, FolderOpen, History
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getCourseProgress } from '../../api/services/studentProgressService';
import useCourse from '../../hooks/useCourse';

const CourseSidebar = () => {
  const { courseId } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courseProgress, setCourseProgress] = useState(null);
  const { t } = useTranslation();
  const { getCurrentColors, theme, isDarkMode } = useTheme();
  
  const currentColors = useMemo(() => getCurrentColors(), [theme, isDarkMode, getCurrentColors]);

  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Fetch course progress
  useEffect(() => {
    const loadProgress = () => {
      if (courseId) {
        getCourseProgress(courseId)
          .then(progress => setCourseProgress(progress))
          .catch(error => {
            console.error('Error loading course progress:', error);
            setCourseProgress(null);
          });
      }
    };

    loadProgress();

    const handleProgressUpdate = (event) => {
      if (event.detail?.courseId && event.detail.courseId === courseId) {
        loadProgress();
      }
    };

    window.addEventListener('courseProgressUpdated', handleProgressUpdate);
    return () => window.removeEventListener('courseProgressUpdated', handleProgressUpdate);
  }, [courseId]);

  // Menu items with stats
  const menuItems = useMemo(() => {
    const stepsByType = courseProgress?.steps_by_type || {};
    
    const items = [
      { to: `/courses/${courseId}/dashboard`, text: t('courses.dashboard'), icon: BookOpen, divider: true },
      { to: `/courses/${courseId}/study-planner`, text: t('courses.studyPlanner'), icon: Calendar, divider: true },
    ];

    if (stepsByType.quiz?.total > 0) {
      items.push({ 
        to: `/courses/${courseId}/test-browser`, 
        text: t('courses.tests'), 
        icon: ClipboardList,
        badge: `${stepsByType.quiz.completed}/${stepsByType.quiz.total}`
      });
    }

    const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
    if (materialTotal > 0) {
      items.push({ 
        to: `/courses/${courseId}/material`, 
        text: t('courses.supportMaterial'), 
        icon: FileText,
        badge: `${(stepsByType.text?.completed || 0) + (stepsByType.pdf?.completed || 0)}/${materialTotal}`
      });
    }

    if (stepsByType.video?.total > 0) {
      items.push({ 
        to: `/courses/${courseId}/videos`, 
        text: t('courses.videosSection'), 
        icon: Video,
        divider: true,
        badge: `${stepsByType.video.completed}/${stepsByType.video.total}`
      });
    } else if (items.length > 0 && !items[items.length - 1].divider) {
      items[items.length - 1].divider = true;
    }

    items.push(
      { to: `/courses/${courseId}/test-generator`, text: t('courses.testGenerator'), icon: Sparkles },
      { to: `/courses/${courseId}/self-paced-tests`, text: t('courses.selfPacedTests'), icon: Clock },
      { to: `/courses/${courseId}/test-browser`, text: t('courses.testBrowser'), icon: FolderOpen },
      { to: `/courses/${courseId}/test-history`, text: t('courses.testHistory'), icon: History, divider: true },
      { to: `/courses/${courseId}/statistics`, text: t('courses.statistics'), icon: BarChart3 }
    );

    return items;
  }, [courseId, courseProgress, t]);

  const getLinkStyle = (isActive) => {
    if (isActive) {
      return {
        backgroundColor: currentColors.primary,
        borderColor: currentColors.primary,
        color: '#ffffff'
      };
    }
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: currentColors.primary
    };
  };

  const handleLinkHover = (e, isEnter, isActive) => {
    if (isActive) return;
    
    if (isEnter) {
      e.currentTarget.style.backgroundColor = currentColors.primary;
      e.currentTarget.style.borderColor = currentColors.secondary;
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #ffffff';
      
      const badge = e.currentTarget.querySelector('.badge-course');
      if (badge) {
        badge.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        badge.style.color = '#ffffff';
      }
    } else {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
      e.currentTarget.style.color = currentColors.primary;
      e.currentTarget.style.boxShadow = 'none';
      
      const badge = e.currentTarget.querySelector('.badge-course');
      if (badge) {
        badge.style.backgroundColor = `${currentColors.primary}20`;
        badge.style.color = currentColors.primary;
      }
    }
  };

  return (
    <div 
      className={`relative h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
      style={{ backgroundColor: currentColors.backgroundColor }}
    >
      <aside className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4">
          <div className={`flex gap-2 mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`} style={{ alignItems: 'center', minHeight: '40px' }}>
            {!isCollapsed && (
              <h2 
                className="text-base font-bold truncate flex-1"
                style={{ 
                  color: currentColors.primary,
                  lineHeight: '24px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={courseName}
              >
                <span dangerouslySetInnerHTML={{ __html: courseName }} />
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              type="button"
              title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              className="transition-colors cursor-pointer flex-shrink-0"
              style={{ 
                color: currentColors.primary,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = currentColors.accent}
              onMouseLeave={(e) => e.currentTarget.style.color = currentColors.primary}
            >
              {isCollapsed ? <ChevronRight size={24}/> : <ChevronLeft size={24} />}
            </button>
          </div>
          <div 
            className="w-full h-[2px]"
            style={{ backgroundColor: `${currentColors.primary}40` }}
          />
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-2 overflow-hidden overflow-y-auto">
          {menuItems.map((item) => (
            <React.Fragment key={item.to}>
              <NavLink
                to={item.to}
                end
                className={({ isActive }) => `flex items-center p-2 transition-all duration-200 rounded-lg border-[2px] ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                style={({ isActive }) => getLinkStyle(isActive)}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleLinkHover(e, true, isActive);
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleLinkHover(e, false, isActive);
                }}
                title={isCollapsed ? item.text : ''}
              >
                {({ isActive }) => (
                  <div className={`flex items-center relative w-full ${isCollapsed ? 'justify-center' : ''}`}>
                    <item.icon 
                      className="w-5 h-5" 
                      style={{ color: isActive ? '#ffffff' : 'currentColor' }}
                    />
                    {!isCollapsed && (
                      <>
                        <span 
                          className="ml-3 text-base flex-1"
                          style={{ color: isActive ? '#ffffff' : 'currentColor' }}
                        >
                          {item.text}
                        </span>
                        {item.badge && (
                          <span 
                            className="badge-course text-xs font-semibold px-2 py-0.5 rounded relative z-10"
                            style={{ 
                              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : `${currentColors.primary}20`,
                              color: isActive ? '#ffffff' : currentColors.primary
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </NavLink>
              {item.divider && (
                <div className="px-4 py-2">
                  <div 
                    className="w-full h-[2px]"
                    style={{ backgroundColor: `${currentColors.primary}40` }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>
      </aside>
    </div>
  );
};

export default CourseSidebar;
