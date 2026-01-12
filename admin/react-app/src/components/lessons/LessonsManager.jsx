import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, BookOpen, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Hooks
import useLessons from '../../hooks/useLessons.js';
import useCourses from '../../hooks/useCourses.js';
import { useTheme } from '../../contexts/ThemeContext';

// Componentes
import LessonCard from './LessonCard';
import LessonModal from './LessonModal';

const LessonsManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // --- ESTADOS PRINCIPALES ---
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'create', lesson: null });
  const [showFilters, setShowFilters] = useState(false);

  // --- HOOKS DE DATOS ---
  const lessonsHook = useLessons({ 
    autoFetch: true, 
    perPage: 24,
    debounceMs: 300 
  });

  const coursesHook = useCourses({ 
    autoFetch: false,
    status: 'publish,draft,private'
  });

  // --- CARGAR DATOS RELACIONADOS ---
  useEffect(() => {
    if (coursesHook.courses.length === 0 && !coursesHook.loading) {
      coursesHook.fetchCourses(true, { perPage: 100 });
    }
  }, []);

  // --- OPCIONES DE CURSOS ---
  const courseOptions = useMemo(() => 
    (coursesHook.courses || []).map(c => ({ 
      value: c.id.toString(), 
      label: c.title?.rendered || c.title 
    }))
  , [coursesHook.courses]);

  // --- MANEJADORES DE MODAL ---
  const openCreateModal = () => {
    setModalState({ isOpen: true, mode: 'create', lesson: null });
  };

  const openEditModal = (lesson) => {
    setModalState({ isOpen: true, mode: 'edit', lesson });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', lesson: null });
  };

  // --- GUARDAR LESSON ---
  const handleSaveLesson = async (data, nextAction = 'close') => {
    try {
      if (modalState.mode === 'create') {
        const newLesson = await lessonsHook.createLesson(data);
        toast.success(t('admin.lessons.createSuccess'));
        if (nextAction === 'reset') {
          // Mantener el modal abierto para crear otro
          setModalState({ isOpen: true, mode: 'create', lesson: null });
        } else {
          // Abrir en modo edición tras crear
          setModalState({ isOpen: true, mode: 'edit', lesson: newLesson });
        }
      } else {
        await lessonsHook.updateLesson(modalState.lesson.id, data);
        toast.success(t('admin.lessons.updateSuccess'));
        if (nextAction !== 'reset') {
          closeModal();
        }
      }
      lessonsHook.refresh();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error(t('errors.saveLesson'));
      throw error;
    }
  };

  // --- ELIMINAR LESSON ---
  const handleDeleteLesson = async (lesson) => {
    const title = lesson.title?.rendered || lesson.title;
    if (!window.confirm(t('admin.lessons.deleteConfirm', { title }))) {
      return;
    }
    
    try {
      await lessonsHook.deleteLesson(lesson.id);
      toast.success(t('admin.lessons.deleteSuccess'));
      lessonsHook.refresh();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error(t('errors.deleteLesson'));
    }
  };

  // --- DUPLICAR LESSON ---
  const handleDuplicateLesson = async (lesson) => {
    toast.info(t('admin.lessons.duplicateComingSoon'));
  };

  // pageColors pattern
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: isDarkMode ? getColor('background', '#0f172a') : '#f5f7fa',
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
  }), [getColor, isDarkMode]);

  // --- RENDERIZADO ---
  const isInitialLoading = !lessonsHook.filters || !lessonsHook.pagination;
  
  if (isInitialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: pageColors.background }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: pageColors.accent }} />
      </div>
    );
  }
  
  const totalLessons = lessonsHook.pagination?.total || 0;
  const activeFiltersCount = [
    lessonsHook.filters?.courseId && lessonsHook.filters.courseId !== 'all',
  ].filter(Boolean).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: pageColors.background }}>
      {/* HEADER: Buscador y Filtros */}
      <div 
        style={{ 
          flexShrink: 0,
          padding: '16px 24px',
          backgroundColor: pageColors.bgCard,
          borderBottom: `1px solid ${pageColors.border}`,
        }}
      >
        {/* Título y botón crear */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: pageColors.text, margin: 0 }}>
              {t('admin.lessons.title')}
            </h1>
            <p style={{ fontSize: '14px', marginTop: '2px', color: pageColors.textMuted, margin: 0 }}>
              {t('admin.lessons.total', { count: totalLessons })}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              fontWeight: '500', 
              color: 'white',
              backgroundColor: pageColors.accent,
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            <Plus size={18} />
            {t('admin.lessons.newLesson')}
          </button>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Buscador */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: pageColors.textMuted }} 
            />
            <input
              type="text"
              value={lessonsHook.filters?.search || ''}
              onChange={(e) => lessonsHook.updateFilter('search', e.target.value)}
              placeholder={t('admin.lessons.searchPlaceholder')}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '10px',
                paddingBottom: '10px',
                borderRadius: '12px',
                fontSize: '14px',
                backgroundColor: pageColors.inputBg,
                border: `1px solid ${pageColors.border}`,
                color: pageColors.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {lessonsHook.loading && (
              <Loader2 
                size={16} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: pageColors.textMuted }} 
              />
            )}
          </div>

          {/* Botón de filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: showFilters || activeFiltersCount > 0 
                ? (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)')
                : pageColors.inputBg,
              border: `1px solid ${showFilters || activeFiltersCount > 0 ? pageColors.accent : pageColors.border}`,
              color: showFilters || activeFiltersCount > 0 ? pageColors.accent : pageColors.text,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Filter size={16} />
            {t('admin.lessons.filters')}
            {activeFiltersCount > 0 && (
              <span 
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white',
                  backgroundColor: pageColors.accent 
                }}
              >
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div 
            style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              borderTop: `1px solid ${pageColors.border}` 
            }}
          >
            {/* Curso */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: pageColors.textMuted }}>
                {t('admin.lessons.course')}
              </label>
              <select
                value={lessonsHook.filters?.courseId || 'all'}
                onChange={(e) => lessonsHook.updateFilter('courseId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${pageColors.border}`,
                  color: pageColors.text,
                  cursor: 'pointer',
                }}
              >
                <option value="all">{t('admin.lessons.allCourses')}</option>
                {courseOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Limpiar filtros */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => {
                    lessonsHook.updateFilter('courseId', 'all');
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '14px',
                    color: pageColors.accent,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                  {t('admin.lessons.clearFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTENIDO: Grid de tarjetas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {lessonsHook.lessons.length === 0 ? (
          // Estado vacío
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              borderRadius: '16px',
              backgroundColor: pageColors.bgCard,
              border: `1px solid ${pageColors.border}`,
            }}
          >
            <div 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '16px',
                backgroundColor: pageColors.hoverBg 
              }}
            >
              <BookOpen style={{ width: '40px', height: '40px', color: pageColors.textMuted, opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: pageColors.text }}>
              {t('admin.lessons.noLessons')}
            </h3>
            <p style={{ fontSize: '14px', marginBottom: '24px', color: pageColors.textMuted }}>
              {lessonsHook.filters?.search 
                ? t('common.noResults')
                : t('admin.lessons.noLessonsDescription')}
            </p>
            {!lessonsHook.filters?.search && (
              <button
                onClick={openCreateModal}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  fontWeight: '500', 
                  color: 'white',
                  backgroundColor: pageColors.accent,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} />
                {t('admin.lessons.newLesson')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid de tarjetas */}
            <div 
              style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              }}
            >
              {lessonsHook.lessons.map(lesson => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  courses={coursesHook.courses}
                  onEdit={openEditModal}
                  onDelete={handleDeleteLesson}
                  onDuplicate={handleDuplicateLesson}
                />
              ))}
            </div>

            {/* Cargar más */}
            {lessonsHook.hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button
                  onClick={() => lessonsHook.loadMoreLessons()}
                  disabled={lessonsHook.loading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    fontWeight: '500',
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.border}`,
                    color: pageColors.text,
                    cursor: lessonsHook.loading ? 'not-allowed' : 'pointer',
                    opacity: lessonsHook.loading ? 0.6 : 1,
                  }}
                >
                  {lessonsHook.loading ? t('common.loading') : t('admin.lessons.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <LessonModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        lesson={modalState.lesson}
        mode={modalState.mode}
        onSave={handleSaveLesson}
        availableCourses={courseOptions}
      />
    </div>
  );
};

export default LessonsManager;
