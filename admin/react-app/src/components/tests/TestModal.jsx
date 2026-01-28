/**
 * TestModal Component
 * 
 * Modal for creating and editing test steps
 * Used in TestsPage for admin operations
 * 
 * @package QuizExtended
 * @subpackage Components/Tests
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, FileQuestion, Save, AlertCircle, HelpCircle, Plus, Pencil } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import QuizModal from '../quizzes/QuizModal';
import useQuizzes from '../../hooks/useQuizzes';
import { toast } from 'react-toastify';

const TestModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  test = null,
  availableQuizzes = [],
  onSave,
  isLoading = false,
  onQuizzesUpdated // Callback to refresh quizzes list in parent
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  // Hook para crear quizzes
  const quizzesHook = useQuizzes({ autoFetch: false });

  const pageColors = useMemo(() => ({
    background: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    secondaryBg: isDarkMode ? getColor('background', '#0f172a') : '#f9fafb',
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    inputBorder: isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'
  }), [getColor, isDarkMode]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    quiz_id: ''
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Quiz creation modal state
  const [quizModalState, setQuizModalState] = useState({
    isOpen: false,
    mode: 'create',
    quizId: null
  });
  
  // Local quizzes list (starts with availableQuizzes, can be updated when new quiz is created)
  const [localQuizzes, setLocalQuizzes] = useState([]);

  // Initialize form when modal opens or test changes
  useEffect(() => {
    if (isOpen && test && mode === 'edit') {
      setFormData({
        title: test.title || '',
        quiz_id: test.data?.quiz_id || ''
      });
    } else if (isOpen && mode === 'create') {
      setFormData({
        title: '',
        quiz_id: ''
      });
    }
    setErrors({});
  }, [isOpen, test, mode]);
  
  // Sync local quizzes with available quizzes
  useEffect(() => {
    setLocalQuizzes(availableQuizzes);
  }, [availableQuizzes]);

  // Handle field change
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('tests.errors.titleRequired', 'El título es obligatorio');
    }

    if (!formData.quiz_id) {
      newErrors.quiz_id = t('tests.errors.quizRequired', 'Debes seleccionar un quiz');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const testData = {
        type: 'quiz',
        title: formData.title.trim(),
        data: {
          quiz_id: parseInt(formData.quiz_id)
        }
      };

      await onSave(testData);
      onClose();
    } catch (error) {
      console.error('Error saving test:', error);
      setErrors({ submit: error.message || t('tests.errors.saveFailed', 'Error al guardar el test') });
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected quiz info
  const selectedQuiz = useMemo(() => {
    if (!formData.quiz_id) return null;
    return localQuizzes.find(q => q.id === parseInt(formData.quiz_id));
  }, [formData.quiz_id, localQuizzes]);

  // Get question count from selected quiz
  const questionCount = useMemo(() => {
    if (!selectedQuiz) return 0;
    const questionIds = selectedQuiz.question_ids || selectedQuiz.meta?._quiz_question_ids || [];
    return Array.isArray(questionIds) ? questionIds.length : 0;
  }, [selectedQuiz]);
  
  // Open quiz creation modal
  const handleOpenCreateQuiz = () => {
    setQuizModalState({
      isOpen: true,
      mode: 'create',
      quizId: null
    });
  };
  
  // Open quiz edit modal
  const handleOpenEditQuiz = () => {
    if (!formData.quiz_id) return;
    setQuizModalState({
      isOpen: true,
      mode: 'edit',
      quizId: parseInt(formData.quiz_id)
    });
  };
  
  // Close quiz creation modal
  const handleCloseQuizModal = () => {
    setQuizModalState({
      isOpen: false,
      mode: 'create',
      quizId: null
    });
  };
  
  // Handle quiz save (creation or edit)
  const handleSaveQuiz = async (quizData) => {
    try {
      if (quizModalState.mode === 'create') {
        const newQuiz = await quizzesHook.createQuiz(quizData);
        toast.success(t('tests.quizCreated', 'Quiz creado correctamente'));
        
        // Add new quiz to local list
        setLocalQuizzes(prev => [...prev, newQuiz]);
        
        // Select the new quiz
        setFormData(prev => ({ ...prev, quiz_id: newQuiz.id.toString() }));
      } else {
        // Edit mode - update the quiz
        const updatedQuiz = await quizzesHook.updateQuiz(quizModalState.quizId, quizData);
        toast.success(t('tests.quizUpdated', 'Quiz actualizado correctamente'));
        
        // Update quiz in local list
        setLocalQuizzes(prev => prev.map(q => 
          q.id === updatedQuiz.id ? updatedQuiz : q
        ));
      }
      
      // Notify parent to refresh quizzes if callback provided
      if (onQuizzesUpdated) {
        onQuizzesUpdated();
      }
      
      handleCloseQuizModal();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error(
        quizModalState.mode === 'create'
          ? t('tests.errors.quizCreateFailed', 'Error al crear el quiz')
          : t('tests.errors.quizUpdateFailed', 'Error al actualizar el quiz')
      );
      throw error;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100000
      }}
      onClick={onClose}
    >
      <div
        style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: pageColors.background 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${pageColors.border}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                padding: '6px',
                borderRadius: '6px',
                backgroundColor: `${pageColors.accent}15` 
              }}
            >
              <FileQuestion size={18} style={{ color: pageColors.accent }} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: pageColors.text, margin: 0 }}>
              {mode === 'create' 
                ? t('tests.createTest', 'Crear Test') 
                : t('tests.editTest', 'Editar Test')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ 
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: pageColors.textMuted,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Error message */}
            {errors.submit && (
              <div 
                style={{ 
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca'
                }}
              >
                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '14px', color: '#991b1b' }}>{errors.submit}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: pageColors.text
                }}
              >
                {t('tests.testTitle', 'Título del Test')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder={t('tests.testTitlePlaceholder', 'Ej: Test Tema 1')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: pageColors.inputBg,
                  border: `1px solid ${errors.title ? '#ef4444' : pageColors.inputBorder}`,
                  color: pageColors.text,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {errors.title && (
                <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                  {errors.title}
                </span>
              )}
            </div>

            {/* Quiz Selection */}
            <div>
              <label 
                style={{ 
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: pageColors.text
                }}
              >
                {t('tests.selectQuiz', 'Seleccionar Quiz')} *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={formData.quiz_id}
                  onChange={(e) => handleFieldChange('quiz_id', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${errors.quiz_id ? '#ef4444' : pageColors.inputBorder}`,
                    color: pageColors.text,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{t('tests.selectQuizPlaceholder', '-- Selecciona un quiz --')}</option>
                  {localQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title?.rendered || quiz.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleOpenCreateQuiz}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    backgroundColor: pageColors.accent,
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  title={t('tests.createNewQuiz', 'Crear nuevo quiz')}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">{t('tests.newQuiz', 'Nuevo')}</span>
                </button>
              </div>
              {errors.quiz_id && (
                <span style={{ fontSize: '12px', marginTop: '4px', display: 'block', color: '#ef4444' }}>
                  {errors.quiz_id}
                </span>
              )}
            </div>

            {/* Selected Quiz Info */}
            {selectedQuiz && (
              <div 
                style={{ 
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: `${pageColors.accent}10`,
                  border: `1px solid ${pageColors.accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HelpCircle size={18} style={{ color: pageColors.accent, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text }}>
                      {selectedQuiz.title?.rendered || selectedQuiz.title}
                    </div>
                    <div style={{ fontSize: '12px', color: pageColors.textMuted, marginTop: '2px' }}>
                      {questionCount} {questionCount === 1 ? t('tests.question', 'pregunta') : t('tests.questions', 'preguntas')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditQuiz}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: pageColors.accent,
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  title={t('tests.editQuiz', 'Editar quiz')}
                >
                  <Pencil size={12} />
                  {t('tests.edit', 'Editar')}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            style={{ 
              padding: '12px 16px',
              borderTop: `1px solid ${pageColors.border}`,
              backgroundColor: pageColors.secondaryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '13px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                border: 'none',
                color: pageColors.text,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '13px',
                backgroundColor: pageColors.accent,
                border: 'none',
                color: '#ffffff',
                opacity: isSaving || isLoading ? 0.6 : 1,
                cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && !isLoading) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!isSaving && !isLoading) e.currentTarget.style.opacity = '1';
              }}
            >
              <Save size={14} />
              {isSaving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      
      {/* Quiz Creation/Edit Modal */}
      <QuizModal
        isOpen={quizModalState.isOpen}
        onClose={handleCloseQuizModal}
        quizId={quizModalState.quizId}
        mode={quizModalState.mode}
        onSave={handleSaveQuiz}
        availableCourses={[]}
        availableCategories={[]}
        simplified={true}
      />
    </>
  );
};

export default TestModal;
