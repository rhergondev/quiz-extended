/**
 * AdminTopbar Component
 * 
 * Main navigation bar for the admin panel.
 * Features: Logo, navigation links, dark mode toggle, settings.
 * 
 * @package QuizExtended
 * @subpackage Components/Layout
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard,
  BookOpen, 
  FileText, 
  ClipboardList,
  HelpCircle,
  Book,
  Users,
  MessageSquare,
  Settings,
  Sun, 
  Moon, 
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const AdminTopbar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get logo from WordPress
  const campusLogo = window.qe_data?.campus_logo || '';
  const campusLogoDark = window.qe_data?.campus_logo_dark || '';
  const currentLogo = isDarkMode && campusLogoDark ? campusLogoDark : campusLogo;

  // Theme colors
  const primary = getColor('primary', '#3b82f6');
  const accent = getColor('accent', '#f59e0b');
  const textPrimary = getColor('textPrimary', '#f9fafb');
  const secondaryBackground = getColor('secondaryBackground', '#ffffff');

  const topbarColors = {
    text: isDarkMode ? textPrimary : primary,
    textMuted: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
    accent: accent,
    bg: secondaryBackground,
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  // Navigation items
  const navItems = [
    { to: '/', text: t('admin.dashboard', 'Dashboard'), icon: LayoutDashboard, exact: true },
    { to: '/courses', text: t('admin.courses', 'Cursos'), icon: BookOpen },
    { to: '/lessons', text: t('admin.lessons', 'Lecciones'), icon: FileText },
    { to: '/quizzes', text: t('admin.quizzes', 'Cuestionarios'), icon: ClipboardList },
    { to: '/questions', text: t('admin.questions', 'Preguntas'), icon: HelpCircle },
    { to: '/books', text: t('admin.books', 'Libros'), icon: Book },
    { to: '/students', text: t('admin.students', 'Estudiantes'), icon: Users },
    { to: '/messages', text: t('admin.messages', 'Mensajes'), icon: MessageSquare },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path || location.pathname === '';
    }
    return location.pathname.startsWith(path);
  };

  const getLinkStyle = (path, exact = false) => {
    const active = isActive(path, exact);
    return {
      backgroundColor: 'transparent',
      color: active ? topbarColors.accent : topbarColors.text,
      borderBottom: active ? `2px solid ${topbarColors.accent}` : '2px solid transparent',
    };
  };

  const handleLinkHover = (e, isEnter, path, exact = false) => {
    const active = isActive(path, exact);
    if (isEnter) {
      e.currentTarget.style.color = topbarColors.accent;
      if (!active) {
        e.currentTarget.style.borderBottom = `2px solid ${topbarColors.accent}`;
      }
    } else {
      e.currentTarget.style.color = active ? topbarColors.accent : topbarColors.text;
      if (!active) {
        e.currentTarget.style.borderBottom = '2px solid transparent';
      }
    }
  };

  return (
    <header 
      id="qe-admin-topbar"
      style={{ 
        backgroundColor: topbarColors.bg,
        borderBottom: `1px solid ${topbarColors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
      className="w-full"
    >
      <div className="flex items-center justify-between px-4 lg:px-8 py-3 w-full">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {currentLogo ? (
            <img 
              src={currentLogo} 
              alt="Campus Admin" 
              className="h-9 max-w-[180px] object-contain"
            />
          ) : (
            <h1 
              className="text-xl font-bold m-0"
              style={{ color: topbarColors.text }}
            >
              Campus Admin
            </h1>
          )}
        </div>

        {/* Center: Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-none focus:outline-none focus-visible:outline-none"
                style={getLinkStyle(item.to, item.exact)}
                onMouseEnter={(e) => handleLinkHover(e, true, item.to, item.exact)}
                onMouseLeave={(e) => handleLinkHover(e, false, item.to, item.exact)}
              >
                <Icon size={16} />
                <span>{item.text}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Settings + Dark Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Settings Link - Desktop */}
          <NavLink
            to="/settings"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:outline-none"
            style={{
              color: isActive('/settings') ? topbarColors.accent : topbarColors.text,
              backgroundColor: isActive('/settings') ? topbarColors.hoverBg : 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = topbarColors.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isActive('/settings') ? topbarColors.hoverBg : 'transparent';
            }}
          >
            <Settings size={16} />
          </NavLink>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg transition-all duration-200 focus:outline-none focus-visible:outline-none"
            style={{ 
              color: topbarColors.text,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = topbarColors.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={isDarkMode ? t('common.lightMode', 'Modo claro') : t('common.darkMode', 'Modo oscuro')}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg transition-all duration-200 focus:outline-none focus-visible:outline-none"
            style={{ 
              color: topbarColors.text,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = topbarColors.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden border-t"
          style={{ 
            backgroundColor: topbarColors.bg,
            borderColor: topbarColors.border
          }}
        >
          <nav className="flex flex-col p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to, item.exact);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none"
                  style={{
                    color: active ? topbarColors.accent : topbarColors.text,
                    backgroundColor: active ? topbarColors.hoverBg : 'transparent',
                  }}
                >
                  <Icon size={18} />
                  <span>{item.text}</span>
                </NavLink>
              );
            })}
            {/* Settings in mobile */}
            <NavLink
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-t mt-2 pt-4 focus:outline-none"
              style={{
                color: isActive('/settings') ? topbarColors.accent : topbarColors.text,
                backgroundColor: isActive('/settings') ? topbarColors.hoverBg : 'transparent',
                borderColor: topbarColors.border
              }}
            >
              <Settings size={18} />
              <span>{t('admin.settings', 'Configuración')}</span>
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
};

export default AdminTopbar;
