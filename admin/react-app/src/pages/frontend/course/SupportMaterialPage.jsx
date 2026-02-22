import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useLessons from '../../../hooks/useLessons';
import useCourses from '../../../hooks/useCourses';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import { updateLessonOrderMap } from '../../../api/services/courseService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronRight, ChevronDown, ChevronUp, FileText, File, X, ChevronLeft, Check, CheckCircle, Circle, FolderOpen, Plus, Edit2, Trash2, AlertTriangle, ArrowUpDown, ExternalLink, Download, Lock, EyeOff, Calendar } from 'lucide-react';
import { isUserAdmin } from '../../../utils/userUtils';
import { toast } from 'react-toastify';
import SupportMaterialModal from '../../../components/supportMaterial/SupportMaterialModal';
import LessonModal from '../../../components/lessons/LessonModal';

const SupportMaterialPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  // Colores adaptativos según el modo (misma lógica que sidebar/topbar/messages)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
    // Button colors (same as CourseCard)
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
  };

  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Listen to window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect mobile/tablet based on screen width (< 1024px = tablet or smaller)
  const isMobileOrTablet = windowWidth < 1024;
  
  // Detect touch-capable devices (iOS, Android, etc.)
  const isTouchDevice = useMemo(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Detect Safari browser (has issues with PDF iframes)
  const isSafari = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    // Safari but NOT Chrome (Chrome also includes Safari in UA)
    return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
  }, []);

  // Show PDF fallback (buttons instead of iframe) on mobile/tablet, touch devices, OR Safari
  // PDFs in iframes don't work well on most mobile browsers and Safari
  const showPDFFallback = isMobileOrTablet || isTouchDevice || isSafari;

  // Admin functionality
  const userIsAdmin = isUserAdmin();
  const lessonsManager = useLessons({ autoFetch: false, courseId: courseId });
  const coursesHook = useCourses({ autoFetch: false, status: 'publish,draft,private' });
  
  // Modal states
  const [lessonModalState, setLessonModalState] = useState({
    isOpen: false,
    mode: 'create',
    lesson: null
  });
  const [materialModalState, setMaterialModalState] = useState({
    isOpen: false,
    mode: 'create',
    lessonId: null,
    materialIndex: null,
    material: null
  });
  const [deleteThemeModalState, setDeleteThemeModalState] = useState({
    isOpen: false,
    lesson: null
  });
  const deleteModalOverlayRef = useRef(false);

  // Ordering mode state
  const [isOrderingMode, setIsOrderingMode] = useState(false);
  const [orderingLessons, setOrderingLessons] = useState([]);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Load courses for lesson modal
  useEffect(() => {
    if (userIsAdmin && coursesHook.courses.length === 0 && !coursesHook.loading) {
      coursesHook.fetchCourses(true, { perPage: 100 });
    }
  }, [userIsAdmin]);

  // Hook para manejar el progreso del estudiante
  const {
    isCompleted,
    markComplete,
    loading: progressLoading,
    fetchCompletedContent
  } = useStudentProgress(courseId, false);

  // Fetch completed content when component mounts
  useEffect(() => {
    if (courseId) {
      fetchCompletedContent();
    }
  }, [courseId, fetchCompletedContent]);

  // Fetch lessons function (reusable)
  const fetchLessons = async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const courseIdInt = parseInt(courseId, 10);
      if (isNaN(courseIdInt)) {
        throw new Error('Invalid course ID');
      }
      
      const result = await getCourseLessons(courseIdInt, { perPage: 100 });
      
      // Map lessons with their material steps (show all lessons, even without material)
      const lessonsWithMaterial = (result.data || [])
        .map(lesson => {
          const materialSteps = (lesson.meta?._lesson_steps || [])
            .filter(step => step.type === 'pdf' || step.type === 'text')
            .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
          
          return {
            ...lesson,
            materialSteps
          };
        });
      
      setLessons(lessonsWithMaterial);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [courseId]);

  // Admin handlers
  const handleCreateLesson = () => {
    setLessonModalState({ isOpen: true, mode: 'create', lesson: null });
  };

  const handleEditLesson = (lesson) => {
    setLessonModalState({ isOpen: true, mode: 'edit', lesson: lesson });
  };

  const handleSaveLesson = async (data, nextAction = 'close') => {
    try {
      if (lessonModalState.mode === 'create') {
        const newLesson = await lessonsManager.createLesson({
          ...data,
          courseId: courseId // Ensure it's assigned to current course
        });
        toast.success(t('admin.lessons.createSuccess'));
        
        await fetchLessons();
        
        if (nextAction === 'reset') {
          // Keep modal open to create another
          setLessonModalState({ isOpen: true, mode: 'create', lesson: null });
        } else {
          // Close lesson modal
          setLessonModalState({ isOpen: false, mode: 'create', lesson: null });
        }
      } else {
        await lessonsManager.updateLesson(lessonModalState.lesson.id, data);
        toast.success(t('admin.lessons.updateSuccess'));
        await fetchLessons();
        
        if (nextAction !== 'reset') {
          setLessonModalState({ isOpen: false, mode: 'create', lesson: null });
        }
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error(t('errors.saveLesson'));
      throw error;
    }
  };

  const handleCloseLessonModal = () => {
    setLessonModalState({ isOpen: false, mode: 'create', lesson: null });
  };

  const handleAddMaterial = (lessonId) => {
    setMaterialModalState({
      isOpen: true,
      mode: 'create',
      lessonId: lessonId,
      materialIndex: null,
      material: null
    });
  };

  const handleEditMaterial = (lessonId, materialIndex, material) => {
    setMaterialModalState({
      isOpen: true,
      mode: 'edit',
      lessonId: lessonId,
      materialIndex: materialIndex,
      material: material
    });
  };

  const handleSaveMaterial = async (materialData) => {
    try {
      const lesson = lessons.find(l => l.id === materialModalState.lessonId);
      if (!lesson) throw new Error('Lesson not found');
      
      const currentSteps = lesson.meta?._lesson_steps || [];
      let updatedSteps;
      
      if (materialModalState.mode === 'create') {
        // Add new material (_visible is already inside data from the modal)
        updatedSteps = [
          ...currentSteps,
          {
            ...materialData,
            start_date: materialData.start_date || '',
            order: currentSteps.length
          }
        ];
      } else {
        // Edit existing material
        updatedSteps = currentSteps.map((step, idx) =>
          idx === materialModalState.materialIndex
            ? {
                ...materialData,
                start_date: materialData.start_date || '',
                order: step.order
              }
            : step
        );
      }
      
      // Update lesson with all required fields to avoid validation errors
      await lessonsManager.updateLesson(materialModalState.lessonId, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._course_id || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });
      
      toast.success(t('supportMaterial.materialSaved'));
      await fetchLessons();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error(t('errors.saveMaterial'));
      throw error;
    }
  };

  const handleDeleteMaterial = async (lessonId, materialIndex) => {
    if (!window.confirm(t('supportMaterial.deleteConfirm'))) return;

    try {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) throw new Error('Lesson not found');

      const allSteps = lesson.meta?._lesson_steps || [];
      const deletedStep = allSteps[materialIndex];

      const updatedSteps = allSteps
        .filter((_, idx) => idx !== materialIndex)
        .map((step, idx) => ({ ...step, order: idx }));

      // Update lesson with all required fields to avoid validation errors
      await lessonsManager.updateLesson(lessonId, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._course_id || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });

      // Clear the PDF viewer if the deleted step was open
      if (selectedPDF === deletedStep) {
        setSelectedPDF(null);
        setSelectedLesson(null);
      }

      // Update local state directly — no full refetch needed
      setLessons(prev => prev.map(l => {
        if (l.id !== lessonId) return l;
        const materialSteps = updatedSteps
          .filter(step => step.type === 'pdf' || step.type === 'text')
          .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
        return { ...l, meta: { ...l.meta, _lesson_steps: updatedSteps }, materialSteps };
      }));

      toast.success(t('supportMaterial.materialDeleted'));
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error(t('errors.deleteMaterial'));
    }
  };

  const handleCloseModal = () => {
    setMaterialModalState({
      isOpen: false,
      mode: 'create',
      lessonId: null,
      materialIndex: null,
      material: null
    });
  };

  // Delete theme handlers
  const handleOpenDeleteThemeModal = (lesson) => {
    setDeleteThemeModalState({
      isOpen: true,
      lesson: lesson
    });
  };

  const handleCloseDeleteThemeModal = () => {
    setDeleteThemeModalState({
      isOpen: false,
      lesson: null
    });
  };

  const handleConfirmDeleteTheme = async () => {
    if (!deleteThemeModalState.lesson) return;
    
    try {
      await lessonsManager.deleteLesson(deleteThemeModalState.lesson.id);
      toast.success(t('supportMaterial.themeDeleted'));
      await fetchLessons();
      handleCloseDeleteThemeModal();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error(t('errors.deleteTheme'));
    }
  };

  // Ordering mode handlers
  const handleEnterOrderingMode = () => {
    setOrderingLessons([...lessons]);
    setIsOrderingMode(true);
  };

  const handleExitOrderingMode = () => {
    setIsOrderingMode(false);
    setOrderingLessons([]);
  };

  const handleMoveLessonUp = (index) => {
    if (index === 0) return;
    const newLessons = [...orderingLessons];
    [newLessons[index - 1], newLessons[index]] = [newLessons[index], newLessons[index - 1]];
    setOrderingLessons(newLessons);
  };

  const handleMoveLessonDown = (index) => {
    if (index >= orderingLessons.length - 1) return;
    const newLessons = [...orderingLessons];
    [newLessons[index], newLessons[index + 1]] = [newLessons[index + 1], newLessons[index]];
    setOrderingLessons(newLessons);
  };

  const handleSaveOrder = async () => {
    setIsUpdatingOrder(true);
    try {
      // Build the lesson order map: { lessonId: position }
      const lessonOrderMap = {};
      orderingLessons.forEach((lesson, index) => {
        lessonOrderMap[lesson.id.toString()] = index + 1;
      });

      await updateLessonOrderMap(parseInt(courseId, 10), lessonOrderMap);
      toast.success(t('supportMaterial.orderSaved'));
      
      // Update local lessons state with new order
      setLessons(orderingLessons);
      setIsOrderingMode(false);
      setOrderingLessons([]);
    } catch (error) {
      console.error('Error saving lesson order:', error);
      toast.error(t('errors.saveOrder'));
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // Sentinel date: material is explicitly hidden by admin
  const HIDDEN_DATE = '9999-12-31';

  // Helper: check if a material step is locked by date (excludes sentinel)
  const isMaterialLocked = (step) => {
    if (!step.start_date || step.start_date === HIDDEN_DATE) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const unlockDate = new Date(step.start_date);
    unlockDate.setHours(0, 0, 0, 0);
    return unlockDate > now;
  };

  // Helper: check if a material step is hidden (sentinel date)
  const isMaterialHidden = (step) => {
    return step.start_date === HIDDEN_DATE;
  };

  // Helper: format unlock date for display
  const formatUnlockDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Lesson-level helpers (same logic, reads from meta._start_date)
  const isLessonHidden = (lesson) => {
    return lesson.meta?._start_date === HIDDEN_DATE;
  };

  const isLessonLocked = (lesson) => {
    const startDate = lesson.meta?._start_date;
    if (!startDate || startDate === HIDDEN_DATE) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const unlock = new Date(startDate);
    unlock.setHours(0, 0, 0, 0);
    return unlock > now;
  };

  // Use orderingLessons when in ordering mode, otherwise use lessons
  const displayLessons = isOrderingMode ? orderingLessons : lessons;

  // Create flat array of all material steps for navigation
  // For non-admins, exclude hidden/locked lessons AND hidden/locked materials
  const allMaterialSteps = useMemo(() => {
    return lessons
      .flatMap(lesson =>
        lesson.materialSteps
          .filter(step => {
            if (userIsAdmin) return true;
            if (step.start_date === HIDDEN_DATE) return false;
            if (step.start_date) {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const unlock = new Date(step.start_date);
              unlock.setHours(0, 0, 0, 0);
              if (unlock > now) return false;
            }
            return true;
          })
          .map(step => ({
            step,
            lesson,
            originalStepIndex: (lesson.meta?._lesson_steps || []).findIndex(s =>
              s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
            )
          }))
      );
  }, [lessons, userIsAdmin]);

  const toggleLesson = (lessonId) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const handleOpenPDF = (step, lesson) => {
    setSelectedPDF(step);
    setSelectedLesson(lesson);
  };

  const closePDFViewer = () => {
    setSelectedPDF(null);
    setSelectedLesson(null);
  };

  // 🎯 Auto-mark material as completed when opened (acceso/leído)
  useEffect(() => {
    const markMaterialAsAccessed = async () => {
      if (!selectedPDF || !selectedLesson || !courseId) return;
      
      // Find the original step index for this material
      const stepData = allMaterialSteps.find(
        item => item.step === selectedPDF && item.lesson.id === selectedLesson.id
      );
      
      if (!stepData || stepData.originalStepIndex === -1) return;
      
      const { originalStepIndex } = stepData;
      
      // Check if already completed to avoid unnecessary API calls
      const alreadyCompleted = isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      if (alreadyCompleted) return;
      
      try {
        await markComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
        await fetchCompletedContent();
        
        // Notify sidebar to update badges
        window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { courseId } }));
      } catch (error) {
        console.error('Error auto-marking material as accessed:', error);
      }
    };
    
    markMaterialAsAccessed();
  }, [selectedPDF, selectedLesson, courseId, allMaterialSteps, isCompleted, markComplete, fetchCompletedContent]);

  // Navigation functions
  const getCurrentStepIndex = () => {
    if (!selectedPDF || !selectedLesson) return -1;
    return allMaterialSteps.findIndex(item => 
      item.step === selectedPDF && item.lesson.id === selectedLesson.id
    );
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevItem = allMaterialSteps[currentIndex - 1];
      setSelectedPDF(prevItem.step);
      setSelectedLesson(prevItem.lesson);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < allMaterialSteps.length - 1) {
      const nextItem = allMaterialSteps[currentIndex + 1];
      setSelectedPDF(nextItem.step);
      setSelectedLesson(nextItem.lesson);
    }
  };

  // Check if current step is completed
  const isCurrentStepCompleted = () => {
    if (!selectedLesson || !selectedPDF) return false;
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return false;
    const { originalStepIndex } = allMaterialSteps[currentIndex];
    return isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
  };

  const currentIndex = getCurrentStepIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allMaterialSteps.length - 1;

  // Get PDF URL from step data - Force HTTPS to avoid mixed content issues
  const getPDFUrl = (step) => {
    let url = null;
    
    if (step?.data?.url) {
      url = step.data.url;
    } else if (step?.data?.file_id) {
      // TODO: Fetch media URL from WordPress if needed
      return null;
    }
    
    // Force HTTPS if the page is loaded over HTTPS
    if (url && window.location.protocol === 'https:') {
      url = url.replace(/^http:\/\//i, 'https://');
    }
    
    return url;
  };

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.supportMaterial')}
    >
      <div className="relative h-full">
        {/* Main Content - Lista de materiales */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedPDF ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            {/* Admin: Create Theme Button + Order Themes Button */}
            {userIsAdmin && (
              <div className="max-w-5xl mx-auto px-4 pt-4 pb-2 flex items-center gap-3">
                {!isOrderingMode ? (
                  <>
                    <button
                      onClick={handleCreateLesson}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
                      style={{
                        backgroundColor: pageColors.accent,
                        color: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Plus size={18} />
                      {t('supportMaterial.createTheme')}
                    </button>
                    {lessons.length > 1 && (
                      <button
                        onClick={handleEnterOrderingMode}
                        className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg border"
                        style={{
                          backgroundColor: 'transparent',
                          color: pageColors.text,
                          borderColor: getColor('borderColor', '#e5e7eb'),
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.backgroundColor = pageColors.accent + '15';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <ArrowUpDown size={18} />
                        {t('supportMaterial.orderThemes')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveOrder}
                      disabled={isUpdatingOrder}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg disabled:opacity-50"
                      style={{
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        if (!isUpdatingOrder) e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Check size={18} />
                      {isUpdatingOrder ? t('common.saving') : t('supportMaterial.saveOrder')}
                    </button>
                    <button
                      onClick={handleExitOrderingMode}
                      disabled={isUpdatingOrder}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg border disabled:opacity-50"
                      style={{
                        backgroundColor: 'transparent',
                        color: pageColors.text,
                        borderColor: getColor('borderColor', '#e5e7eb'),
                      }}
                      onMouseEnter={(e) => {
                        if (!isUpdatingOrder) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <X size={18} />
                      {t('common.cancel')}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
            {loading ? (
              <div 
                className="rounded-lg border overflow-hidden"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className="px-4 py-3 flex items-center gap-3 animate-pulse"
                    style={{ borderBottom: i < 3 ? `1px solid ${getColor('borderColor', '#e5e7eb')}` : 'none' }}
                  >
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: pageColors.text + '20' }}></div>
                    <div className="h-4 rounded flex-1" style={{ backgroundColor: pageColors.text + '15', maxWidth: '200px' }}></div>
                    <div className="h-5 w-8 rounded-full" style={{ backgroundColor: pageColors.text + '10' }}></div>
                  </div>
                ))}
              </div>
            ) : lessons.length === 0 ? (
              <div 
                className="text-center py-12 rounded-lg border"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <FolderOpen size={40} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
                <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                  {t('supportMaterial.noMaterials')}
                </p>
                <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                  {t('supportMaterial.noMaterialsDescription')}
                </p>
              </div>
            ) : (
              /* Contenedor único para todos los materiales */
              <div className="py-4">
              <div 
                className="rounded-xl border-2 overflow-hidden"
                style={{ 
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
                }}
              >
                {displayLessons
                  .map((lesson, lessonIndex, filteredLessons) => {
                  const isExpanded = expandedLessons.has(lesson.id);
                  // For non-admins, only count visible & unlocked materials
                  const visibleMaterialSteps = userIsAdmin
                    ? lesson.materialSteps
                    : lesson.materialSteps.filter(s => !isMaterialHidden(s) && !isMaterialLocked(s));
                  const materialCount = visibleMaterialSteps.length;
                  const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');
                  const isFirst = lessonIndex === 0;
                  const isLast = lessonIndex === filteredLessons.length - 1;

                  return (
                    <div 
                      key={lesson.id}
                    >
                      {/* Lesson Header */}
                      <div
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                        style={{ 
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`
                        }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Ordering arrows - only show in ordering mode */}
                          {isOrderingMode && (
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveLessonUp(lessonIndex);
                                }}
                                disabled={isFirst || isUpdatingOrder}
                                className="p-0.5 rounded transition-all disabled:opacity-30"
                                style={{
                                  color: isFirst ? pageColors.textMuted : pageColors.accent
                                }}
                                title={t('supportMaterial.moveUp')}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveLessonDown(lessonIndex);
                                }}
                                disabled={isLast || isUpdatingOrder}
                                className="p-0.5 rounded transition-all disabled:opacity-30"
                                style={{
                                  color: isLast ? pageColors.textMuted : pageColors.accent
                                }}
                                title={t('supportMaterial.moveDown')}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          )}
                          {/* Icon + Title */}
                          <FileText size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                          <span
                            className="font-semibold text-left truncate"
                            style={{ color: pageColors.text }}
                            dangerouslySetInnerHTML={{ __html: lessonTitle }}
                          />
                        </div>
                        
                        {/* Badge count + Admin Actions + Expand/Collapse Button */}
                        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                          {/* Admin: Edit Theme Button - hide in ordering mode */}
                          {userIsAdmin && !isOrderingMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLesson(lesson);
                              }}
                              className="p-1 sm:p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: `${pageColors.accent}15` }}
                              title={t('supportMaterial.editTheme')}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${pageColors.accent}25`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = `${pageColors.accent}15`;
                              }}
                            >
                              <Edit2 size={14} className="sm:w-4 sm:h-4" style={{ color: pageColors.accent }} />
                            </button>
                          )}

                          {/* Admin: Delete Theme Button - hide in ordering mode */}
                          {userIsAdmin && !isOrderingMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteThemeModal(lesson);
                              }}
                              className="p-1 sm:p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                              title={t('supportMaterial.deleteTheme')}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                              }}
                            >
                              <Trash2 size={14} className="sm:w-4 sm:h-4" style={{ color: '#ef4444' }} />
                            </button>
                          )}

                          {/* Admin: Add Material Button - icon only on mobile */}
                          {/* Admin: Add Material Button - hide in ordering mode */}
                          {userIsAdmin && !isOrderingMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddMaterial(lesson.id);
                              }}
                              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5"
                              style={{ 
                                backgroundColor: pageColors.accent,
                                color: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <Plus size={14} />
                              <span className="hidden sm:inline">{t('supportMaterial.addMaterial')}</span>
                            </button>
                          )}

                          <span 
                            className="hidden sm:inline-block text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full"
                            style={{ 
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
                              color: pageColors.text,
                              minWidth: '90px',
                              textAlign: 'center'
                            }}
                          >
                            {materialCount} {materialCount === 1 ? t('supportMaterial.file') : t('supportMaterial.files')}
                          </span>
                          
                          {/* Expand/Collapse Button - icon only on mobile */}
                          <button
                            onClick={() => materialCount > 0 && toggleLesson(lesson.id)}
                            disabled={materialCount === 0}
                            className="p-2 sm:py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1 sm:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            style={{ 
                              backgroundColor: pageColors.buttonBg,
                              color: pageColors.buttonText
                            }}
                            onMouseEnter={(e) => {
                              if (materialCount === 0) return;
                              if (isDarkMode) {
                                e.currentTarget.style.filter = 'brightness(1.15)';
                              } else {
                                e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'none';
                              e.currentTarget.style.backgroundColor = pageColors.buttonBg;
                            }}
                          >
                            {/* Desktop: show full text */}
                            <span className="hidden sm:inline">{isExpanded ? t('supportMaterial.hideLesson') : t('supportMaterial.showLesson')}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Material Steps - expandido */}
                      {isExpanded && (
                        <div>
                          {lesson.materialSteps
                            .filter(step => {
                              // Non-admin users: hide materials that are hidden or date-locked
                              if (userIsAdmin) return true;
                              if (isMaterialHidden(step)) return false;
                              if (isMaterialLocked(step)) return false;
                              return true;
                            })
                            .map((step, index) => {
                            const originalStepIndex = (lesson.meta?._lesson_steps || []).findIndex(s =>
                              s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
                            );
                            const stepCompleted = isCompleted(lesson.id, 'step', lesson.id, originalStepIndex);
                            const isLocked = isMaterialLocked(step);
                            const isHidden = isMaterialHidden(step);

                            return (
                            <div key={step.id || index}>
                              {/* Separador horizontal - full width for first item, with margin for others */}
                              <div
                                className={index > 0 ? "mx-6" : ""}
                                style={{
                                  height: '2px',
                                  backgroundColor: 'rgba(156, 163, 175, 0.2)'
                                }}
                              />
                              <div
                                className="flex items-center gap-3 px-4 sm:px-6 py-4 transition-colors duration-150"
                                style={{
                                  opacity: (isLocked || isHidden) ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = isDarkMode
                                    ? 'rgba(255,255,255,0.05)'
                                    : `${getColor('primary', '#1a202c')}03`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {isLocked ? (
                                  <Lock size={18} style={{ color: pageColors.accent }} className="flex-shrink-0" />
                                ) : isHidden ? (
                                  <EyeOff size={18} style={{ color: '#ef4444' }} className="flex-shrink-0" />
                                ) : (
                                  <div className="flex-shrink-0 p-1">
                                    {stepCompleted ? (
                                      <CheckCircle size={28} style={{ color: '#10b981' }} />
                                    ) : (
                                      <Circle size={28} style={{ color: pageColors.textMuted }} />
                                    )}
                                  </div>
                                )}
                                <span
                                  className="text-sm font-medium flex-1 truncate"
                                  style={{ color: pageColors.text }}
                                >
                                  {step.title}
                                </span>

                                {/* Admin: Status badges for locked/hidden materials */}
                                {userIsAdmin && (isLocked || isHidden) && (
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {isHidden && (
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                                        style={{
                                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                          color: '#ef4444'
                                        }}
                                      >
                                        <EyeOff size={10} />
                                        <span className="hidden sm:inline">{t('supportMaterial.hiddenBadge')}</span>
                                      </span>
                                    )}
                                    {isLocked && (
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                                        style={{
                                          backgroundColor: `${pageColors.accent}15`,
                                          color: pageColors.accent
                                        }}
                                      >
                                        <Calendar size={10} />
                                        <span className="hidden sm:inline">{formatUnlockDate(step.start_date)}</span>
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Admin: Edit and Delete Buttons */}
                                {userIsAdmin && (
                                  <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditMaterial(lesson.id, (lesson.meta?._lesson_steps || []).findIndex(s => s === step), step);
                                      }}
                                      className="p-1 rounded transition-all"
                                      style={{ backgroundColor: `${pageColors.primary}15` }}
                                      title={t('common.edit')}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = `${pageColors.primary}25`;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = `${pageColors.primary}15`;
                                      }}
                                    >
                                      <Edit2 size={14} style={{ color: pageColors.primary }} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMaterial(lesson.id, (lesson.meta?._lesson_steps || []).findIndex(s => s === step));
                                      }}
                                      className="p-1 rounded transition-all"
                                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                                      title={t('common.delete')}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                                      }}
                                    >
                                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                                    </button>
                                  </div>
                                )}

                                {/* Available Button - same style as CourseCard */}
                                {(!isLocked || userIsAdmin) && (
                                  <button
                                    onClick={() => handleOpenPDF(step, lesson)}
                                    className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex-shrink-0"
                                    style={{
                                      backgroundColor: pageColors.buttonBg,
                                      color: pageColors.buttonText
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isDarkMode) {
                                        e.currentTarget.style.filter = 'brightness(1.15)';
                                      } else {
                                        e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.filter = 'none';
                                      e.currentTarget.style.backgroundColor = pageColors.buttonBg;
                                    }}
                                  >
                                    {t('supportMaterial.available')}
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Separador entre lecciones */}
                      {!isLast && (
                        <div 
                          style={{ 
                            height: '2px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
        )}
            </div>
          </div>
        </div>

        {/* PDF Viewer Page - Slides from right */}
        <div 
          className={`absolute inset-0 w-full transition-transform duration-300 ease-in-out ${
            selectedPDF ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {selectedPDF && (
            <div className="h-full flex flex-col w-full overflow-hidden">
              {/* Header Compacto con Breadcrumbs Integrados - Responsive */}
              <div 
                className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                {/* Left: Back button (mobile) + Title */}
                <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                  {/* Mobile: Back button */}
                  <button
                    onClick={closePDFViewer}
                    className="sm:hidden p-2 -ml-1 rounded-lg transition-all flex-shrink-0"
                    style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                  >
                    <ChevronLeft size={20} style={{ color: pageColors.text }} />
                  </button>
                  
                  <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
                    {/* Breadcrumbs compactos - solo desktop */}
                    <nav className="hidden md:flex items-center text-xs space-x-1.5">
                      <Link 
                        to="/courses"
                        className="transition-colors duration-200 hover:underline font-medium"
                        style={{ color: pageColors.text }}
                      >
                        {t('sidebar.studyPlanner')}
                      </Link>
                      <ChevronRight size={12} style={{ color: pageColors.textMuted }} />
                      <Link 
                        to={`/courses/${courseId}/dashboard`}
                        className="transition-colors duration-200 hover:underline font-medium truncate max-w-[150px]"
                        style={{ color: pageColors.text }}
                        dangerouslySetInnerHTML={{ __html: courseName }}
                      />
                      <ChevronRight size={12} style={{ color: pageColors.textMuted }} />
                      <span className="font-medium" style={{ color: pageColors.textMuted }}>
                        {t('courses.supportMaterial')}
                      </span>
                    </nav>
                    {/* Título del material */}
                    <div className="flex items-center gap-2">
                      <FileText size={16} style={{ color: pageColors.accent }} className="flex-shrink-0 hidden sm:block" />
                      <h2 className="text-sm sm:text-base font-medium leading-tight truncate" style={{ color: pageColors.text }}>
                        {selectedPDF.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Right: Navigation buttons - Responsive */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Previous button - Icon only on mobile */}
                  <button
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm font-medium"
                    style={{ 
                      backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`,
                      opacity: hasPrevious ? 1 : 0.4,
                      cursor: hasPrevious ? 'pointer' : 'not-allowed',
                      color: pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (hasPrevious) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('navigation.previous')}
                  >
                    <ChevronLeft size={18} style={{ color: pageColors.text }} />
                    <span className="hidden sm:inline">{t('navigation.previous')}</span>
                  </button>

                  {/* Next button - Icon only on mobile */}
                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 text-sm font-medium"
                    style={{ 
                      backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`,
                      opacity: hasNext ? 1 : 0.4,
                      cursor: hasNext ? 'pointer' : 'not-allowed',
                      color: pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (hasNext) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('navigation.next')}
                  >
                    <span className="hidden sm:inline">{t('navigation.next')}</span>
                    <ChevronRight size={18} style={{ color: pageColors.text }} />
                  </button>

                  {/* Open in new tab button - Always visible */}
                  {getPDFUrl(selectedPDF) && (
                    <a
                      href={getPDFUrl(selectedPDF)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg transition-all"
                      style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                      }}
                      title={t('common.openInNewTab') || 'Abrir en nueva pestaña'}
                    >
                      <ExternalLink size={18} style={{ color: pageColors.text }} />
                    </a>
                  )}

                  {/* Close button - Only on desktop (mobile has back arrow) */}
                  <button
                    onClick={closePDFViewer}
                    className="hidden sm:block p-2 rounded-lg transition-all"
                    style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('common.close') || 'Cerrar'}
                  >
                    <X size={18} style={{ color: pageColors.text }} />
                  </button>
                </div>
              </div>

              {/* PDF Content - With mobile/tablet/Safari fallback */}
              <div className="flex-1 overflow-hidden relative">
                {getPDFUrl(selectedPDF) ? (
                  showPDFFallback ? (
                    // Safari/Mobile/Tablet: Show download buttons (PDF embedding doesn't work well)
                    <div 
                      className="flex flex-col items-center justify-center h-full p-6 text-center"
                      style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
                    >
                      <div 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-6"
                        style={{ backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.text}10` }}
                      >
                        <FileText size={40} style={{ color: pageColors.accent }} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: pageColors.text }}>
                        {selectedPDF.title}
                      </h3>
                      <p className="text-sm mb-6 max-w-sm" style={{ color: pageColors.textMuted }}>
                        {isSafari 
                          ? (t('supportMaterial.safariPdfNote') || 'Safari no puede mostrar PDFs embebidos. Usa los botones para verlo.')
                          : t('supportMaterial.iosFallback')
                        }
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <a
                          href={getPDFUrl(selectedPDF)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                          style={{ 
                            backgroundColor: pageColors.buttonBg,
                            color: pageColors.buttonText
                          }}
                        >
                          <ExternalLink size={18} />
                          {t('common.openInNewTab')}
                        </a>
                        <a
                          href={getPDFUrl(selectedPDF)}
                          download
                          className="px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                          style={{ 
                            backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.text}10`,
                            color: pageColors.text
                          }}
                        >
                          <Download size={18} />
                          {t('common.download')}
                        </a>
                      </div>
                    </div>
                  ) : (
                    // Standard iframe for desktop browsers
                    <iframe
                      src={getPDFUrl(selectedPDF)}
                      className="w-full h-full border-0"
                      title={selectedPDF.title}
                      style={{ minHeight: '100%' }}
                    />
                  )
                ) : selectedPDF.type === 'text' && selectedPDF.data?.content ? (
                  <div 
                    className="px-6 md:px-24 py-6 overflow-y-auto h-full prose max-w-none"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                      color: pageColors.text
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedPDF.data.content }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText size={48} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
                      <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                        {t('supportMaterial.noPreview')}
                      </p>
                      <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                        {t('supportMaterial.noPreviewDescription')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin: Lesson Modal (for creating/editing themes) */}
      {userIsAdmin && (
        <LessonModal
          isOpen={lessonModalState.isOpen}
          onClose={handleCloseLessonModal}
          lesson={lessonModalState.lesson}
          mode={lessonModalState.mode}
          onSave={handleSaveLesson}
          availableCourses={coursesHook.courses.map(c => ({ 
            value: c.id.toString(), 
            label: c.title?.rendered || c.title 
          }))}
          compact={true}
          preselectedCourseId={courseId}
        />
      )}

      {/* Admin: Support Material Modal */}
      {userIsAdmin && (
        <SupportMaterialModal
          isOpen={materialModalState.isOpen}
          onClose={handleCloseModal}
          mode={materialModalState.mode}
          material={materialModalState.material}
          onSave={handleSaveMaterial}
        />
      )}

      {/* Admin: Delete Theme Confirmation Modal */}
      {userIsAdmin && deleteThemeModalState.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999999
          }}
          onMouseDown={(e) => {
            deleteModalOverlayRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && deleteModalOverlayRef.current) {
              handleCloseDeleteThemeModal();
            }
            deleteModalOverlayRef.current = false;
          }}
        >
          <div
            className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center gap-3 px-6 py-4 border-b"
              style={{ borderColor: getColor('borderColor', '#e5e7eb') }}
            >
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: pageColors.text }}>
                {t('supportMaterial.deleteThemeTitle')}
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-sm mb-4" style={{ color: pageColors.text }}>
                {t('supportMaterial.deleteThemeConfirm')}
              </p>
              
              {/* Theme info */}
              <div 
                className="p-4 rounded-lg mb-4"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${getColor('borderColor', '#e5e7eb')}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} style={{ color: pageColors.accent }} />
                  <span 
                    className="font-medium"
                    style={{ color: pageColors.text }}
                    dangerouslySetInnerHTML={{ 
                      __html: deleteThemeModalState.lesson?.title?.rendered || 
                              deleteThemeModalState.lesson?.title || 
                              t('courses.untitledLesson') 
                    }}
                  />
                </div>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>
                  {t('supportMaterial.associatedMaterials', { 
                    count: deleteThemeModalState.lesson?.materialSteps?.length || 0 
                  })}
                </p>
              </div>

              <p className="text-xs" style={{ color: '#ef4444' }}>
                {t('supportMaterial.deleteThemeWarning')}
              </p>
            </div>

            {/* Footer */}
            <div 
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ 
                borderColor: getColor('borderColor', '#e5e7eb'),
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }}
            >
              <button
                type="button"
                onClick={handleCloseDeleteThemeModal}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: pageColors.text,
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTheme}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                <Trash2 size={16} />
                {t('supportMaterial.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </CoursePageTemplate>
  );
};

export default SupportMaterialPage;
