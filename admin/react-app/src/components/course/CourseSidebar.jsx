import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, FileText, ChevronLeft, ChevronRight, X,
  Calendar, ClipboardList, Video, BarChart3, Sparkles, Clock, FolderOpen, History,
  User, LogOut, Home, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getCourseProgress } from '../../api/services/studentProgressService';
import useCourse from '../../hooks/useCourse';
import { isUserAdmin } from '../../utils/userUtils';

const CourseSidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { courseId } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courseProgress, setCourseProgress] = useState(() => {
    // Try to get cached progress from sessionStorage to prevent flickering
    const cached = sessionStorage.getItem(`courseProgress_${courseId}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [currentCourseId, setCurrentCourseId] = useState(courseId);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();

  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  // Get global data
  const homeUrl = window.qe_data?.home_url || '';
  const logoutUrl = window.qe_data?.logout_url;

  // Fetch course progress
  useEffect(() => {
    const loadProgress = () => {
      if (courseId) {
        console.log(`📊 CourseSidebar: Fetching progress for course ${courseId}`);
        getCourseProgress(courseId)
          .then(progress => {
            console.log('📊 CourseSidebar: Progress received:', progress?.steps_by_type);
            setCourseProgress(progress);
            // Cache in sessionStorage to prevent flickering on navigation
            sessionStorage.setItem(`courseProgress_${courseId}`, JSON.stringify(progress));
          })
          .catch(error => {
            console.error('Error loading course progress:', error);
          });
      }
    };

    // Check if courseId changed
    if (courseId !== currentCourseId) {
      setCurrentCourseId(courseId);
      setHasLoadedInitial(false);
      // Try to load from cache first for instant display
      const cached = sessionStorage.getItem(`courseProgress_${courseId}`);
      if (cached) {
        setCourseProgress(JSON.parse(cached));
      } else {
        // No cache - clear old data and load fresh
        setCourseProgress(null);
      }
      // Always fetch fresh data when course changes (even if cached)
      loadProgress();
      return;
    }

    // Always load fresh data on initial mount
    if (!hasLoadedInitial) {
      setHasLoadedInitial(true);
      loadProgress();
    }

    const handleProgressUpdate = (event) => {
      if (event.detail?.courseId && String(event.detail.courseId) === String(courseId)) {
        // Force reload on progress update event
        loadProgress();
      }
    };

    window.addEventListener('courseProgressUpdated', handleProgressUpdate);
    return () => window.removeEventListener('courseProgressUpdated', handleProgressUpdate);
  }, [courseId, currentCourseId, hasLoadedInitial]);

  // Menu items with stats (Dashboard and Statistics moved to header)
  const menuItems = useMemo(() => {
    const stepsByType = courseProgress?.steps_by_type || {};
    const userIsAdmin = isUserAdmin();
    
    const items = [
      { to: `/courses/${courseId}/study-planner`, text: t('courses.studyPlanner'), icon: Calendar, divider: true },
    ];

    // Agregar Tests si hay quizzes O si es admin
    const hasQuizzes = stepsByType.quiz?.total > 0;
    if (hasQuizzes || userIsAdmin) {
      items.push({ 
        to: `/courses/${courseId}/tests`, 
        text: t('courses.tests'), 
        icon: ClipboardList,
        badge: hasQuizzes ? stepsByType.quiz.total : null
      });
    }

    // Agregar Material de Apoyo si hay PDFs/texto O si es admin
    const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
    const hasMaterial = materialTotal > 0;
    if (hasMaterial || userIsAdmin) {
      items.push({ 
        to: `/courses/${courseId}/material`, 
        text: t('courses.supportMaterial'), 
        icon: FileText,
        badge: hasMaterial ? materialTotal : null
      });
    }

    // Agregar Videos si hay videos O si es admin
    const hasVideos = stepsByType.video?.total > 0;
    if (hasVideos || userIsAdmin) {
      items.push({ 
        to: `/courses/${courseId}/videos`, 
        text: t('courses.videosSection'), 
        icon: Video,
        divider: true,
        badge: hasVideos ? stepsByType.video.total : null
      });
    } else if (items.length > 0 && !items[items.length - 1].divider) {
      items[items.length - 1].divider = true;
    }

    items.push(
      { to: `/courses/${courseId}/test-generator`, text: t('courses.testGenerator'), icon: Sparkles },
      { to: `/courses/${courseId}/self-paced-tests`, text: t('courses.selfPacedTests'), icon: Clock }
    );

    return items;
  }, [courseId, courseProgress, t]);

  // Colores del sidebar según el modo
  const primary = getColor('primary', '#3b82f6');
  const secondary = getColor('secondary', '#8b5cf6');
  const accent = getColor('accent', '#f59e0b');
  const textPrimary = getColor('textPrimary', '#f9fafb');
  const secondaryBackground = getColor('secondaryBackground', '#1f2937');
  const background = getColor('background', '#ffffff');
  
  const sidebarColors = {
    // Dark mode: accent text, hover has accent bg + secondaryBg text + accent border with background inner shadow
    // Light mode: primary text, hover has primary bg + white text + border
    text: isDarkMode ? accent : primary,
    hoverBg: isDarkMode ? accent : primary,
    hoverText: isDarkMode ? secondaryBackground : '#ffffff',
    hoverBorder: isDarkMode ? accent : secondary,
    hoverBoxShadow: isDarkMode ? `inset 0 0 0 2px ${background}` : 'inset 0 0 0 2px #ffffff',
    activeBg: isDarkMode ? accent : primary,
    activeText: isDarkMode ? secondaryBackground : '#ffffff',
    activeBorder: isDarkMode ? 'transparent' : primary,
    badgeBg: isDarkMode ? `${accent}30` : `${primary}20`,
    badgeText: isDarkMode ? accent : primary,
  };

  const getLinkStyle = (isActive) => {
    if (isActive) {
      return {
        backgroundColor: sidebarColors.activeBg,
        borderColor: sidebarColors.activeBorder,
        color: sidebarColors.activeText
      };
    }
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: sidebarColors.text
    };
  };

  const handleLinkHover = (e, isEnter, isActive) => {
    if (isActive) return;
    
    if (isEnter) {
      e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
      e.currentTarget.style.borderColor = sidebarColors.hoverBorder;
      e.currentTarget.style.color = sidebarColors.hoverText;
      e.currentTarget.style.boxShadow = sidebarColors.hoverBoxShadow;
      
      const badge = e.currentTarget.querySelector('.badge-course');
      if (badge) {
        badge.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        badge.style.color = sidebarColors.hoverText;
      }
    } else {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
      e.currentTarget.style.color = sidebarColors.text;
      e.currentTarget.style.boxShadow = 'none';
      
      const badge = e.currentTarget.querySelector('.badge-course');
      if (badge) {
        badge.style.backgroundColor = sidebarColors.badgeBg;
        badge.style.color = sidebarColors.badgeText;
      }
    }
  };


  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full lg:relative lg:top-auto lg:left-auto lg:h-full transition-all duration-300 z-50 lg:z-auto shadow-lg lg:shadow-none w-64 ${
          isCollapsed && 'lg:w-20'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ 
          backgroundColor: getColor('background', '#ffffff')
        }}
      >
        <aside className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4">
            <div className={`flex gap-2 mb-2 justify-between ${isCollapsed ? 'lg:justify-center' : 'lg:justify-between'}`} style={{ alignItems: 'center', minHeight: '40px' }}>
              {!isCollapsed && (
                <h2 
                  className="text-base font-bold truncate flex-1"
                  style={{ 
                    color: sidebarColors.text,
                    lineHeight: '24px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={courseName}
                >
                  <span dangerouslySetInnerHTML={{ __html: courseName }} />
                </h2>
              )}
              
              {/* Collapse button for desktop only */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                type="button"
                title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                className="hidden lg:flex transition-colors cursor-pointer flex-shrink-0"
                style={{ 
                  color: sidebarColors.text,
                  width: '24px',
                  height: '24px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  border: 'none',
                  background: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = accent}
                onMouseLeave={(e) => e.currentTarget.style.color = sidebarColors.text}
              >
                {isCollapsed ? <ChevronRight size={24}/> : <ChevronLeft size={24} />}
              </button>
            </div>
            <div 
              className="w-full h-[2px]"
              style={{ backgroundColor: `${sidebarColors.text}40` }}
            />
          </div>

          {/* Global Navigation & Utilities - Mobile Only */}
          <div className="lg:hidden px-2 pb-3 space-y-1.5">
            {/* Main Navigation Buttons */}
            <NavLink
              to="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: 'transparent',
                color: sidebarColors.text,
                border: `1px solid ${sidebarColors.text}40`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = sidebarColors.text;
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-medium">{t('sidebar.studyPlanner')}</span>
            </NavLink>

            <a
              href={`${homeUrl}/mi-cuenta/downloads/`}
              className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: 'transparent',
                color: sidebarColors.text,
                border: `1px solid ${sidebarColors.text}40`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = sidebarColors.text;
              }}
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">{t('sidebar.books')}</span>
            </a>

            <a
              href={homeUrl}
              className="flex items-center gap-2 p-2 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: 'transparent',
                color: sidebarColors.text,
                border: `1px solid ${sidebarColors.text}40`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = sidebarColors.text;
              }}
            >
              <Home className="w-4 h-4" />
              <span className="text-xs font-medium">{t('sidebar.exitCampus')}</span>
            </a>

            {/* Utilities Row */}
            <div className="flex gap-1.5 pt-1.5">
              <button
                onClick={toggleDarkMode}
                className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200"
                style={{ 
                  backgroundColor: 'transparent',
                  color: sidebarColors.text,
                  border: `1px solid ${sidebarColors.text}40`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = sidebarColors.text;
                }}
                title={isDarkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <a
                href={`${homeUrl}/mi-cuenta/edit-account/`}
                className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200"
                style={{ 
                  backgroundColor: 'transparent',
                  color: sidebarColors.text,
                  border: `1px solid ${sidebarColors.text}40`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = sidebarColors.hoverBg;
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = sidebarColors.text;
                }}
                title={t('sidebar.myAccount')}
              >
                <User className="w-4 h-4" />
              </a>

              {logoutUrl && (
                <a
                  href={logoutUrl}
                  className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200"
                  style={{ 
                    backgroundColor: sidebarColors.activeBg,
                    color: '#ffffff',
                    border: `1px solid ${sidebarColors.activeBg}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = sidebarColors.activeBg;
                  }}
                  title={t('sidebar.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Divider */}
            <div 
              className="w-full h-[2px] mt-4"
              style={{ backgroundColor: `${sidebarColors.text}40` }}
            />
          </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-2 overflow-hidden overflow-y-auto">
          {menuItems.map((item) => (
            <React.Fragment key={item.to}>
              <NavLink
                to={item.to}
                end
                onClick={() => setIsMobileMenuOpen(false)}
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
                      style={{ color: isActive ? sidebarColors.activeText : 'currentColor' }}
                    />
                    {!isCollapsed && (
                      <>
                        <span 
                          className="ml-3 text-base flex-1"
                          style={{ color: isActive ? sidebarColors.activeText : 'currentColor' }}
                        >
                          {item.text}
                        </span>
                        {item.badge && (
                          <span 
                            className="badge-course text-xs font-semibold px-2 py-0.5 rounded relative z-10"
                            style={{ 
                              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : sidebarColors.badgeBg,
                              color: isActive ? sidebarColors.activeText : sidebarColors.badgeText
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
                    style={{ backgroundColor: `${sidebarColors.text}40` }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>
      </aside>
      </div>
    </>
  );
};

export default CourseSidebar;
