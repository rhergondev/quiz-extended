import React, { useMemo } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, User, LogOut, Home, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Topbar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { getCurrentColors, theme, isDarkMode, toggleDarkMode } = useTheme();
  
  const currentColors = useMemo(() => getCurrentColors(), [theme, isDarkMode, getCurrentColors]);

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;
  const homeUrl = window.qe_data?.home_url || '';
  const campusLogo = window.qe_data?.campus_logo || '';

  const menuItems = [
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
    { to: `${homeUrl}/mi-cuenta/downloads/`, text: t('sidebar.books'), icon: FileText, type: 'external' },
    { to: homeUrl, text: t('sidebar.exitCampus'), icon: Home, type: 'exit' },
  ];

  const getLinkStyle = (isActive) => {
    if (isActive) {
      return {
        backgroundColor: currentColors.primary,
        color: '#ffffff'
      };
    }
    return {
      backgroundColor: 'transparent',
      color: currentColors.primary
    };
  };

  const handleLinkHover = (e, isEnter, isActive) => {
    if (isActive) return;
    
    if (isEnter) {
      e.currentTarget.style.backgroundColor = currentColors.primary;
      e.currentTarget.style.color = '#ffffff';
    } else {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = currentColors.primary;
    }
  };

  return (
    <header 
      style={{ 
        backgroundColor: currentColors.secondaryBackground,
        borderBottom: `1px solid ${currentColors.primary}33`
      }}
      className="w-full"
    >
      <div className="flex items-center justify-between px-10 py-4 w-full max-w-full">
        {/* Left: Logo or Campus Name */}
        <div className="flex items-center">
          {campusLogo ? (
            <img 
              src={campusLogo} 
              alt="Campus" 
              className="h-10 max-w-[200px] object-contain"
            />
          ) : (
            <h1 
              className="text-2xl font-bold m-0"
              style={{ color: currentColors.primary }}
            >
              Campus
            </h1>
          )}
        </div>

        {/* Navigation Menu - Centered */}
        <nav className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          {menuItems.map((item) => {
            if (item.type === 'exit') {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentColors.primary
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentColors.primary
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium"
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
                    <item.icon className="w-5 h-5" style={{ color: isActive ? '#ffffff' : 'currentColor' }} />
                    <span style={{ color: isActive ? '#ffffff' : 'currentColor' }}>{item.text}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Section: Dark Mode Toggle, User Info, Logout */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center p-2 rounded-lg transition-all duration-200"
            style={{ 
              backgroundColor: 'transparent',
              color: currentColors.primary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${currentColors.primary}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={isDarkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Info - Clickable to Account */}
          <a
            href={`${homeUrl}/mi-cuenta/edit-account/`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
            style={{ 
              backgroundColor: 'transparent',
              color: currentColors.primary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${currentColors.primary}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={t('sidebar.myAccount')}
          >
            <User className="w-6 h-6" />
            <div className="flex flex-col">
              <p className="m-0 text-sm font-semibold leading-tight">
                {userName}
              </p>
              <p className="text-xs leading-tight opacity-80 m-0">
                {userEmail}
              </p>
            </div>
          </a>

          {/* Logout - Icon Only */}
          {logoutUrl && (
            <a
              href={logoutUrl}
              className="flex items-center justify-center p-2 rounded-lg transition-all duration-200"
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
