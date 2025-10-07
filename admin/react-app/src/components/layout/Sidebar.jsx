import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, BookOpen, Book, User, LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation(); // <-- Hook de i18next

  const [hoveredPath, setHoveredPath] = useState(null);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  const userName = window.qe_data?.user?.name;
  const userEmail = window.qe_data?.user?.email;
  const logoutUrl = window.qe_data?.logout_url;
  const logoUrl = window.qe_data?.logoUrl;

  // Los textos ahora vienen directamente de los archivos de localización
  const navItems = [
    { to: '/', text: t('sidebar.dashboard'), icon: LayoutDashboard },
    { to: '/courses', text: t('sidebar.courses'), icon: BookOpen },
    { to: '/books', text: t('sidebar.books'), icon: Book },
  ];

  const colors = {
    primary: '#24375A',
    grayLight: '#F3F3F3',
    accent: '#D4AF37',
  };

  const getLinkStyle = (isActive, isHovered) => {
    const style = {
      transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
      color: colors.primary,
      backgroundColor: 'transparent',
      border: '2px solid transparent',
    };

    if (isHovered) {
      style.backgroundColor = colors.primary;
      style.color = colors.grayLight;
    }
    
    if (isActive) {
      style.backgroundColor = colors.primary;
      style.color = colors.grayLight;
      style.borderColor = colors.accent;
    }
    
    return style;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-light">
      
      <div className={`p-4 transition-all duration-300`}>
        <div className="flex items-center justify-end h-16">

          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            className="!text-primary hover:!text-[--color-accent] transition-colors !bg-transparent"
            style={{ '--color-accent': colors.accent }}
          >
            {isCollapsed ? <ChevronRight size={32}/> : <ChevronLeft size={32} />}
          </button>
        </div>
        <div className={`mr-auto mt-2 transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            {logoUrl ? (
              // CAMBIO: Texto 'alt' localizado
              <img src={logoUrl} alt={t('sidebar.logoAlt')} className="h-12 w-auto" />
            ) : (
              // CAMBIO: Texto de fallback localizado
              <span className="font-semibold text-primary">{t('sidebar.logoText')}</span>
            )}
          </div>
      </div>
      
      <nav className="flex-1 px-2 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={`flex items-center p-3 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}
            onMouseEnter={() => setHoveredPath(item.to)}
            onMouseLeave={() => setHoveredPath(null)}
            style={({ isActive }) => getLinkStyle(isActive, hoveredPath === item.to)}
            title={isCollapsed ? item.text : ''}
            onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
          >
            <item.icon className="w-6 h-6" />
            {!isCollapsed && <span className="ml-4 text-lg">{item.text}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        {logoutUrl && (
          <a
            href={logoutUrl}
            className={`flex items-center p-3 text-lg rounded-lg transition-colors mb-4 ${isCollapsed ? 'justify-center' : ''}`}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            style={getLinkStyle(false, isLogoutHovered)}
            title={isCollapsed ? t('sidebar.logout') : ''}
          >
            <LogOut className="w-6 h-6" />
            {!isCollapsed && <span className="ml-4">{t('sidebar.logout')}</span>}
          </a>
        )}

        <div 
          className={`flex items-center pt-4 border-t-2 ${isCollapsed ? 'justify-center' : ''}`}
          style={{ borderColor: colors.primary }}
        >
          <User className="w-8 h-8 text-gray-400 flex-shrink-0" />
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
    <>
      <button
        className="md:hidden absolute top-4 left-4 z-20 p-2 text-gray-600 bg-white rounded-full shadow"
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
          <aside className="relative z-50 w-64 bg-gray-light flex flex-col">
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