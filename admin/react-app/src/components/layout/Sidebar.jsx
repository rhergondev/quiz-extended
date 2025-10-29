import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, Calendar, FileText, BookOpen, Video, User, LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import useUserInbox from '../../hooks/useUserInbox';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { t } = useTranslation();
  
  // Get unread messages count
  const { messages, loading: loadingMessages } = useUserInbox({
    enablePolling: true,
    pollingInterval: 30000
  });
  const unreadCount = messages.filter(msg => msg.status === 'unread').length;

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;

  const menuItems = [
    { to: '/', text: t('sidebar.myDesk'), icon: Home },
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: Calendar },
    { to: '/test', text: t('sidebar.test'), icon: FileText },
  ];

  // ✅ Función de clases actualizada para el efecto de barra vertical
  const getLinkClassName = ({ isActive }) => {
    // Clases base: reservamos espacio para ambas barras (vertical y horizontal)
    const baseClasses = `h-20 flex items-center p-3 transition-colors duration-200 border-l-4 border-b-4`;
    const collapsedClasses = isCollapsed ? 'justify-center' : '';

    if (isActive) {
      // Estado activo: Barra vertical azul, texto primario. La barra inferior es transparente.
      return `${baseClasses} ${collapsedClasses} border-l-primary border-b-transparent text-primary`;
    }
    
    // Estado normal: Barra vertical transparente, barra inferior transparente, y al pasar el ratón, la barra inferior se vuelve dorada.
    return `${baseClasses} ${collapsedClasses} border-l-transparent border-b-transparent text-primary hover:border-b-accent`;
  };

  const SidebarContent = () => (
    <div className="bg-white text-text-main flex flex-col h-full">
      <div className={`p-4 transition-all duration-300`}>
        <div className="flex items-center justify-end h-16">
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed(!isCollapsed); }}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className="text-primary hover:text-accent transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={32}/> : <ChevronLeft size={32} />}
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={getLinkClassName}
            title={isCollapsed ? item.text : ''}
            onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
          >
            <div className="flex items-center relative">
              <item.icon className="w-6 h-6" />
              {!isCollapsed && <span className="ml-4 text-lg">{item.text}</span>}
              {/* Show badge next to "Mi Escritorio" if there are unread messages */}
              {item.to === '/' && unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        {logoutUrl && (
          <a
            href={logoutUrl}
            // Mantenemos la consistencia del efecto hover
            className={`flex items-center p-3 text-lg transition-colors mb-4 border-l-4 border-b-4 border-transparent text-primary hover:border-b-accent ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? t('sidebar.logout') : ''}
          >
            <LogOut className="w-6 h-6" />
            {!isCollapsed && <span className="ml-4">{t('sidebar.logout')}</span>}
          </a>
        )}

        <div 
          className={`flex items-center pt-4 border-t-2 border-primary ${isCollapsed ? 'justify-center' : ''}`}
        >
          <User className="w-8 h-8 text-secondary flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0 ml-3 justify-center pt-0.5">
              <p className="m-0 text-base font-semibold text-primary truncate leading-tight" title={userName}>{userName}</p>
              <p className="text-xs text-text-main truncate leading-tight" title={userEmail}>{userEmail}</p>
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
        className="md:hidden absolute top-4 left-4 z-20 p-2 text-secondary bg-white rounded-full shadow"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu />
      </button>

      <div className={`hidden md:block relative h-full transition-all duration-300 ${isCollapsed ? 'w-24' : 'w-64'}`}>
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
          <aside className="relative z-50 w-64 bg-white flex flex-col">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-primary"
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