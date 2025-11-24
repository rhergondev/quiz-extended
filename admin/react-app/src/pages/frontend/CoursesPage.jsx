import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox, Menu, X, BookOpen, FileText, Home, Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useCourses from '../../hooks/useCourses';
import CompactCourseCard from '../../components/frontend/CompactCourseCard';
import { isUserAdmin } from '../../utils/userUtils';
import { NavLink } from 'react-router-dom';

const PageState = ({ icon: Icon, title, message }) => (
  <div className="text-center py-16">
    <Icon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
  </div>
);

const CoursesPage = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  const userIsAdmin = isUserAdmin();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const homeUrl = window.qe_data?.home_url || '';
  const logoutUrl = window.qe_data?.logout_url;
  
  const { courses, loading, error } = useCourses({ 
    autoFetch: true,
    embed: true,
    status: 'publish',
    enrolledOnly: !userIsAdmin
  });

  const sortedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    
    return [...courses].sort((a, b) => {
      const positionA = parseInt(a.meta?._course_position) || 0;
      const positionB = parseInt(b.meta?._course_position) || 0;
      
      if (positionA !== positionB) {
        return positionA - positionB;
      }
      
      const titleA = (a.title?.rendered || a.title || '').toLowerCase();
      const titleB = (b.title?.rendered || b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [courses]);

  const renderContent = () => {
    if (loading && sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Loader} 
          title={t('courses.loadingCourses')} 
          message={t('common.processing')} 
        />
      );
    }
  
    if (error) {
      return (
        <PageState 
          icon={AlertTriangle} 
          title={t('notifications.error')} 
          message={error} 
        />
      );
    }
    
    if (!sortedCourses || sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Inbox} 
          title={t('courses.noCourses')} 
          message={t('courses.noCoursesDescription')} 
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {sortedCourses.map(course => (
          <CompactCourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  const menuItems = [
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
    { to: `${homeUrl}/mi-cuenta/downloads/`, text: t('sidebar.books'), icon: FileText, type: 'external' },
    { to: homeUrl, text: t('sidebar.exitCampus'), icon: Home, type: 'exit' },
  ];

  return (
    <div 
      className="h-full w-full overflow-y-auto p-6" 
      style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
    >
      {/* Botón hamburguesa flotante - solo móvil */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className="md:hidden fixed top-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: getColor('primary', '#3b82f6'),
          color: '#ffffff'
        }}
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay del menú */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div 
            className="fixed top-0 right-0 h-full w-80 z-50 shadow-2xl overflow-y-auto"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
          >
            {/* Header del menú */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{
              borderColor: getColor('borderColor', '#e5e7eb')
            }}>
              <h2 className="text-xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                {t('sidebar.menu')}
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: getColor('primary', '#1a202c') }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Opciones del menú */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                if (item.type === 'exit') {
                  return (
                    <a
                      key={item.to}
                      href={item.to}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                      style={{
                        backgroundColor: 'transparent',
                        color: getColor('primary', '#1a202c')
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                      style={{
                        backgroundColor: 'transparent',
                        color: getColor('primary', '#1a202c')
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? getColor('primary', '#1a202c') : 'transparent',
                      color: isActive ? '#ffffff' : getColor('primary', '#1a202c')
                    })}
                    onMouseEnter={(e) => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.text}</span>
                  </NavLink>
                );
              })}

              {/* Separador */}
              <div 
                className="my-4"
                style={{ 
                  height: '1px', 
                  backgroundColor: getColor('borderColor', '#e5e7eb')
                }}
              />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: getColor('primary', '#1a202c')
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDarkMode ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
              </button>

              {/* Mi Cuenta */}
              <a
                href={`${homeUrl}/mi-cuenta/edit-account/`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: getColor('primary', '#1a202c')
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <User className="w-5 h-5" />
                <span>{t('sidebar.myAccount')}</span>
              </a>

              {/* Logout */}
              {logoutUrl && (
                <a
                  href={logoutUrl}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                  style={{
                    backgroundColor: getColor('primary', '#1a202c'),
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
                  }}
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('sidebar.logout')}</span>
                </a>
              )}
            </nav>
          </div>
        </>
      )}

      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default CoursesPage;