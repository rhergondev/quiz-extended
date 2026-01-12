import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  FileQuestion, 
  Users, 
  MessageSquare, 
  Library,
  Settings,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import dashboardService from '../api/services/dashboardService';

/**
 * Dashboard - Welcome page for Quiz Extended admin panel
 */
const DashboardPage = () => {
  const { getColor, isDarkMode } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  }), [getColor, isDarkMode]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Set fallback stats
        setStats({
          courses: 0,
          lessons: 0,
          quizzes: 0,
          questions: 0,
          students: 0,
          messages: 0
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const quickLinks = [
    { to: '/courses', label: 'Cursos', icon: BookOpen, description: 'Gestiona tus cursos', color: '#3b82f6' },
    { to: '/lessons', label: 'Lecciones', icon: GraduationCap, description: 'Contenido educativo', color: '#8b5cf6' },
    { to: '/quizzes', label: 'Quizzes', icon: FileQuestion, description: 'Evaluaciones', color: '#f59e0b' },
    { to: '/questions', label: 'Preguntas', icon: Sparkles, description: 'Banco de preguntas', color: '#10b981' },
    { to: '/students', label: 'Estudiantes', icon: Users, description: 'Usuarios inscritos', color: '#ec4899' },
    { to: '/messages', label: 'Mensajes', icon: MessageSquare, description: 'Bandeja de entrada', color: '#06b6d4' },
    { to: '/books', label: 'Libros', icon: Library, description: 'Biblioteca digital', color: '#f97316' },
    { to: '/settings', label: 'Configuración', icon: Settings, description: 'Ajustes del plugin', color: '#6b7280' },
  ];

  const statsCards = [
    { key: 'courses', label: 'Cursos', icon: BookOpen, color: '#3b82f6' },
    { key: 'lessons', label: 'Lecciones', icon: GraduationCap, color: '#8b5cf6' },
    { key: 'quizzes', label: 'Quizzes', icon: FileQuestion, color: '#f59e0b' },
    { key: 'questions', label: 'Preguntas', icon: Sparkles, color: '#10b981' },
    { key: 'students', label: 'Estudiantes', icon: Users, color: '#ec4899' },
    { key: 'messages', label: 'Mensajes', icon: MessageSquare, color: '#06b6d4' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]" style={{ backgroundColor: pageColors.bgPage }}>
      {/* TOP BAR */}
      <div 
        className="flex items-center justify-between px-6 py-4" 
        style={{ 
          backgroundColor: pageColors.bgCard, 
          borderBottom: `1px solid ${pageColors.cardBorder}`,
          boxShadow: pageColors.shadowSm
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="p-2.5 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
              boxShadow: `0 4px 12px ${pageColors.accentGlow}`
            }}
          >
            <LayoutDashboard size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: pageColors.text }}>
              Quiz Extended
            </h1>
            <p className="text-xs mt-0.5" style={{ color: pageColors.textMuted }}>
              Panel de administración
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome Section */}
        <div 
          className="p-6 rounded-2xl mb-6"
          style={{ 
            background: `linear-gradient(135deg, ${pageColors.accent}15, ${pageColors.primary}10)`,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: pageColors.text }}>
                ¡Bienvenido a Quiz Extended! 👋
              </h2>
              <p className="text-sm max-w-xl" style={{ color: pageColors.textMuted }}>
                Tu plataforma completa de aprendizaje para WordPress. Gestiona cursos, lecciones, 
                quizzes y mucho más desde este panel de control.
              </p>
            </div>
            <div 
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#d1fae5',
                color: pageColors.success
              }}
            >
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Plugin activo</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.key}
                className="p-4 rounded-xl"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadowSm
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: pageColors.text }}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: pageColors.textMuted }} />
                  ) : (
                    stats?.[stat.key] ?? 0
                  )}
                </div>
                <div className="text-xs" style={{ color: pageColors.textMuted }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: pageColors.text }}>
          <TrendingUp size={16} style={{ color: pageColors.accent }} />
          Acceso Rápido
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group p-4 rounded-xl transition-all hover:scale-[1.02] focus:outline-none"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadowSm
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="p-2.5 rounded-xl transition-all group-hover:scale-110"
                    style={{ backgroundColor: `${link.color}15` }}
                  >
                    <Icon size={20} style={{ color: link.color }} />
                  </div>
                  <ArrowRight 
                    size={16} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: pageColors.textMuted }}
                  />
                </div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: pageColors.text }}>
                  {link.label}
                </h4>
                <p className="text-xs" style={{ color: pageColors.textMuted }}>
                  {link.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Info Footer */}
        <div 
          className="p-4 rounded-xl flex items-center justify-between"
          style={{ 
            backgroundColor: pageColors.bgCard,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          <div className="flex items-center gap-3">
            <Clock size={16} style={{ color: pageColors.textMuted }} />
            <span className="text-xs" style={{ color: pageColors.textMuted }}>
              Quiz Extended v{window.qe_data?.version || '1.0.0'}
            </span>
          </div>
          <a 
            href="https://github.com/your-repo/quiz-extended" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs hover:underline"
            style={{ color: pageColors.accent }}
          >
            Documentación →
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;