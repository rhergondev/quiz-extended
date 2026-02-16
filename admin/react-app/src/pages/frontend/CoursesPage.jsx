import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox, Menu, X, BookOpen, FileText, Home, Sun, Moon, User, LogOut, Book, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useCourses from '../../hooks/useCourses';
import CompactCourseCard from '../../components/frontend/CompactCourseCard';
import CourseEditorModal from '../../components/courses/CourseEditorModal';
import { isUserAdmin } from '../../utils/userUtils';
import { NavLink } from 'react-router-dom';
import * as courseService from '../../api/services/courseService';

const PageState = ({ icon: Icon, title, message, colors }) => (
  <div className="text-center py-16">
    <Icon className="mx-auto h-12 w-12" style={{ color: colors?.textMuted || '#9ca3af' }} />
    <h3 className="mt-2 text-lg font-semibold" style={{ color: colors?.text || '#111827' }}>{title}</h3>
    <p className="mt-1 text-sm" style={{ color: colors?.textMuted || '#6b7280' }}>{message}</p>
  </div>
);

const CoursesPage = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();
  const userIsAdmin = isUserAdmin();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [duplicatingCourseId, setDuplicatingCourseId] = useState(null);
  const [duplicationToast, setDuplicationToast] = useState(null); // { type: 'success' | 'error', message: string }

  const homeUrl = window.qe_data?.home_url || '';
  const logoutUrl = window.qe_data?.logout_url;

  // Admin modal state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'

  // Local courses state for optimistic order updates
  const [localCourses, setLocalCourses] = useState(null);

  // Colores adaptativos según el modo (mismo patrón que SupportMaterialPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
  };
  
  // Hook for fetching courses - auto fetch for users, manual for admin CRUD
  const coursesHook = useCourses({ 
    autoFetch: true,
    embed: true,
    status: userIsAdmin ? 'publish,draft,private' : 'publish',
    enrolledOnly: !userIsAdmin
  });

  const { courses, loading, error } = coursesHook;

  // Reset localCourses when courses change from server
  useEffect(() => {
    if (courses && !loading) {
      setLocalCourses(null);
    }
  }, [courses, loading]);

  // Auto-dismiss duplication toast
  useEffect(() => {
    if (duplicationToast) {
      const timer = setTimeout(() => {
        setDuplicationToast(null);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [duplicationToast]);

  const sortedCourses = useMemo(() => {
    const coursesToSort = localCourses || courses;
    if (!coursesToSort || coursesToSort.length === 0) return [];
    
    // Ordenar por menu_order (campo nativo de WordPress)
    return [...coursesToSort].sort((a, b) => {
      const orderA = parseInt(a.menu_order) || 0;
      const orderB = parseInt(b.menu_order) || 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Fallback: ordenar por título si tienen el mismo menu_order
      const titleA = (a.title?.rendered || a.title || '').toLowerCase();
      const titleB = (b.title?.rendered || b.title || '').toLowerCase();
      
      return titleA.localeCompare(titleB);
    });
  }, [courses, localCourses]);

  // Admin handlers
  const handleCreateNew = () => {
    setSelectedCourseId(null);
    setMode('create');
    setIsPanelOpen(true);
  };

  const handleEditCourse = (course) => {
    setSelectedCourseId(course.id);
    setMode('edit');
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setSelectedCourseId(null);
      setMode('view');
      setLocalCourses(null); // Reset local state to get fresh data from server
    }, 300);
  };

  const handleSave = async (courseData) => {
    try {
      if (mode === 'create') {
        await coursesHook.createCourse(courseData);
      } else {
        await coursesHook.updateCourse(selectedCourseId, courseData);
      }
      setLocalCourses(null); // Reset to get fresh data
      coursesHook.refresh();
      handleClosePanel();
    } catch (error) {
      console.error('Error saving course:', error);
      throw error;
    }
  };

  const handleDelete = async (courseId) => {
    try {
      await coursesHook.deleteCourse(courseId);
      setLocalCourses(null); // Reset to get fresh data
      coursesHook.refresh();
      handleClosePanel();
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  };

  const handleDuplicateCourse = async (course) => {
    if (duplicatingCourseId) return; // Prevent multiple simultaneous duplications

    const confirmDuplicate = window.confirm(
      `¿Duplicar el curso "${course.title?.rendered || course.title}"?\n\n` +
      'Se duplicará TODO el contenido:\n' +
      '✓ Lecciones\n' +
      '✓ Cuestionarios\n' +
      '✓ Preguntas\n' +
      '✓ PDFs y materiales\n\n' +
      '✗ NO se duplicarán usuarios ni progreso'
    );

    if (!confirmDuplicate) return;

    setDuplicatingCourseId(course.id);
    setDuplicationToast(null);

    try {
      const result = await courseService.duplicateDeep(course.id);

      setDuplicationToast({
        type: 'success',
        message: `Curso duplicado exitosamente: ${result.lessons_count} lecciones, ${result.quizzes_count} cuestionarios`
      });

      // Refresh course list
      setLocalCourses(null);
      coursesHook.refresh();

    } catch (error) {
      console.error('Error duplicating course:', error);
      setDuplicationToast({
        type: 'error',
        message: `Error al duplicar el curso: ${error.message}`
      });
    } finally {
      setDuplicatingCourseId(null);
    }
  };

  // Function to get a course by ID from local data
  const getCourseById = (courseId) => {
    const coursesToSearch = localCourses || courses || [];
    return Promise.resolve(coursesToSearch.find(c => c.id === courseId));
  };

  // Mover curso hacia la izquierda (antes en el orden)
  const handleMoveUp = async (course) => {
    if (isUpdatingOrder) return;
    
    const currentIndex = sortedCourses.findIndex(c => c.id === course.id);
    if (currentIndex <= 0) return;

    setIsUpdatingOrder(true);
    
    // Intercambiar posiciones - usar índices como orden si menu_order no está definido o es igual
    const previousCourse = sortedCourses[currentIndex - 1];
    
    // Asignar nuevos órdenes basados en índice (el que se mueve toma índice-1, el anterior toma índice actual)
    const newOrderForCurrent = currentIndex - 1;
    const newOrderForPrevious = currentIndex;

    // Actualización optimista
    const newCourses = sortedCourses.map(c => {
      if (c.id === course.id) {
        return { ...c, menu_order: newOrderForCurrent };
      }
      if (c.id === previousCourse.id) {
        return { ...c, menu_order: newOrderForPrevious };
      }
      return c;
    });
    setLocalCourses(newCourses);

    try {
      await courseService.batchUpdateOrders([
        { id: course.id, menu_order: newOrderForCurrent },
        { id: previousCourse.id, menu_order: newOrderForPrevious }
      ]);
    } catch (error) {
      console.error('Error updating order:', error);
      setLocalCourses(null); // Revertir en caso de error
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Mover curso hacia la derecha (después en el orden)
  const handleMoveDown = async (course) => {
    if (isUpdatingOrder) return;
    
    const currentIndex = sortedCourses.findIndex(c => c.id === course.id);
    if (currentIndex >= sortedCourses.length - 1) return;

    setIsUpdatingOrder(true);
    
    // Intercambiar posiciones - usar índices como orden
    const nextCourse = sortedCourses[currentIndex + 1];
    
    // Asignar nuevos órdenes basados en índice (el que se mueve toma índice+1, el siguiente toma índice actual)
    const newOrderForCurrent = currentIndex + 1;
    const newOrderForNext = currentIndex;

    // Actualización optimista
    const newCourses = sortedCourses.map(c => {
      if (c.id === course.id) {
        return { ...c, menu_order: newOrderForCurrent };
      }
      if (c.id === nextCourse.id) {
        return { ...c, menu_order: newOrderForNext };
      }
      return c;
    });
    setLocalCourses(newCourses);

    try {
      await courseService.batchUpdateOrders([
        { id: course.id, menu_order: newOrderForCurrent },
        { id: nextCourse.id, menu_order: newOrderForNext }
      ]);
    } catch (error) {
      console.error('Error updating order:', error);
      setLocalCourses(null); // Revertir en caso de error
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const renderContent = () => {
    if (loading && sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Loader} 
          title={t('courses.loadingCourses')} 
          message={t('common.processing')}
          colors={pageColors}
        />
      );
    }
  
    if (error) {
      return (
        <PageState 
          icon={AlertTriangle} 
          title={t('notifications.error')} 
          message={error}
          colors={pageColors}
        />
      );
    }
    
    if (!sortedCourses || sortedCourses.length === 0) {
      return (
        <PageState 
          icon={Inbox} 
          title={t('courses.noCourses')} 
          message={t('courses.noCoursesDescription')}
          colors={pageColors}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCourses.map((course, index) => (
          <div key={course.id} className="w-full flex justify-center">
            <CompactCourseCard
              course={course}
              onEdit={userIsAdmin ? handleEditCourse : null}
              onDuplicate={userIsAdmin ? handleDuplicateCourse : null}
              onMoveLeft={userIsAdmin ? handleMoveUp : null}
              onMoveRight={userIsAdmin ? handleMoveDown : null}
              isFirst={index === 0}
              isLast={index === sortedCourses.length - 1}
              isUpdating={isUpdatingOrder}
              isDuplicating={duplicatingCourseId === course.id}
            />
          </div>
        ))}
      </div>
    );
  };

  const menuItems = [
    { to: '/courses', text: t('sidebar.studyPlanner'), icon: BookOpen, type: 'internal' },
    { to: '/books', text: t('sidebar.books'), icon: Book, type: 'internal' },
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
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')
            }}>
              <h2 className="text-xl font-bold" style={{ color: pageColors.text }}>
                {t('sidebar.menu')}
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: pageColors.text }}
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
                        color: pageColors.text
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
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
                        color: pageColors.text
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
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
                      backgroundColor: isActive ? pageColors.primary : 'transparent',
                      color: isActive ? '#ffffff' : pageColors.text
                    })}
                    onMouseEnter={(e) => {
                      const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
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
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')
                }}
              />

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium"
                style={{
                  backgroundColor: 'transparent',
                  color: pageColors.text
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
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
                  color: pageColors.text
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}10`;
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
                    backgroundColor: pageColors.primary,
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = pageColors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = pageColors.primary;
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
        {/* Admin header with create button */}
        {userIsAdmin && (
          <div
            className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl p-5"
            style={{
              backgroundColor: getColor('background', '#ffffff'),
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : getColor('borderColor', '#e5e7eb')}`
            }}
          >
            <div>
              <h1 
                className="text-2xl font-bold flex items-center gap-3"
                style={{ color: pageColors.text }}
              >
                <BookOpen className="w-8 h-8" style={{ color: pageColors.accent }} />
                {t('courses.title')}
              </h1>
              <p 
                className="mt-1 text-sm"
                style={{ color: pageColors.textMuted }}
              >
                Gestiona los cursos disponibles en la plataforma
              </p>
            </div>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: pageColors.accent,
                color: '#ffffff',
                boxShadow: `0 4px 10px ${pageColors.accent}30`
              }}
            >
              <Plus size={18} />
              <span>Nuevo Curso</span>
            </button>
          </div>
        )}

        {renderContent()}
      </main>

      {/* Admin Course Editor Modal */}
      {userIsAdmin && (
        <CourseEditorModal
          isOpen={isPanelOpen}
          courseId={selectedCourseId}
          mode={mode}
          onSave={handleSave}
          onClose={handleClosePanel}
          onDelete={handleDelete}
          getCourse={getCourseById}
        />
      )}

      {/* Duplication Toast Notification */}
      {duplicationToast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-md rounded-lg shadow-2xl p-4 flex items-start gap-3 animate-slideInRight"
          style={{
            backgroundColor: duplicationToast.type === 'success'
              ? getColor('accent', '#10b981')
              : '#ef4444',
            border: `2px solid ${duplicationToast.type === 'success' ? '#059669' : '#dc2626'}`
          }}
        >
          {duplicationToast.type === 'success' ? (
            <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ffffff' }} />
          ) : (
            <XCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#ffffff' }} />
          )}
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">
              {duplicationToast.type === 'success' ? 'Duplicación Exitosa' : 'Error en Duplicación'}
            </p>
            <p className="text-white text-xs mt-1 opacity-90">
              {duplicationToast.message}
            </p>
          </div>
          <button
            onClick={() => setDuplicationToast(null)}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;