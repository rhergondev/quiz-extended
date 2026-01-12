/**
 * FrontendAdminLayout Component
 * 
 * Admin layout that works within the frontend app.
 * Provides sidebar navigation for admin sections.
 * 
 * @package QuizExtended
 * @subpackage Components/Layout
 */

import React, { useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  FileQuestion, 
  HelpCircle,
  Users, 
  MessageSquare, 
  Library,
  Settings,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const FrontendAdminLayout = () => {
  const { getColor, isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    bgSidebar: isDarkMode ? getColor('background', '#0f172a') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  }), [getColor, isDarkMode]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/courses', label: 'Cursos', icon: BookOpen },
    { to: '/admin/lessons', label: 'Temas', icon: GraduationCap },
    { to: '/admin/quizzes', label: 'Tests', icon: FileQuestion },
    { to: '/admin/questions', label: 'Preguntas', icon: HelpCircle },
    { to: '/admin/students', label: 'Estudiantes', icon: Users },
    { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare },
    { to: '/admin/books', label: 'Libros', icon: Library },
    { to: '/admin/settings', label: 'Configuración', icon: Settings },
  ];

  const isActiveRoute = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div 
      className="flex h-[calc(100vh-80px)]" 
      style={{ backgroundColor: pageColors.bgPage }}
    >
      {/* Sidebar */}
      <aside 
        className="w-56 flex-shrink-0 flex flex-col"
        style={{ 
          backgroundColor: pageColors.bgSidebar,
          borderRight: `1px solid ${pageColors.border}`,
          boxShadow: pageColors.shadow
        }}
      >
        {/* Back to Campus */}
        <div 
          className="p-4"
          style={{ borderBottom: `1px solid ${pageColors.border}` }}
        >
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none"
            style={{ 
              color: pageColors.textMuted,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = pageColors.hoverBg;
              e.currentTarget.style.color = pageColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = pageColors.textMuted;
            }}
          >
            <ArrowLeft size={16} />
            <span>Volver al Campus</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.to, item.exact);
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none"
                style={{ 
                  backgroundColor: isActive ? `${pageColors.accent}15` : 'transparent',
                  color: isActive ? pageColors.accent : pageColors.text
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div 
          className="p-4 text-center"
          style={{ borderTop: `1px solid ${pageColors.border}` }}
        >
          <span className="text-xs" style={{ color: pageColors.textMuted }}>
            Quiz Extended Admin
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default FrontendAdminLayout;
