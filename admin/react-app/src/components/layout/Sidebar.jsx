import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, FileText, User, LogOut, ChevronLeft, ChevronRight, Menu, X, Settings,
  Calendar, ClipboardList, Video, BarChart3, Sparkles, Clock, FolderOpen, History
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getCourseProgress } from '../../api/services/studentProgressService';
import useCourse from '../../hooks/useCourse';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [courseProgress, setCourseProgress] = useState(null);
  const { t } = useTranslation();
  const { getCurrentColors, theme, isDarkMode } = useTheme();
  
  // Make colors reactive to theme changes
  const currentColors = useMemo(() => getCurrentColors(), [theme, isDarkMode, getCurrentColors]);

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;
  const homeUrl = window.qe_data?.home_url || '';

  // Check if we're in a course route
  const isInCourseRoute = location.pathname.startsWith('/courses/') && !!courseId;
  const isCollapsed = isManuallyCollapsed;

  // Fetch specific course when in course route (only pass courseId if in course route)
  const { course } = useCourse(isInCourseRoute ? courseId : null);
  const courseName = course?.title?.rendered || course?.title || '';

  // Fetch course progress when in course route
  useEffect(() => {
    const loadProgress = () => {
      if (isInCourseRoute && courseId) {
        getCourseProgress(courseId)
          .then(progress => {
            setCourseProgress(progress);
          })
          .catch(error => {
            console.error('Error loading course progress:', error);
            setCourseProgress(null);
          });
      } else {
        setCourseProgress(null);
      }
    };

    loadProgress();

    // Listen for progress updates
    const handleProgressUpdate = (event) => {
      if (event.detail?.courseId && event.detail.courseId === courseId) {
        loadProgress();
      }
    };

    window.addEventListener('courseProgressUpdated', handleProgressUpdate);

    return () => {
      window.removeEventListener('courseProgressUpdated', handleProgressUpdate);
    };
  }, [isInCourseRoute, courseId]);

  // Menu items based on context
  const menuItems = useMemo(() => {
    if (isInCourseRoute) {
      // Course menu items with stats from steps_by_type
      const stepsByType = courseProgress?.steps_by_type || {};
      
      const items = [
        { to: `/courses/${courseId}/dashboard`, text: t('courses.dashboard'), icon: BookOpen, type: 'internal', divider: true },
        { to: `/courses/${courseId}/study-planner`, text: t('courses.studyPlanner'), icon: Calendar, type: 'internal', divider: true },
      ];

      // Solo agregar Tests si hay quizzes
      if (stepsByType.quiz?.total > 0) {
        items.push({ 
          to: `/courses/${courseId}/test-browser`, 
          text: t('courses.tests'), 
          icon: ClipboardList, 
          type: 'internal',
          badge: `${stepsByType.quiz.completed}/${stepsByType.quiz.total}`
        });
      }

      // Solo agregar Material de Apoyo si hay PDFs o texto
      const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
      if (materialTotal > 0) {
        items.push({ 
          to: `/courses/${courseId}/material`, 
          text: t('courses.supportMaterial'), 
          icon: FileText, 
          type: 'internal',
          badge: `${(stepsByType.text?.completed || 0) + (stepsByType.pdf?.completed || 0)}/${materialTotal}`
        });
      }

      // Solo agregar Videos si hay videos
      if (stepsByType.video?.total > 0) {
        items.push({ 
          to: `/courses/${courseId}/videos`, 
          text: t('courses.videosSection'), 
          icon: Video, 
          type: 'internal', 
          divider: true,
          badge: `${stepsByType.video.completed}/${stepsByType.video.total}`
        });
      } else if (items[items.length - 1] && !items[items.length - 1].divider) {
        // Si no hay videos pero hay otros items antes, agregar divider al último
        items[items.length - 1].divider = true;
      }

      // Agregar resto de opciones de tests
      items.push(
        { to: `/courses/${courseId}/test-generator`, text: t('courses.testGenerator'), icon: Sparkles, type: 'internal' },
        { to: `/courses/${courseId}/self-paced-tests`, text: t('courses.selfPacedTests'), icon: Clock, type: 'internal' },
        { to: `/courses/${courseId}/test-browser`, text: t('courses.testBrowser'), icon: FolderOpen, type: 'internal', divider: true },
        { to: `/courses/${courseId}/statistics`, text: t('courses.statistics'), icon: BarChart3, type: 'internal' }
      );

      return items;
    }
    
    // Default menu items
    return [
      { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
      { to: `${homeUrl}/mi-cuenta/edit-account/`, text: t('sidebar.myAccount'), icon: Settings, type: 'external' },
      { to: `${homeUrl}/mi-cuenta/downloads/`, text: t('sidebar.books'), icon: FileText, type: 'external' },
    ];
  }, [isInCourseRoute, courseId, homeUrl, t, courseProgress]);

  // Estilos y handlers para MODO NORMAL
  const getNormalLinkStyle = (isActive) => {
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

  const handleNormalLinkHover = (e, isEnter, isActive) => {
    if (isActive) return;
    
    if (isEnter) {
      e.currentTarget.style.backgroundColor = currentColors.primary;
      e.currentTarget.style.borderColor = currentColors.secondary;
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #ffffff';
    } else {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
      e.currentTarget.style.color = currentColors.primary;
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  // Estilos y handlers para MODO CURSO
  const getCourseLinkStyle = (isActive) => {
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

  const handleCourseLinkHover = (e, isEnter, isActive) => {
    if (isActive) return;
    
    if (isEnter) {
      e.currentTarget.style.backgroundColor = currentColors.primary;
      e.currentTarget.style.borderColor = currentColors.secondary;
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #ffffff';
      
      // Cambiar el color del badge en hover
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
      
      // Restaurar el color del badge
      const badge = e.currentTarget.querySelector('.badge-course');
      if (badge) {
        badge.style.backgroundColor = `${currentColors.primary}20`;
        badge.style.color = currentColors.primary;
      }
    }
  };

  const SidebarContent = () => (
    <div 
      className="qe-sidebar-wrapper flex flex-col h-full"
      style={{ 
        backgroundColor: currentColors.backgroundColor,
        color: currentColors.primary
      }}
    >
      <div className={`p-4 transition-all duration-300`}>
        <div className={`flex gap-2 mb-2 ${isCollapsed ? 'justify-center' : isInCourseRoute ? 'justify-between' : 'justify-end'}`} style={{ alignItems: 'center', minHeight: '40px' }}>
          {isInCourseRoute && !isCollapsed && (
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
            onClick={() => setIsManuallyCollapsed(!isManuallyCollapsed)}
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
        {isInCourseRoute && !isCollapsed && (
          <>
            <button
              onClick={() => navigate('/courses')}
              className="px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-semibold w-full"
              style={{ 
                backgroundColor: currentColors.primary,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentColors.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentColors.primary;
              }}
            >
              {t('common.back')}
            </button>
            <div 
              className="w-full h-[2px] mt-4"
              style={{ backgroundColor: `${currentColors.primary}40` }}
            />
          </>
        )}
      </div>
      
      {/* MODO NORMAL - Menu Campus */}
      {!isInCourseRoute && (
        <nav className="flex-1 px-2 space-y-2 overflow-hidden overflow-y-auto">
          {menuItems.map((item) => {
            if (item.type === 'external') {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  className={`flex items-center p-3 transition-all duration-200 rounded-lg border-[3px] border-transparent ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  style={{
                    backgroundColor: 'transparent',
                    color: currentColors.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentColors.primary;
                    e.currentTarget.style.borderColor = currentColors.secondary;
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = currentColors.primary;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title={isCollapsed ? item.text : ''}
                  onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-6 h-6" style={{ color: 'currentColor' }} />
                  {!isCollapsed && (
                    <span className="ml-3 text-lg" style={{ color: 'currentColor' }}>
                      {item.text}
                    </span>
                  )}
                </a>
              );
            }
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => `flex items-center p-3 transition-all duration-200 rounded-lg border-[3px] ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                style={({ isActive }) => getNormalLinkStyle(isActive)}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleNormalLinkHover(e, true, isActive);
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleNormalLinkHover(e, false, isActive);
                }}
                title={isCollapsed ? item.text : ''}
                onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-6 h-6" style={{ color: isActive ? '#ffffff' : 'currentColor' }} />
                    {!isCollapsed && (
                      <span className="ml-3 text-lg" style={{ color: isActive ? '#ffffff' : 'currentColor' }}>
                        {item.text}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* MODO CURSO - Menu Curso */}
      {isInCourseRoute && (
        <nav className="flex-1 px-2 space-y-2 overflow-hidden overflow-y-auto">
          {menuItems.map((item) => (
            <React.Fragment key={item.to}>
              <NavLink
                to={item.to}
                end
                className={({ isActive }) => `flex items-center p-2 transition-all duration-200 rounded-lg border-[2px] ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                style={({ isActive }) => getCourseLinkStyle(isActive)}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleCourseLinkHover(e, true, isActive);
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleCourseLinkHover(e, false, isActive);
                }}
                title={isCollapsed ? item.text : ''}
                onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
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
      )}

      {/* MODO NORMAL - Footer */}
      {!isInCourseRoute && (
        <div className="p-4 mt-auto">
          {logoutUrl && (
            <a
              href={logoutUrl}
              className={`flex items-center p-3 text-lg transition-all duration-200 rounded-lg border-[3px] border-transparent mb-4 w-full ${
                isCollapsed ? 'justify-center' : ''
              }`}
              style={{ color: currentColors.primary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentColors.primary;
                e.currentTarget.style.borderColor = currentColors.secondary;
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = currentColors.primary;
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={isCollapsed ? t('sidebar.logout') : ''}
            >
              <LogOut className="w-6 h-6" style={{ color: 'currentColor' }} />
              {!isCollapsed && <span className="ml-3" style={{ color: 'currentColor' }}>{t('sidebar.logout')}</span>}
            </a>
          )}

          <div 
            className={`flex items-center pt-4 border-t-2 ${isCollapsed ? 'justify-center' : ''}`}
            style={{ borderTopColor: currentColors.primary }}
          >
            <User 
              className="w-8 h-8 flex-shrink-0"
              style={{ color: currentColors.primary }}
            />
            {!isCollapsed && (
              <div className="flex flex-col flex-1 min-w-0 ml-3 justify-center pt-0.5">
                <p 
                  className="m-0 text-base font-semibold truncate leading-tight"
                  style={{ color: currentColors.primary }}
                  title={userName}
                >
                  {userName}
                </p>
                <p 
                  className="text-xs truncate leading-tight opacity-80"
                  style={{ color: currentColors.primary }}
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODO CURSO - Footer */}
      {isInCourseRoute && (
        <div className="p-4 mt-auto">
          {logoutUrl && (
            <a
              href={logoutUrl}
              className={`flex items-center p-2 text-base transition-all duration-200 rounded-lg border-[2px] border-transparent mb-4 w-full ${
                isCollapsed ? 'justify-center' : ''
              }`}
              style={{ color: currentColors.primary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentColors.primary;
                e.currentTarget.style.borderColor = currentColors.secondary;
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = currentColors.primary;
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={isCollapsed ? t('sidebar.logout') : ''}
            >
              <LogOut className="w-5 h-5" style={{ color: 'currentColor' }} />
              {!isCollapsed && <span className="ml-3" style={{ color: 'currentColor' }}>{t('sidebar.logout')}</span>}
            </a>
          )}

          <div 
            className={`flex items-center pt-4 border-t-2 ${isCollapsed ? 'justify-center' : ''}`}
            style={{ borderTopColor: currentColors.primary }}
          >
            <User 
              className="w-6 h-6 flex-shrink-0"
              style={{ color: currentColors.primary }}
            />
            {!isCollapsed && (
              <div className="flex flex-col flex-1 min-w-0 ml-3 justify-center pt-0.5">
                <p 
                  className="m-0 text-sm font-semibold truncate leading-tight"
                  style={{ color: currentColors.primary }}
                  title={userName}
                >
                  {userName}
                </p>
                <p 
                  className="text-xs truncate leading-tight opacity-80"
                  style={{ color: currentColors.primary }}
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        className="md:hidden absolute top-4 left-4 z-20 p-2 rounded-full shadow"
        style={{ 
          color: currentColors.primary,
          backgroundColor: currentColors.secondary
        }}
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu />
      </button>

      <div className={`hidden md:block relative h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <aside className="h-full">
          <SidebarContent />
        </aside>
      </div>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <aside 
            className="relative z-50 w-64 flex flex-col"
            style={{ backgroundColor: currentColors.secondary }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4"
              style={{ color: currentColors.primary }}
            >
              <X />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;