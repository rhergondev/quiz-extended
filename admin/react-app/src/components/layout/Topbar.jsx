import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, User, LogOut, Home, Sun, Moon, Menu, Bell, MessageSquare, BarChart3, Building2, ChevronDown, CreditCard, Book } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMessagesContextSafe } from '../../contexts/MessagesContext';
import { getUnreadNotificationCount } from '../../api/services/notificationsService';

const Topbar = ({ isMobileMenuOpen, setIsMobileMenuOpen, isInCourseRoute, courseId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Unread notifications count
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      // courseId puede ser string desde la URL, lo convertimos
      const parsedCourseId = courseId ? parseInt(courseId, 10) : null;
      
      if (parsedCourseId && isInCourseRoute) {
        try {
          const response = await getUnreadNotificationCount(parsedCourseId);
          // API returns { success: true, data: { unread_count: N } }
          const count = response?.data?.unread_count || response?.unread_count || 0;
          setUnreadNotifications(count);
        } catch (error) {
          console.error('Error fetching unread notifications:', error);
          setUnreadNotifications(0);
        }
      }
    };

    fetchUnreadCount();

    // Listen for notification read events to update the badge
    const handleNotificationRead = () => {
      fetchUnreadCount();
    };
    
    window.addEventListener('notificationRead', handleNotificationRead);
    window.addEventListener('notificationsMarkedAllRead', handleNotificationRead);
    
    return () => {
      window.removeEventListener('notificationRead', handleNotificationRead);
      window.removeEventListener('notificationsMarkedAllRead', handleNotificationRead);
    };
  }, [courseId, isInCourseRoute]);

  // Get unread messages count from context (safe - returns null if no provider)
  const messagesContext = useMessagesContextSafe();
  const unreadCount = messagesContext?.computed?.unreadMessages || 0;

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;
  const homeUrl = window.qe_data?.home_url || '';
  const campusLogo = window.qe_data?.campus_logo || '';
  const campusLogoDark = window.qe_data?.campus_logo_dark || '';

  // Colores del tema
  const primary = getColor('primary', '#3b82f6');
  const secondary = getColor('secondary', '#8b5cf6');
  const accent = getColor('accent', '#f59e0b');
  const textPrimary = getColor('textPrimary', '#f9fafb');
  const secondaryBackground = getColor('secondaryBackground', '#ffffff');

  // Colores del topbar según el modo
  const topbarColors = {
    text: isDarkMode ? textPrimary : primary,
    accent: accent,
    activeBg: primary,
  };

  // Determinar qué logo usar
  const currentLogo = isDarkMode && campusLogoDark ? campusLogoDark : campusLogo;

  // Menu items when NOT in a course (global navigation)
  const globalMenuItems = [
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
    { to: '/books', text: t('sidebar.books'), icon: Book, type: 'internal' },
    { to: `${homeUrl}/suscripciones`, text: t('sidebar.subscriptions', 'Suscripciones'), icon: CreditCard, type: 'exit' },
    { to: homeUrl, text: t('sidebar.exitCampus'), icon: Home, type: 'exit' },
  ];

  // Menu items when IN a course (course navigation)
  const courseMenuItems = courseId ? [
    { to: `/courses/${courseId}/dashboard`, text: t('courses.dashboard'), icon: BookOpen, type: 'internal' },
    { to: `/courses/${courseId}/notifications`, text: t('header.notifications'), icon: Bell, type: 'internal', badge: unreadNotifications },
    { to: `/courses/${courseId}/messages`, text: t('header.messages'), icon: MessageSquare, type: 'internal', badge: unreadCount },
    { to: `/courses/${courseId}/statistics`, text: t('courses.statistics'), icon: BarChart3, type: 'internal' },
  ] : [];

  // Use course menu if in course route, otherwise global menu
  const menuItems = isInCourseRoute ? courseMenuItems : globalMenuItems;

  const getLinkStyle = (isActive) => {
    return {
      backgroundColor: 'transparent',
      color: isActive ? topbarColors.accent : topbarColors.text,
      borderBottom: isActive ? `2px solid ${topbarColors.accent}` : '2px solid transparent',
      borderRadius: '0',
      paddingBottom: '6px',
    };
  };

  const handleLinkHover = (e, isEnter, isActive) => {
    if (isEnter) {
      e.currentTarget.style.color = topbarColors.accent;
      if (!isActive) {
        e.currentTarget.style.borderBottom = `2px solid ${topbarColors.accent}`;
      }
    } else {
      e.currentTarget.style.color = isActive ? topbarColors.accent : topbarColors.text;
      if (!isActive) {
        e.currentTarget.style.borderBottom = '2px solid transparent';
      }
    }
  };

  return (
    <header 
      id="qe-topbar"
      style={{ 
        backgroundColor: secondaryBackground,
        borderBottom: `1px solid ${topbarColors.text}33`,
        position: 'relative',
        zIndex: 9999
      }}
      className="w-full"
    >
      <div className="flex items-center justify-between px-4 sm:px-10 py-4 w-full max-w-full">
        {/* Left: Hamburger (mobile only, course routes only) + Logo */}
        <div className="flex items-center gap-3">
          {isInCourseRoute && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center p-2 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: 'transparent',
                color: topbarColors.text
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${topbarColors.hoverBg}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          
          {/* Logo clickeable que lleva a la URL principal */}
          <a 
            href={homeUrl || '/'} 
            className="flex items-center transition-opacity hover:opacity-80"
            title="Ir a la página principal"
          >
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt="Campus" 
                className="h-10 max-w-[200px] object-contain"
              />
            ) : (
              <h1 
                className="text-2xl font-bold m-0"
                style={{ color: topbarColors.text }}
              >
                Campus
              </h1>
            )}
          </a>
        </div>

        {/* Navigation Menu - Centered (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          {/* Quick Menu Dropdown - Only show when in course route */}
          {isInCourseRoute && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200"
              style={{ 
                backgroundColor: isDropdownOpen ? `${topbarColors.hoverBg}20` : 'transparent',
                color: topbarColors.text
              }}
              onMouseEnter={(e) => {
                if (!isDropdownOpen) {
                  e.currentTarget.style.backgroundColor = `${topbarColors.hoverBg}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isDropdownOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={t('sidebar.quickMenu')}
            >
              <Building2 className="w-5 h-5" />
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-48 rounded-lg shadow-lg border overflow-hidden z-[9999]"
                style={{ 
                  backgroundColor: secondaryBackground,
                  borderColor: `${topbarColors.text}20`
                }}
              >
                {/* Mis Cursos */}
                <button
                  onClick={() => {
                    navigate('/courses');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-left"
                  style={{ 
                    color: topbarColors.text,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = topbarColors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = topbarColors.text;
                  }}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-medium">{t('sidebar.studyPlanner')}</span>
                </button>
                
                {/* Separator */}
                <div style={{ height: '1px', backgroundColor: `${topbarColors.text}15` }} />
                
                {/* Mis Libros */}
                <button
                  onClick={() => {
                    navigate('/books');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 text-left"
                  style={{ 
                    color: topbarColors.text,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = topbarColors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = topbarColors.text;
                  }}
                >
                  <Book className="w-5 h-5" />
                  <span className="font-medium">{t('sidebar.books')}</span>
                </button>
              </div>
            )}
          </div>
          )}
          {menuItems.map((item) => {
            if (item.type === 'exit') {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200 font-medium outline-none focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    color: topbarColors.text,
                    borderBottom: '2px solid transparent',
                    paddingBottom: '6px'
                  }}
                  onMouseEnter={(e) => handleLinkHover(e, true, false)}
                  onMouseLeave={(e) => handleLinkHover(e, false, false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.text}</span>
                </a>
              );
            }
            
            if (item.type === 'external') {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200 font-medium outline-none focus:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    color: topbarColors.text,
                    borderBottom: '2px solid transparent',
                    paddingBottom: '6px'
                  }}
                  onMouseEnter={(e) => handleLinkHover(e, true, false)}
                  onMouseLeave={(e) => handleLinkHover(e, false, false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.text}</span>
                </a>
              );
            }
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className="flex items-center gap-2 px-4 py-2 transition-all duration-200 font-medium outline-none focus:outline-none"
                style={({ isActive }) => getLinkStyle(isActive)}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleLinkHover(e, true, isActive);
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  handleLinkHover(e, false, isActive);
                }}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {item.badge > 0 && (
                        <span 
                          className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full"
                          style={{ 
                            backgroundColor: accent,
                            color: '#ffffff'
                          }}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span>{item.text}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Section: Dark Mode Toggle, User Icon, Logout - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 relative z-10">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center p-2 rounded-lg transition-all duration-200 outline-none focus:outline-none"
            style={{ 
              backgroundColor: 'transparent',
              color: topbarColors.text
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = topbarColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = topbarColors.text;
            }}
            title={isDarkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Icon - Clickable to Account (no name/email) */}
          <a
            href={`${homeUrl}/mi-cuenta/edit-account/`}
            className="flex items-center justify-center p-2 rounded-lg transition-all duration-200 outline-none focus:outline-none"
            style={{ 
              backgroundColor: 'transparent',
              color: topbarColors.text
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = topbarColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = topbarColors.text;
            }}
            title={t('sidebar.myAccount')}
          >
            <User className="w-6 h-6" />
          </a>

          {/* Logout - Icon Only */}
          {logoutUrl && (
            <a
              href={logoutUrl}
              className="flex items-center justify-center p-2 rounded-lg transition-all duration-200 outline-none focus:outline-none"
              style={{ 
                backgroundColor: isDarkMode ? accent : topbarColors.activeBg,
                color: isDarkMode ? secondaryBackground : '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = isDarkMode ? 'brightness(1.15)' : 'none';
                e.currentTarget.style.backgroundColor = isDarkMode ? accent : accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.backgroundColor = isDarkMode ? accent : topbarColors.activeBg;
              }}
              title={t('sidebar.logout')}
            >
              <LogOut className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
