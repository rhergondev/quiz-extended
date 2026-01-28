import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, AlertTriangle, Inbox, Menu, X, BookOpen, FileText, Home, Sun, Moon, User, LogOut, Book, Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useCourses from '../../hooks/useCourses';
import CompactCourseCard from '../../components/frontend/CompactCourseCard';
import CourseEditorModal from '../../components/courses/CourseEditorModal';
import { isUserAdmin } from '../../utils/userUtils';
import { NavLink } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable wrapper for CompactCourseCard
const SortableCourseCard = ({ course, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: course.id 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : 1,
    touchAction: 'none'
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="w-full flex justify-center"
      {...(onEdit ? { ...attributes, ...listeners } : {})}
    >
      <CompactCourseCard course={course} onEdit={onEdit} />
    </div>
  );
};

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
  
  const homeUrl = window.qe_data?.home_url || '';
  const logoutUrl = window.qe_data?.logout_url;

  // Drag and drop sensors (only for admin)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimiento antes de iniciar el drag
      },
    })
  );

  // Admin modal state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'create', 'edit'
  
  // Local courses state for optimistic drag-and-drop updates
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

  const sortedCourses = useMemo(() => {
    const coursesToSort = localCourses || courses;
    if (!coursesToSort || coursesToSort.length === 0) return [];
    
    return [...coursesToSort].sort((a, b) => {
      const positionA = parseInt(a.meta?._course_position) || 0;
      const positionB = parseInt(b.meta?._course_position) || 0;
      
      if (positionA !== positionB) {
        return positionA - positionB;
      }
      
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

  // Function to get a course by ID from local data
  const getCourseById = (courseId) => {
    const coursesToSearch = localCourses || courses || [];
    return Promise.resolve(coursesToSearch.find(c => c.id === courseId));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || !userIsAdmin || active.id === over.id) return;

    const oldIndex = sortedCourses.findIndex(c => c.id === active.id);
    const newIndex = sortedCourses.findIndex(c => c.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Reordenar el array y actualizar posiciones
    const reorderedCourses = arrayMove(sortedCourses, oldIndex, newIndex).map((course, index) => ({
      ...course,
      meta: {
        ...course.meta,
        _course_position: index
      }
    }));
    
    // Actualización optimista - actualizar UI inmediatamente
    setLocalCourses(reorderedCourses);
    
    // Actualizar posiciones en el servidor en segundo plano
    try {
      const updatePromises = reorderedCourses.map((course, index) => 
        coursesHook.updateCourse(course.id, {
          title: course.title?.rendered || course.title,
          meta: {
            _course_position: index
          }
        })
      );
      
      await Promise.all(updatePromises);
      // No hacer refresh inmediato - confiar en el estado local
      // El refresh se hará cuando el usuario cree/edite/elimine un curso
    } catch (error) {
      console.error('Error updating course positions:', error);
      // Revertir cambios locales en caso de error
      setLocalCourses(null);
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

    const courseGrid = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCourses.map(course => (
          <SortableCourseCard 
            key={course.id} 
            course={course} 
            onEdit={userIsAdmin ? handleEditCourse : null}
          />
        ))}
      </div>
    );

    // Solo admin puede drag-and-drop
    if (userIsAdmin) {
      return (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedCourses.map(c => c.id)} strategy={rectSortingStrategy}>
            {courseGrid}
          </SortableContext>
        </DndContext>
      );
    }

    return courseGrid;
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
    </div>
  );
};

export default CoursesPage;