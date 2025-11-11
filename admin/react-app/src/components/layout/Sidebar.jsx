import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, Calendar, FileText, BookOpen, Video, User, LogOut, ChevronLeft, ChevronRight, Menu, X, Settings
} from 'lucide-react';
import useUserInbox from '../../hooks/useUserInbox';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { t } = useTranslation();
  const { getCurrentColors } = useTheme(); // Obtener colores actuales del tema
  const currentColors = getCurrentColors();
  
  // Get unread messages count
  const { messages, loading: loadingMessages } = useUserInbox({
    enablePolling: true,
    pollingInterval: 30000
  });
  const unreadCount = messages.filter(msg => msg.status === 'unread').length;

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;
  const homeUrl = window.qe_data?.home_url || '';

  const menuItems = [
    { to: '/', text: t('sidebar.myDesk'), icon: Home, type: 'internal' },
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: Calendar, type: 'internal' },
    { to: '/test', text: t('sidebar.test'), icon: FileText, type: 'internal' },
    { to: `${homeUrl}/mi-cuenta/downloads/`, text: t('sidebar.books'), icon: BookOpen, type: 'external' },
    { to: `${homeUrl}/mi-cuenta/edit-account/`, text: t('sidebar.myAccount'), icon: Settings, type: 'external' },
  ];

  // Función de clases para los links del sidebar
  const getLinkClassName = ({ isActive }) => {
    const baseClasses = `flex items-center p-3 transition-all duration-200 rounded-lg border-[3px]`;
    const collapsedClasses = isCollapsed ? 'justify-center' : '';

    if (isActive) {
      // Estado selected: Fondo primario, texto blanco, border del mismo color
      return `${baseClasses} ${collapsedClasses}`;
    }
    
    // Estado normal: Sin fondo, preparado para hover
    return `${baseClasses} ${collapsedClasses} border-transparent`;
  };

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
      color: currentColors.primary
    };
  };

  const handleLinkHover = (e, isEnter, isActive) => {
    if (isActive) return; // No aplicar hover en elementos activos
    
    if (isEnter) {
      // Hover: Fondo primario + doble borde (blanco interno + secundario externo)
      e.currentTarget.style.backgroundColor = currentColors.primary;
      e.currentTarget.style.borderColor = currentColors.secondary; // Border externo del color de fondo del sidebar
      e.currentTarget.style.color = '#ffffff';
      // Border interno blanco usando box-shadow
      e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #ffffff';
    } else {
      // Volver al estado normal
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.borderColor = 'transparent';
      e.currentTarget.style.color = currentColors.primary;
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  const SidebarContent = () => (
    <div 
      className="qe-sidebar-wrapper flex flex-col h-full"
      style={{ 
        backgroundColor: currentColors.secondary,
        color: currentColors.primary
      }}
    >
      <div className={`p-4 transition-all duration-300`}>
        <div className={`flex items-center h-16 ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed(!isCollapsed); }}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className="transition-colors cursor-pointer"
            style={{ color: currentColors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.color = currentColors.accent}
            onMouseLeave={(e) => e.currentTarget.style.color = currentColors.primary}
          >
            {isCollapsed ? <ChevronRight size={32}/> : <ChevronLeft size={32} />}
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-2">
        {menuItems.map((item) => {
          // Para links externos, usar elemento <a>
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
                <div className="flex items-center relative">
                  <item.icon 
                    className="w-6 h-6" 
                    style={{ color: 'currentColor' }}
                  />
                  {!isCollapsed && (
                    <span 
                      className="ml-4 text-lg" 
                      style={{ color: 'currentColor' }}
                    >
                      {item.text}
                    </span>
                  )}
                </div>
              </a>
            );
          }
          
          // Para links internos, usar NavLink
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={getLinkClassName}
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
              onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
            >
              {({ isActive }) => (
                <div className="flex items-center relative">
                  <item.icon 
                    className="w-6 h-6" 
                    style={{ color: isActive ? '#ffffff' : 'currentColor' }}
                  />
                  {!isCollapsed && (
                    <span 
                      className="ml-4 text-lg" 
                      style={{ color: isActive ? '#ffffff' : 'currentColor' }}
                    >
                      {item.text}
                    </span>
                  )}
                  {/* Show badge next to "Mi Escritorio" if there are unread messages */}
                  {item.to === '/' && unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        {logoutUrl && (
          <a
            href={logoutUrl}
            className={`flex items-center p-3 text-lg transition-all duration-200 rounded-lg border-[3px] border-transparent mb-4 ${isCollapsed ? 'justify-center' : ''}`}
            style={{ color: currentColors.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentColors.primary;
              e.currentTarget.style.borderColor = currentColors.secondary; // Border externo
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #ffffff'; // Border interno blanco
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
            {!isCollapsed && <span className="ml-4" style={{ color: 'currentColor' }}>{t('sidebar.logout')}</span>}
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
    </div>
  );

  return (
    // ... el resto del componente no cambia ...
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

      <div className={`hidden md:block relative h-full transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-64'}`}>
        <aside className="h-full" style={{ backgroundColor: currentColors.background }}>
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