import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, GripVertical, Search, Plus, Trash2, ChevronDown, Edit2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { getOne as getQuiz } from '../../api/services/quizService';
import { getQuestionsByIds } from '../../api/services/questionService';
import { useQuestions } from '../../hooks/useQuestions';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionModal from '../questions/QuestionModal';

// --- SUB-COMPONENTES INTERNOS ---

const SortableQuestionItem = ({ question, onRemove, onEdit, pageColors, isDarkMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundColor: pageColors.inputBg,
        borderRadius: '8px',
        border: `1px solid ${pageColors.inputBorder}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
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
        <p style={{ 
          fontSize: '14px', 
          fontWeight: '500', 
          color: pageColors.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {question.title?.rendered || question.title}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button 
          type="button" 
          onClick={() => onEdit(question)} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            cursor: 'pointer',
          }}
          title="Editar pregunta"
        >
          <Edit2 size={14} />
        </button>
        <button 
          type="button" 
          onClick={() => onRemove(question.id)} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            cursor: 'pointer',
          }}
          title="Quitar del test"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const QuizModal = ({ 
  isOpen, 
  onClose, 
  quizId, 
  mode = 'create', 
  onSave, 
  availableCourses = [], 
  availableCategories = [] 
}) => {
  const { getColor, isDarkMode } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Configuración, 1 = Preguntas
  const [formData, setFormData] = useState({});
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para el modal de preguntas
  const [questionModalState, setQuestionModalState] = useState({ 
    isOpen: false, 
    mode: 'create', 
    question: null 
  });
  
  const sensors = useSensors(useSensor(PointerSensor));
  const { questions: searchResults, loading: isSearchingQuestions, fetchItems: fetchQuestions, createQuestion, updateQuestion } = useQuestions({ autoFetch: false });

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
  }), [getColor, isDarkMode]);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      content: '',
      status: 'publish',
      courseId: '',
      qe_category: [],
      difficulty_level: 'medium',
      passing_score: '7.0',
      time_limit: '',
      max_attempts: '',
      randomize_questions: false,
      show_results: true,
      enable_negative_scoring: false,
      questionIds: [],
      start_date: '',
    });
    setSelectedQuestions([]);
    setQuestionsLoaded(false);
    setActiveTab(0);
    setSearchQuery('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchQuizData = async () => {
      if (quizId && (mode === 'edit' || mode === 'view')) {
        setIsLoading(true);
        setError(null);
        setQuestionsLoaded(false);
        try {
          const quizData = await getQuiz(quizId);
          const meta = quizData.meta || {};
          
          const titleValue = typeof quizData.title === 'string' 
            ? quizData.title 
            : (quizData.title?.rendered || '');
          
          const contentValue = typeof quizData.content === 'string'
            ? quizData.content
            : (quizData.content?.rendered || meta._quiz_instructions || '');
          
          setFormData({
            title: titleValue,
            content: contentValue,
            status: quizData.status || 'publish',
            courseId: meta._course_id?.toString() || '',
            qe_category: Array.isArray(quizData.qe_category) ? quizData.qe_category.map(String) : [],
            difficulty_level: meta._difficulty_level || 'medium',
            passing_score: meta._passing_score?.toString() || '7.0',
            time_limit: meta._time_limit?.toString() || '',
            max_attempts: meta._max_attempts?.toString() || '',
            randomize_questions: meta._randomize_questions || false,
            show_results: meta._show_results !== undefined ? meta._show_results : true,
            enable_negative_scoring: meta._enable_negative_scoring || false,
            questionIds: meta._quiz_question_ids || [],
            start_date: meta._start_date || '',
          });

          const questionIds = meta._quiz_question_ids || [];
          if (questionIds.length > 0) {
            try {
              const questionDetails = await getQuestionsByIds(questionIds, { batchSize: 30 });
              setSelectedQuestions(questionDetails);
            } catch (questionError) {
              console.error('Error loading questions:', questionError);
              setSelectedQuestions([]);
            }
          } else {
            setSelectedQuestions([]);
          }
          setQuestionsLoaded(true);

        } catch (err) {
          console.error('Error fetching quiz:', err);
          setError('Error al cargar el test');
        } finally {
          setIsLoading(false);
        }
      } else if (mode === 'create') {
        resetForm();
      }
    };
    fetchQuizData();
  }, [isOpen, quizId, mode, resetForm]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addQuestionToQuiz = (question) => {
    if (!selectedQuestions.some(q => q.id === question.id)) {
      const newSelected = [...selectedQuestions, question];
      setSelectedQuestions(newSelected);
      handleFieldChange('questionIds', newSelected.map(q => q.id));
    }
  };

  const removeQuestionFromQuiz = (questionId) => {
    const newSelected = selectedQuestions.filter(q => q.id !== questionId);
    setSelectedQuestions(newSelected);
    handleFieldChange('questionIds', newSelected.map(q => q.id));
  };

  // --- HANDLERS PARA MODAL DE PREGUNTAS ---
  const openCreateQuestionModal = () => {
    setQuestionModalState({ isOpen: true, mode: 'create', question: null });
  };

  const openEditQuestionModal = (question) => {
    // Pasamos el objeto question completo para que el modal pueda cargar sus datos
    setQuestionModalState({ isOpen: true, mode: 'edit', question: question });
  };

  const closeQuestionModal = () => {
    setQuestionModalState({ isOpen: false, mode: 'create', question: null });
  };

  const handleSaveQuestion = async (questionData, nextAction) => {
    try {
      if (questionModalState.mode === 'create') {
        const newQuestion = await createQuestion(questionData);
        // Añadir automáticamente al quiz
        if (newQuestion) {
          addQuestionToQuiz(newQuestion);
        }
        if (nextAction !== 'reset') {
          closeQuestionModal();
        }
      } else {
        const updatedQuestion = await updateQuestion(questionModalState.question?.id, questionData);
        // Actualizar en la lista de seleccionadas
        if (updatedQuestion) {
          setSelectedQuestions(prev => prev.map(q => 
            q.id === updatedQuestion.id ? updatedQuestion : q
          ));
        }
        closeQuestionModal();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      throw error;
    }
  };

  const handleSearchQuestions = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    fetchQuestions(true, { search: searchQuery, perPage: 50 });
  };
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedQuestions.findIndex(q => q.id === active.id);
      const newIndex = selectedQuestions.findIndex(q => q.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(selectedQuestions, oldIndex, newIndex);
        setSelectedQuestions(newOrder);
        handleFieldChange('questionIds', newOrder.map(q => q.id));
      }
    }
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      setError('El título es obligatorio');
      setActiveTab(0);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const meta = {
        _difficulty_level: formData.difficulty_level,
        _passing_score: formData.passing_score,
        _time_limit: formData.time_limit === '' ? 0 : parseInt(formData.time_limit, 10),
        _max_attempts: formData.max_attempts === '' ? 0 : parseInt(formData.max_attempts, 10),
        _randomize_questions: formData.randomize_questions,
        _show_results: formData.show_results,
        _enable_negative_scoring: formData.enable_negative_scoring,
        _quiz_question_ids: formData.questionIds,
        _start_date: formData.start_date || '',
      };
      
      if (formData.courseId && formData.courseId !== '' && formData.courseId !== '0') {
        meta._course_id = formData.courseId;
      }
      
      const quizDataForApi = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        meta,
        qe_category: formData.qe_category.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0),
      };
      await onSave(quizDataForApi);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el test');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const difficultyLevels = [
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' }
  ];

  const statusOptions = [
    { value: 'publish', label: 'Publicado' },
    { value: 'draft', label: 'Borrador' },
    { value: 'private', label: 'Privado' },
  ];

  const tabs = [
    { id: 0, label: 'Configuración' },
    { id: 1, label: `Preguntas (${selectedQuestions.length})` },
  ];

  // Estilos comunes para inputs/selects
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `2px solid ${pageColors.inputBorder}`,
    backgroundColor: pageColors.inputBg,
    color: pageColors.text,
    fontSize: '14px',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    paddingRight: '32px',
    appearance: 'none',
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100010,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
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
          maxWidth: '800px',
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
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: pageColors.text }}>
            {mode === 'create' ? 'Nuevo Test' : 'Editar Test'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: pageColors.textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 24px',
            borderBottom: `1px solid ${pageColors.inputBorder}`,
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: activeTab === tab.id 
                  ? pageColors.accent 
                  : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                color: activeTab === tab.id ? '#ffffff' : pageColors.textMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: pageColors.textMuted }}>
              Cargando...
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '20px',
                  borderRadius: '8px',
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                  color: pageColors.danger,
                  fontSize: '14px',
                }}>
                  {error}
                </div>
              )}

              {/* Tab: Configuración */}
              {activeTab === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Título */}
                  <div>
                    <label style={labelStyle}>Título del Test *</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder="Ej: Examen de Constitución - Tema 1"
                      style={inputStyle}
                    />
                  </div>

                  {/* Grid: Curso, Categoría, Estado */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Curso</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.courseId || ''}
                          onChange={(e) => handleFieldChange('courseId', e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">Sin asignar</option>
                          {availableCourses.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            pointerEvents: 'none',
                            color: pageColors.textMuted 
                          }} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Categoría</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.qe_category?.[0] || ''}
                          onChange={(e) => handleFieldChange('qe_category', e.target.value ? [e.target.value] : [])}
                          style={selectStyle}
                        >
                          <option value="">Sin categoría</option>
                          {availableCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            pointerEvents: 'none',
                            color: pageColors.textMuted 
                          }} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Estado</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.status || 'publish'}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                          style={selectStyle}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            pointerEvents: 'none',
                            color: pageColors.textMuted 
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid: Dificultad, Nota Aprobado, Fecha Inicio */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Dificultad</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={formData.difficulty_level || 'medium'}
                          onChange={(e) => handleFieldChange('difficulty_level', e.target.value)}
                          style={selectStyle}
                        >
                          {difficultyLevels.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            position: 'absolute', 
                            right: '12px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            pointerEvents: 'none',
                            color: pageColors.textMuted 
                          }} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Nota Aprobado (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.passing_score || ''}
                        onChange={(e) => handleFieldChange('passing_score', e.target.value)}
                        placeholder="7.0"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Fecha de Inicio</label>
                      <input
                        type="date"
                        value={formData.start_date || ''}
                        onChange={(e) => handleFieldChange('start_date', e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Grid: Tiempo Límite, Máx Intentos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Tiempo Límite (minutos)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.time_limit || ''}
                        onChange={(e) => handleFieldChange('time_limit', e.target.value)}
                        placeholder="Sin límite"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Máximo de Intentos</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_attempts || ''}
                        onChange={(e) => handleFieldChange('max_attempts', e.target.value)}
                        placeholder="Sin límite"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div>
                    <label style={labelStyle}>Instrucciones</label>
                    <ReactQuill 
                      theme="snow" 
                      value={formData.content || ''} 
                      onChange={(val) => handleFieldChange('content', val)} 
                    />
                  </div>

                  {/* Opciones */}
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${pageColors.inputBorder}`,
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: pageColors.text }}>
                      Opciones del Test
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.randomize_questions || false}
                        onChange={(e) => handleFieldChange('randomize_questions', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: pageColors.accent }}
                      />
                      <span style={{ fontSize: '14px', color: pageColors.text }}>Preguntas en orden aleatorio</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab: Preguntas */}
              {activeTab === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Buscador y botón crear */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Buscar y añadir preguntas</label>
                      <button
                        type="button"
                        onClick={openCreateQuestionModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: pageColors.accent,
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        Nueva Pregunta
                      </button>
                    </div>
                    <form onSubmit={handleSearchQuestions} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar preguntas por título..."
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="submit"
                        disabled={isSearchingQuestions}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: pageColors.primary,
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        <Search size={16} />
                        {isSearchingQuestions ? 'Buscando...' : 'Buscar'}
                      </button>
                    </form>
                  </div>

                  {/* Resultados de búsqueda */}
                  {searchResults.length > 0 && (
                    <div style={{
                      border: `1px solid ${pageColors.inputBorder}`,
                      borderRadius: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}>
                      {searchResults.map(q => {
                        const isAdded = selectedQuestions.some(sq => sq.id === q.id);
                        return (
                          <div 
                            key={q.id} 
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              borderBottom: `1px solid ${pageColors.inputBorder}`,
                            }}
                          >
                            <p style={{ fontSize: '14px', fontWeight: '500', color: pageColors.text }}>
                              {q.title?.rendered || 'Sin título'}
                            </p>
                            <button
                              type="button"
                              onClick={() => addQuestionToQuiz(q)}
                              disabled={isAdded}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: isAdded ? 'default' : 'pointer',
                                backgroundColor: isAdded 
                                  ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb')
                                  : (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'),
                                color: isAdded ? pageColors.textMuted : pageColors.success,
                              }}
                            >
                              {isAdded ? 'Añadida' : 'Añadir'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Lista de preguntas seleccionadas */}
                  <div>
                    <label style={{ ...labelStyle, marginBottom: '12px' }}>
                      Preguntas del Test ({selectedQuestions.length})
                    </label>
                    {selectedQuestions.length > 0 ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selectedQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedQuestions.map(q => (
                              <SortableQuestionItem 
                                key={q.id} 
                                question={q} 
                                onRemove={removeQuestionFromQuiz}
                                onEdit={openEditQuestionModal}
                                pageColors={pageColors}
                                isDarkMode={isDarkMode}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div style={{
                        padding: '32px',
                        textAlign: 'center',
                        borderRadius: '8px',
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: `1px dashed ${pageColors.inputBorder}`,
                      }}>
                        <p style={{ color: pageColors.textMuted, fontSize: '14px' }}>
                          No hay preguntas asignadas. Usa el buscador o crea una nueva pregunta.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '20px 24px',
            borderTop: `1px solid ${pageColors.inputBorder}`,
            backgroundColor: pageColors.cardBg,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${pageColors.inputBorder}`,
              backgroundColor: pageColors.inputBg,
              color: pageColors.text,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: pageColors.primary,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : (mode === 'create' ? 'Crear Test' : 'Guardar Cambios')}
          </button>
        </div>
      </div>

      {/* Modal de Preguntas */}
      <QuestionModal
        isOpen={questionModalState.isOpen}
        onClose={closeQuestionModal}
        mode={questionModalState.mode}
        question={questionModalState.question}
        onSave={handleSaveQuestion}
        availableLessons={[]}
        availableQuizzes={[]}
        availableCourses={availableCourses.map(c => ({ id: c.value, title: c.label }))}
        parentQuizId={quizId}
      />
    </div>,
    document.body
  );
};

export default QuizModal;
