// src/components/lessons/LessonModal.jsx - Simplified without Tests tab

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { uploadMedia, validateFile } from '../../api/services/mediaService';
import { openMediaSelector } from '../../api/utils/mediaUtils';
import {
  X, Plus, Trash2, GripVertical, Video, FileText, Download, Save,
  HelpCircle, AlertCircle, UploadCloud, CheckCircle, Search, Edit2, ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '../../contexts/ThemeContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Importar hooks para búsqueda de quizzes en steps
import useQuizzes from '../../hooks/useQuizzes';
import { getAll as getQuizzes } from '../../api/services/quizService';

const LessonModal = ({
  isOpen,
  onClose,
  lesson = null,
  onSave,
  mode = 'create',
  availableCourses = [],
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    courseId: '',
    description: '',
    lessonOrder: '1',
    completionCriteria: 'view_all',
    steps: []
  });
  const [errors, setErrors] = useState({});
  
  // Step modal state
  const [stepModalState, setStepModalState] = useState({ 
    isOpen: false, 
    mode: 'create', 
    step: null 
  });

  // Tests asociados (solo para mostrar links)
  const [assignedQuizIds, setAssignedQuizIds] = useState([]);
  const [loadedAssignedQuizzes, setLoadedAssignedQuizzes] = useState([]);
  const [loadingAssignedQuizzes, setLoadingAssignedQuizzes] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Colors
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: '#3b82f6',
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1e293b') : '#ffffff',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    inputBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    overlay: 'rgba(0, 0, 0, 0.5)',
    success: '#10b981',
    danger: '#ef4444',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
  }), [getColor, isDarkMode]);

  // Load lesson data
  useEffect(() => {
    if (lesson && mode !== 'create') {
      setFormData({
        title: lesson.title?.rendered || lesson.title || '',
        content: lesson.content?.rendered || lesson.content || '',
        courseId: lesson.meta?._course_id?.toString() || '',
        description: lesson.meta?._lesson_description || '',
        lessonOrder: lesson.meta?._lesson_order?.toString() || '1',
        completionCriteria: lesson.meta?._completion_criteria || 'view_all',
        // Ensure each step has a unique ID for proper deletion/editing
        steps: (lesson.meta?._lesson_steps || []).map((step, index) => ({
          ...step,
          id: step.id || `step_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
        }))
      });
      // Load assigned quiz IDs
      const quizIds = lesson.meta?._assigned_quiz_ids || [];
      setAssignedQuizIds(quizIds);
      setLoadedAssignedQuizzes([]);
    } else if (mode === 'create') {
      setFormData({
        title: '',
        content: '',
        courseId: '',
        description: '',
        lessonOrder: '1',
        completionCriteria: 'view_all',
        steps: []
      });
      setAssignedQuizIds([]);
      setLoadedAssignedQuizzes([]);
    }
  }, [lesson, mode]);

  // Fetch assigned quizzes when IDs change - using direct service call
  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      if (assignedQuizIds.length === 0) {
        setLoadedAssignedQuizzes([]);
        return;
      }
      
      setLoadingAssignedQuizzes(true);
      try {
        // Fetch directly using the service
        const result = await getQuizzes({ 
          include: assignedQuizIds.join(','), 
          per_page: 100,
          status: 'publish,draft,private'
        });
        
        // Map the results to match assigned IDs order
        const quizzesData = result.data || result || [];
        const loaded = assignedQuizIds.map(id => {
          const found = quizzesData.find(q => q.id === id);
          return found || { id, title: `Test #${id}`, _notFound: true };
        });
        setLoadedAssignedQuizzes(loaded);
      } catch (error) {
        console.error('Error fetching assigned quizzes:', error);
        // Show IDs as fallback
        setLoadedAssignedQuizzes(assignedQuizIds.map(id => ({ id, title: `Test #${id}`, _notFound: true })));
      } finally {
        setLoadingAssignedQuizzes(false);
      }
    };
    
    fetchAssignedQuizzes();
  }, [assignedQuizIds]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t('admin.lessonModal.titleRequired');
    if (!formData.courseId) newErrors.courseId = t('admin.lessonModal.courseRequired');
    if (formData.steps.length === 0) newErrors.steps = t('admin.lessonModal.stepsRequired');
    const invalidSteps = formData.steps.filter(step => !step.title?.trim());
    if (invalidSteps.length > 0) newErrors.steps = t('admin.lessonModal.allStepsMustHaveTitle');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSave = async (nextAction = 'close') => {
    if (!validateForm()) {
      setActiveTab(0); // Switch to config tab if there are errors
      return;
    }
    try {
      const lessonDataForApi = {
        title: formData.title,
        content: formData.content,
        status: 'publish',
        courseId: parseInt(formData.courseId),
        description: formData.description,
        lessonOrder: parseInt(formData.lessonOrder),
        completionCriteria: formData.completionCriteria,
        steps: formData.steps.map(({ id, ...restOfStep }) => restOfStep),
        assignedQuizIds: assignedQuizIds,
      };
      await onSave(lessonDataForApi, nextAction);
      if (nextAction === 'reset') {
        setFormData({
          title: '',
          content: '',
          courseId: '',
          description: '',
          lessonOrder: '1',
          completionCriteria: 'view_all',
          steps: []
        });
        setAssignedQuizIds([]);
        setErrors({});
      }
    } catch (error) {
      setErrors({ submit: error.message || t('admin.lessonModal.saveError') });
    }
  };

  // Step management
  const generateStepId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const openAddStepModal = () => {
    setStepModalState({ isOpen: true, mode: 'create', step: null });
  };

  const openEditStepModal = (step) => {
    setStepModalState({ isOpen: true, mode: 'edit', step });
  };

  const closeStepModal = () => {
    setStepModalState({ isOpen: false, mode: 'create', step: null });
  };

  const handleSaveStep = (stepData, stepId) => {
    if (stepId) {
      // Edit existing step
      setFormData(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === stepId 
            ? { ...step, ...stepData } 
            : step
        )
      }));
    } else {
      // Add new step
      const newStepWithId = { ...stepData, id: generateStepId(), order: formData.steps.length + 1 };
      setFormData(prev => ({ ...prev, steps: [...prev.steps, newStepWithId] }));
    }
  };

  const removeStep = (stepId) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId).map((step, index) => ({ ...step, order: index + 1 }))
    }));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = formData.steps.findIndex(step => step.id === active.id);
      const newIndex = formData.steps.findIndex(step => step.id === over.id);
      const newSteps = arrayMove(formData.steps, oldIndex, newIndex);
      const updatedSteps = newSteps.map((step, index) => ({ ...step, order: index + 1 }));
      setFormData(prev => ({ ...prev, steps: updatedSteps }));
    }
  };

  // Navigate to Tests page to edit a quiz
  const openQuizInTestsPage = (quizId) => {
    // Close modal and navigate to tests page with the quiz ID
    onClose();
    // Use hash-based navigation that the SPA router will pick up
    window.location.hash = `tests?edit=${quizId}`;
  };

  // Remove a quiz from assigned tests
  const removeQuizFromLesson = (quizId) => {
    setAssignedQuizIds(prev => prev.filter(id => id !== quizId));
    setLoadedAssignedQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  // Assigned quizzes data
  const assignedQuizzes = loadedAssignedQuizzes;

  const stepTypes = {
    video: { label: t('admin.lessonModal.stepTypes.video'), icon: Video, color: 'text-blue-600 bg-blue-50' },
    text: { label: t('admin.lessonModal.stepTypes.text'), icon: FileText, color: 'text-green-600 bg-green-50' },
    pdf: { label: t('admin.lessonModal.stepTypes.pdf'), icon: Download, color: 'text-red-600 bg-red-50' },
    quiz: { label: t('admin.lessonModal.stepTypes.quiz'), icon: HelpCircle, color: 'text-purple-600 bg-purple-50' }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const modalTitle = isCreateMode 
    ? t('admin.lessonModal.createTitle') 
    : mode === 'edit' 
      ? t('admin.lessonModal.editTitle') 
      : t('admin.lessonModal.viewTitle');

  // Common styles
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `2px solid ${pageColors.inputBorder}`,
    backgroundColor: pageColors.inputBg,
    color: pageColors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: pageColors.text,
  };

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100001,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '60px',
          backgroundColor: pageColors.overlay,
          overflowY: 'auto',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '900px',
            margin: '0 16px 40px',
            backgroundColor: pageColors.cardBg,
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: `1px solid ${pageColors.inputBorder}`,
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
              {modalTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: pageColors.hoverBg,
                color: pageColors.textMuted,
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Errors */}
              {errors.submit && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                  color: pageColors.danger,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <AlertCircle size={16} />
                  <span style={{ fontSize: '14px' }}>{errors.submit}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.title')} *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={t('admin.lessonModal.titlePlaceholder')}
                  style={{
                    ...inputStyle,
                    borderColor: errors.title ? pageColors.danger : pageColors.inputBorder,
                  }}
                  disabled={isViewMode}
                />
                {errors.title && (
                  <p style={{ marginTop: '4px', fontSize: '12px', color: pageColors.danger }}>{errors.title}</p>
                )}
              </div>

                {/* Course */}
                <div>
                  <label style={labelStyle}>{t('admin.lessonModal.course')} *</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => handleInputChange('courseId', e.target.value)}
                    style={{
                      ...selectStyle,
                      borderColor: errors.courseId ? pageColors.danger : pageColors.inputBorder,
                    }}
                    disabled={isViewMode}
                  >
                    <option value="">{t('admin.lessonModal.selectCourse')}</option>
                    {availableCourses.map(course => (
                      <option key={course.value} value={course.value}>{course.label}</option>
                    ))}
                  </select>
                  {errors.courseId && (
                    <p style={{ marginTop: '4px', fontSize: '12px', color: pageColors.danger }}>{errors.courseId}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>{t('admin.lessonModal.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    placeholder={t('admin.lessonModal.descriptionPlaceholder')}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    disabled={isViewMode}
                  />
                </div>

                {/* Order & Completion Criteria */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>{t('admin.lessonModal.lessonOrder')}</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.lessonOrder}
                      onChange={(e) => handleInputChange('lessonOrder', e.target.value)}
                      style={inputStyle}
                      disabled={isViewMode}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('admin.lessonModal.completionCriteria')}</label>
                    <select
                      value={formData.completionCriteria}
                      onChange={(e) => handleInputChange('completionCriteria', e.target.value)}
                      style={selectStyle}
                      disabled={isViewMode}
                    >
                      <option value="view_all">{t('admin.lessonModal.completionViewAll')}</option>
                      <option value="pass_quiz">{t('admin.lessonModal.completionPassQuiz')}</option>
                      <option value="complete_steps">{t('admin.lessonModal.completionCompleteSteps')}</option>
                    </select>
                  </div>
                </div>

                {/* Steps Section */}
                <div style={{ 
                  paddingTop: '20px', 
                  borderTop: `1px solid ${pageColors.inputBorder}`,
                  marginTop: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
                        {t('admin.lessonModal.stepsTitle')} *
                      </h4>
                      <p style={{ fontSize: '13px', color: pageColors.textMuted, marginTop: '4px' }}>
                        {t('admin.lessonModal.stepsDescription')}
                      </p>
                    </div>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={openAddStepModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: pageColors.accent,
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={16} />
                        {t('admin.lessonModal.addStep')}
                      </button>
                    )}
                  </div>

                  {errors.steps && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                      color: pageColors.danger,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                    }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '14px' }}>{errors.steps}</span>
                    </div>
                  )}

                  {formData.steps.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={formData.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {formData.steps.map((step) => (
                            <SortableStepItem 
                              key={step.id} 
                              step={step}
                              onRemove={removeStep}
                              onEdit={openEditStepModal}
                              isViewMode={isViewMode} 
                              stepTypes={stepTypes} 
                              pageColors={pageColors}
                              isDarkMode={isDarkMode}
                              t={t} 
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div 
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        borderRadius: '12px',
                        border: `2px dashed ${pageColors.inputBorder}`,
                        backgroundColor: pageColors.hoverBg,
                      }}
                    >
                      <HelpCircle size={40} style={{ color: pageColors.textMuted, opacity: 0.5, margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text, marginBottom: '8px' }}>
                        {t('admin.lessonModal.noSteps')}
                      </h3>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={openAddStepModal}
                          style={{
                            marginTop: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: pageColors.accent,
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={16} />
                          {t('admin.lessonModal.addFirstStep')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Assigned Tests Section - Read only with links */}
                {assignedQuizIds.length > 0 && (
                  <div>
                    <label style={labelStyle}>{t('admin.lessonModal.assignedTests')} ({assignedQuizIds.length})</label>
                    {loadingAssignedQuizzes ? (
                      <p style={{ fontSize: '13px', color: pageColors.textMuted }}>{t('common.loading')}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {assignedQuizzes.map(quiz => (
                          <div
                            key={quiz.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${pageColors.inputBorder}`,
                              backgroundColor: pageColors.inputBg,
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: '500', color: pageColors.text }}>
                              {quiz.title?.rendered || quiz.title}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => openQuizInTestsPage(quiz.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${pageColors.primary}`,
                                  backgroundColor: 'transparent',
                                  color: pageColors.primary,
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                title={t('admin.lessonModal.editTestInPage')}
                              >
                                <ExternalLink size={14} />
                                {t('common.edit')}
                              </button>
                              {!isViewMode && (
                                <button
                                  type="button"
                                  onClick={() => removeQuizFromLesson(quiz.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: `1px solid ${pageColors.danger}`,
                                    backgroundColor: 'transparent',
                                    color: pageColors.danger,
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                  title={t('admin.lessonModal.removeTest')}
                                >
                                  <Trash2 size={14} />
                                  {t('common.remove')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: '12px', color: pageColors.textMuted, marginTop: '6px' }}>
                      {t('admin.lessonModal.testsEditHint')}
                    </p>
                  </div>
                )}
              </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderTop: `1px solid ${pageColors.inputBorder}`,
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${pageColors.inputBorder}`,
                  backgroundColor: 'transparent',
                  color: pageColors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                {isCreateMode && (
                  <button
                    type="button"
                    onClick={() => handleSave('reset')}
                    disabled={isLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                      color: pageColors.accent,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {t('admin.lessonModal.saveAndNew')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave('close')}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: pageColors.accent,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <Save size={16} />
                  {isLoading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step Modal - for creating and editing steps */}
      <StepModal
        isOpen={stepModalState.isOpen}
        onClose={closeStepModal}
        onSave={handleSaveStep}
        step={stepModalState.step}
        mode={stepModalState.mode}
        stepTypes={stepTypes}
        pageColors={pageColors}
        isDarkMode={isDarkMode}
        t={t}
      />
    </>,
    document.body
  );
};



// Simplified Step Item - No expansion, edit via modal
const SortableStepItem = ({ step, onRemove, onEdit, isViewMode, stepTypes, pageColors, isDarkMode, t }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const Icon = stepTypes[step.type]?.icon || FileText;
  const config = stepTypes[step.type] || stepTypes.text;
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Get preview info based on step type
  const getPreviewInfo = () => {
    switch (step.type) {
      case 'video':
        return step.data?.video_url ? step.data.video_url.substring(0, 40) + '...' : t('admin.lessonModal.noContent');
      case 'text':
        if (step.data?.content) {
          const textOnly = step.data.content.replace(/<[^>]*>/g, '');
          return textOnly.substring(0, 50) + (textOnly.length > 50 ? '...' : '');
        }
        return t('admin.lessonModal.noContent');
      case 'pdf':
        return step.data?.filename || t('admin.lessonModal.noContent');
      case 'quiz':
        return step.data?.quiz_id ? `Test #${step.data.quiz_id}` : t('admin.lessonModal.noContent');
      default:
        return '';
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        backgroundColor: pageColors.inputBg,
        border: `1px solid ${pageColors.inputBorder}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          {!isViewMode && (
            <button 
              type="button"
              {...attributes} 
              {...listeners} 
              style={{
                cursor: 'grab',
                color: pageColors.textMuted,
                background: 'none',
                border: 'none',
                padding: '4px',
                flexShrink: 0,
              }}
            >
              <GripVertical size={18} />
            </button>
          )}
          <div 
            style={{
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
              flexShrink: 0,
            }}
          >
            <Icon size={16} style={{ color: '#6366f1' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text, margin: 0 }}>{step.title}</h4>
            <p style={{ 
              fontSize: '12px', 
              color: pageColors.textMuted, 
              margin: '2px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {config.label} • {getPreviewInfo()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onEdit(step)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Edit2 size={12} />
            {t('common.edit')}
          </button>
          {!isViewMode && (
            <button
              type="button"
              onClick={() => onRemove(step.id)}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Step Modal - For creating and editing steps with all content fields
const StepModal = ({ isOpen, onClose, onSave, step, mode, stepTypes, pageColors, isDarkMode, t }) => {
  const [formData, setFormData] = useState({
    type: 'text',
    title: '',
    data: {}
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const quillRef = useRef(null);
  
  // Quiz search state
  const [quizSearchQuery, setQuizSearchQuery] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const quizSearchHook = useQuizzes();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && step) {
        setFormData({
          type: step.type || 'text',
          title: step.title || '',
          data: step.data || {}
        });
        // If editing a quiz step, load the quiz info
        if (step.type === 'quiz' && step.data?.quiz_id) {
          quizSearchHook.fetchQuizzes({ include: [step.data.quiz_id] }).then(() => {
            const quiz = quizSearchHook.quizzes.find(q => q.id === step.data.quiz_id);
            if (quiz) {
              setSelectedQuiz(quiz);
            }
          });
        } else {
          setSelectedQuiz(null);
        }
      } else {
        setFormData({
          type: 'text',
          title: '',
          data: {}
        });
        setSelectedQuiz(null);
      }
      setError(null);
      setQuizSearchQuery('');
      quizSearchHook.clearQuizzes?.();
    }
  }, [isOpen, mode, step]);

  // Effect to load selected quiz when editing
  useEffect(() => {
    if (mode === 'edit' && step?.type === 'quiz' && step?.data?.quiz_id && !selectedQuiz) {
      quizSearchHook.fetchQuizzes({ include: [step.data.quiz_id] });
    }
  }, [mode, step]);

  // Update selectedQuiz when quiz data loads
  useEffect(() => {
    if (mode === 'edit' && step?.type === 'quiz' && step?.data?.quiz_id && quizSearchHook.quizzes.length > 0) {
      const quiz = quizSearchHook.quizzes.find(q => q.id === step.data.quiz_id);
      if (quiz && !selectedQuiz) {
        setSelectedQuiz(quiz);
      }
    }
  }, [quizSearchHook.quizzes, mode, step, selectedQuiz]);

  const imageHandler = useCallback(async () => {
    try {
      const media = await openMediaSelector({
        title: 'Seleccionar imagen',
        buttonText: 'Insertar imagen',
        type: 'image'
      });
      if (media && media.url && quillRef.current) {
        const quillEditor = quillRef.current.getEditor();
        const range = quillEditor.getSelection(true);
        quillEditor.insertEmbed(range.index, 'image', media.url);
        quillEditor.setSelection(range.index + 1);
      }
    } catch (error) {
      console.error("Error al abrir el selector de medios:", error);
    }
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        'image': imageHandler,
      },
    },
  }), [imageHandler]);

  const handleTypeChange = (type) => {
    setFormData(prev => ({ ...prev, type, data: {} }));
    // Reset quiz search when changing type
    setSelectedQuiz(null);
    setQuizSearchQuery('');
    quizSearchHook.clearQuizzes?.();
  };

  const handleQuizSearch = (e) => {
    e.preventDefault();
    if (quizSearchQuery.trim()) {
      quizSearchHook.fetchQuizzes({ search: quizSearchQuery.trim(), per_page: 10 });
    }
  };

  const selectQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, quiz_id: quiz.id }
    }));
    // Clear search results after selection
    setQuizSearchQuery('');
    quizSearchHook.clearQuizzes?.();
  };

  const removeSelectedQuiz = () => {
    setSelectedQuiz(null);
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, quiz_id: null }
    }));
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: ['application/pdf']
    });

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadedMedia = await uploadMedia(file, { onProgress: setUploadProgress });
      setFormData(prev => ({
        ...prev,
        data: {
          ...prev.data,
          file_id: uploadedMedia.id,
          filename: file.name,
          url: uploadedMedia.url
        }
      }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePdf = () => {
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, file_id: null, filename: null, url: null }
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      setError(t('admin.lessonModal.stepTitleRequired'));
      return;
    }
    onSave(formData, mode === 'edit' ? step?.id : null);
    onClose();
  };

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `2px solid ${pageColors.inputBorder}`,
    backgroundColor: pageColors.inputBg,
    color: pageColors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: pageColors.text,
    marginBottom: '6px',
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100010,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
      <div 
        style={{
          position: 'relative',
          zIndex: 100011,
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          margin: '0 16px',
          backgroundColor: pageColors.cardBg,
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: `1px solid ${pageColors.inputBorder}`,
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
            {mode === 'edit' ? t('admin.lessonModal.editStep') : t('admin.lessonModal.addStep')}
          </h3>
        </div>

        {/* Content - Scrollable */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {/* Step Type Selection - Only in create mode */}
            {mode !== 'edit' && (
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.stepType')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(stepTypes).map(([type, config]) => {
                    const StepIcon = config.icon;
                    const isSelected = formData.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? pageColors.accent : pageColors.inputBorder}`,
                          backgroundColor: isSelected 
                            ? (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)') 
                            : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '6px',
                          backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                        }}>
                          <StepIcon size={14} style={{ color: '#6366f1' }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: pageColors.text }}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step Title */}
            <div>
              <label style={labelStyle}>{t('admin.lessonModal.stepTitle')} *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                style={inputStyle}
                placeholder={t('admin.lessonModal.stepTitlePlaceholder')}
              />
            </div>

            {/* Type-specific content */}
            {formData.type === 'video' && (
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.videoUrl')}</label>
                <input
                  type="url"
                  value={formData.data?.video_url || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    data: { ...prev.data, video_url: e.target.value } 
                  }))}
                  style={inputStyle}
                  placeholder={t('admin.lessonModal.videoUrlPlaceholder')}
                />
                <p style={{ fontSize: '12px', color: pageColors.textMuted, marginTop: '6px' }}>
                  Soporta YouTube, Vimeo, y enlaces directos a video
                </p>
              </div>
            )}

            {formData.type === 'text' && (
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.textContent')}</label>
                <div style={{ 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  border: `2px solid ${pageColors.inputBorder}`,
                }}>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={formData.data?.content || ''}
                    onChange={(content) => setFormData(prev => ({ 
                      ...prev, 
                      data: { ...prev.data, content } 
                    }))}
                    modules={quillModules}
                    style={{ 
                      backgroundColor: pageColors.inputBg,
                      minHeight: '200px',
                    }}
                  />
                </div>
              </div>
            )}

            {formData.type === 'pdf' && (
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.pdfFile')}</label>
                {formData.data?.file_id ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                      <a 
                        href={formData.data.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
                      >
                        {formData.data.filename}
                      </a>
                    </div>
                    <button 
                      type="button" 
                      onClick={removePdf}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      ref={fileInputRef}
                      onChange={handlePdfUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '20px',
                        borderRadius: '8px',
                        border: `2px dashed ${pageColors.inputBorder}`,
                        backgroundColor: 'transparent',
                        color: pageColors.textMuted,
                        fontSize: '14px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      <UploadCloud size={20} />
                      {uploading ? `${t('admin.lessonModal.uploading')} ${uploadProgress}%` : t('admin.lessonModal.selectPdf')}
                    </button>
                    {uploading && (
                      <div style={{ 
                        marginTop: '8px',
                        width: '100%', 
                        height: '4px', 
                        borderRadius: '2px', 
                        backgroundColor: pageColors.inputBorder, 
                        overflow: 'hidden' 
                      }}>
                        <div style={{ 
                          width: `${uploadProgress}%`, 
                          height: '100%', 
                          backgroundColor: '#3b82f6', 
                          transition: 'width 0.2s' 
                        }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.type === 'quiz' && (
              <div>
                <label style={labelStyle}>{t('admin.lessonModal.selectTest')}</label>
                
                {/* Selected Quiz Display */}
                {selectedQuiz ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
                    marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text }}>
                        {selectedQuiz.title?.rendered || selectedQuiz.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={removeSelectedQuiz}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Quiz Search Form */}
                    <form onSubmit={handleQuizSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <Search 
                          size={16} 
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: pageColors.textMuted }} 
                        />
                        <input
                          type="text"
                          value={quizSearchQuery}
                          onChange={(e) => setQuizSearchQuery(e.target.value)}
                          placeholder={t('admin.lessonModal.searchTestsPlaceholder')}
                          style={{ ...inputStyle, paddingLeft: '36px' }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={quizSearchHook.loading}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: pageColors.primary,
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: quizSearchHook.loading ? 'not-allowed' : 'pointer',
                          opacity: quizSearchHook.loading ? 0.6 : 1,
                        }}
                      >
                        {quizSearchHook.loading ? '...' : t('admin.lessonModal.search')}
                      </button>
                    </form>

                    {/* Search Results */}
                    {quizSearchHook.quizzes.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '4px',
                      }}>
                        {quizSearchHook.quizzes.map(quiz => (
                          <div
                            key={quiz.id}
                            onClick={() => selectQuiz(quiz)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              backgroundColor: pageColors.inputBg,
                              border: `1px solid ${pageColors.inputBorder}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                              e.currentTarget.style.borderColor = pageColors.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = pageColors.inputBg;
                              e.currentTarget.style.borderColor = pageColors.inputBorder;
                            }}
                          >
                            <span style={{ fontSize: '14px', color: pageColors.text }}>
                              {quiz.title?.rendered || quiz.title}
                            </span>
                            <Plus size={16} style={{ color: pageColors.primary }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state when no quiz selected */}
                    {!quizSearchHook.quizzes.length && (
                      <div style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        borderRadius: '8px',
                        border: `2px dashed ${pageColors.inputBorder}`,
                        backgroundColor: pageColors.hoverBg,
                      }}>
                        <HelpCircle size={24} style={{ color: pageColors.textMuted, opacity: 0.5, margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', color: pageColors.textMuted }}>
                          {t('admin.lessonModal.searchForTest')}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: `1px solid ${pageColors.inputBorder}`,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: `1px solid ${pageColors.inputBorder}`,
              backgroundColor: 'transparent',
              color: pageColors.text,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={uploading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: pageColors.accent,
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {mode === 'edit' ? t('common.save') : t('admin.lessonModal.addStepButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;