import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Plus, Settings, FileQuestion, Clock, CheckCircle, AlertCircle, Trash2, GripVertical, ChevronRight, ArrowLeft, Edit2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-toastify';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Hooks & Services
import useQuizzes from '../../hooks/useQuizzes';
import useQuestionsAdmin from '../../hooks/useQuestionsAdmin';
import { getQuestionsByIds } from '../../api/services/questionService';
import QuestionSelector from '../questions/QuestionSelector';
import QuestionModal from '../questions/QuestionModal';
import { getOne as getQuiz } from '../../api/services/quizService';

// Sortable Item Component with Edit button
const SortableQuestionItem = ({ question, onRemove, onEdit, colors }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div 
      ref={setNodeRef} 
      style={{...style}}
      className="flex items-center justify-between p-2 mb-1 rounded-lg border bg-transparent border-gray-200 dark:border-gray-700 group hover:border-amber-400/50 transition-colors shadow-sm"
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <button {...attributes} {...listeners} className="cursor-grab p-1 flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" style={{ color: colors.text }}>
          <GripVertical size={14} />
        </button>
        <div className="flex flex-col min-w-0 flex-1 justify-center space-y-[2px]">
          <span className="font-medium text-xs truncate leading-none cursor-pointer hover:text-amber-500 transition-colors" onClick={() => onEdit(question)} style={{ color: colors.text }}>
            {question.title?.rendered || question.title}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 transition-all">
        <button 
          onClick={() => onEdit(question)}
          className="p-1.5 flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-all bg-transparent"
          style={{ color: colors.accent }}
          title="Editar pregunta"
        >
          <Edit2 size={12} />
        </button>
        <button 
          onClick={() => onRemove(question.id)}
          className="p-1.5 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all bg-transparent"
          title="Quitar pregunta"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const UnifiedTestModal = ({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'edit'
  test = null, // The lesson step object if editing
  courseId,
  onSave
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState('content'); // 'content' | 'settings' | 'selector'
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mouseDownOnOverlayRef = useRef(false);
  
  // Question Modal State
  const [questionModal, setQuestionModal] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    question: null
  });

  // Data State
  const [formData, setFormData] = useState({
    title: '', // Lesson Step Title
    description: '', // Quiz Content
    difficulty_level: 'medium', // easy | medium | hard
    // Settings (Defaults hardcoded hidden)
    passing_score: '5.0',
    time_limit: '', // Automatico
    max_attempts: '', // Ilimitados
    randomize: true, // Siempre aleatorio
    show_results: true, // Siempre mostrar resultados
  });
  
  const [selectedQuestions, setSelectedQuestions] = useState([]); // Array of question objects
  
  // Hooks
  const quizzesHook = useQuizzes({ autoFetch: false });
  const questionsAdminHook = useQuestionsAdmin({ autoFetch: false });
  
  // Colors
  const colors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bg: isDarkMode ? getColor('background', '#0f172a') : '#f9fafb',
    border: isDarkMode ? '#374151' : '#e5e7eb',
  }), [getColor, isDarkMode]);

  // Load Initial Data
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      // Reset
      setActiveTab('content');
      setFormData({
        title: '',
        description: '',
        difficulty_level: 'medium',
        passing_score: '5.0',
        time_limit: '',
        max_attempts: '',
        randomize: true,
        show_results: true,
      });
      setSelectedQuestions([]);
      
      if (mode === 'edit' && test) {
        setIsLoading(true);
        try {
          // Pre-fill Title from Lesson Step
          const stepTitle = test.title || '';
          const quizId = test.data?.quiz_id;
          
          if (quizId) {
            // Fetch complete test data
            const quiz = await getQuiz(quizId);
            const meta = quiz.meta || {};
            
            setFormData({
              title: stepTitle,
              description: quiz.content?.rendered || quiz.content || '',
              difficulty_level: meta._difficulty_level || 'medium',
              passing_score: '5.0',
              time_limit: '',
              max_attempts: '',
              randomize: true,
              show_results: true,
            });
            
            // Fetch questions
            const qIds = meta._quiz_question_ids || [];
            if (qIds.length > 0) {
              const questions = await getQuestionsByIds(qIds);
              setSelectedQuestions(questions);
            }
          } else {
             setFormData(prev => ({ ...prev, title: stepTitle }));
          }
        } catch (error) {
          console.error('Error loading test data:', error);
          toast.error('Error al cargar datos del test');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [isOpen, mode, test]);

  // Handlers
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Prepare Test Data
      const quizData = {
        title: formData.title, // Test title same as step title
        content: formData.description,
        status: 'publish',
        qe_course: courseId ? [parseInt(courseId)] : [], 
        meta: {
          _course_id: courseId,
          _difficulty_level: formData.difficulty_level,
          _passing_score: formData.passing_score,
          _time_limit: formData.time_limit,
          _max_attempts: formData.max_attempts,
          _randomize_questions: formData.randomize,
          _show_results: formData.show_results,
          _quiz_question_ids: selectedQuestions.map(q => q.id)
        }
      };

      let resultQuizId;

      // 2. Create or Update Test
      // Logic: If editing test step with existing test, update it. If new, create it.
      // But wait... mode='edit' implies editing the LESSON STEP. The lesson step points to a Quiz ID.
      // If we are editing, we update the Quiz ID pointed to.
      
      if (mode === 'edit' && test?.data?.quiz_id) {
        await quizzesHook.updateQuiz(test.data.quiz_id, quizData);
        resultQuizId = test.data.quiz_id;
      } else {
        const newQuiz = await quizzesHook.createQuiz(quizData);
        resultQuizId = newQuiz.id;
      }

      // 3. Calculate test metadata for display
      const difficulty = formData.difficulty_level;
      const questionCount = selectedQuestions.length;
      // Calculate time limit: half the number of questions (same logic as QuizGeneratorPage)
      const timeLimit = questionCount > 0 ? Math.max(1, Math.ceil(questionCount / 2)) : null;
      
      // 4. Call Parent onSave with the specific structure needed by TestsPage
      // TestsPage expects: { type: 'quiz', title: '...', data: { quiz_id: ..., difficulty: ..., ... } }
      await onSave({
        type: 'quiz',
        title: formData.title,
        data: {
          quiz_id: resultQuizId,
          difficulty: difficulty,
          question_count: questionCount,
          time_limit: timeLimit,
          start_date: new Date().toISOString() // Set current date as start date
        }
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar el test');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedQuestions((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Question Modal Handlers ---

  const openCreateQuestion = () => {
    setQuestionModal({ isOpen: true, mode: 'create', question: null });
  };

  const openEditQuestion = (question) => {
    setQuestionModal({ isOpen: true, mode: 'edit', question });
  };

  const closeQuestionModal = () => {
    setQuestionModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveQuestion = async (questionData, nextAction) => {
    try {
      if (questionModal.mode === 'create') {
        const newQuestion = await questionsAdminHook.createQuestion(questionData);
        setSelectedQuestions(prev => [...prev, newQuestion]);
        toast.success('Pregunta creada y añadida');
        
        if (nextAction !== 'create_another') {
            closeQuestionModal();
        }
      } else {
        const updatedQuestion = await questionsAdminHook.updateQuestion(questionModal.question.id, questionData);
        // Update local list
        setSelectedQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
        toast.success('Pregunta actualizada');
        closeQuestionModal();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Error al guardar la pregunta');
    }
  };
  
  // Custom add from selector
  // Since QuestionSelector filters, it has the objects in its hook. 
  // It's hard to get them out without modifying QuestionSelector.
  // I will just open a "Drawer" mode.
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-24"
      onMouseDown={(e) => {
        mouseDownOnOverlayRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnOverlayRef.current) {
          onClose();
        }
        mouseDownOnOverlayRef.current = false;
      }}
    >
      <div 
        className="relative w-full max-w-5xl h-[75vh] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all"
        style={{ backgroundColor: colors.bg }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
          <div>
            <h2 className="text-sm font-bold uppercase" style={{ color: colors.text }}>
              {mode === 'create' ? 'Nuevo Test' : 'Editar Test'}
            </h2>
            <p className="text-xs opacity-60" style={{ color: colors.textMuted }}>
              Configura el contenido y las preguntas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: FORM & LIST */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all ${activeTab === 'selector' ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
             
             {/* No Tabs Needed anymore - Content Only */}

             <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex justify-center p-10"><span className="animate-pulse">Cargando...</span></div>
                ) : (
                  /* CONTENT FORM */
                  <div className="space-y-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: colors.textMuted }}>
                          Título del Test
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          className="w-full text-sm font-medium p-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          placeholder="Ej: Evaluación Final del Módulo 1"
                          style={{
                            border: `2px solid ${colors.border}`,
                            color: colors.text,
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: colors.textMuted }}>
                          Dificultad
                        </label>
                        <select
                          value={formData.difficulty_level}
                          onChange={e => setFormData({...formData, difficulty_level: e.target.value})}
                          className="text-sm font-medium p-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          style={{
                            border: `2px solid ${colors.border}`,
                            color: formData.difficulty_level === 'easy' ? '#10b981' : formData.difficulty_level === 'hard' ? '#ef4444' : '#f59e0b',
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
                          }}
                        >
                          <option value="easy">Fácil</option>
                          <option value="medium">Media</option>
                          <option value="hard">Difícil</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>
                          Preguntas ({selectedQuestions.length})
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={openCreateQuestion}
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1 hover:underline px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Plus size={12} /> CREAR
                            </button>
                            <button
                                onClick={() => setActiveTab('selector')}
                                className={`text-[10px] font-bold flex items-center gap-1 hover:underline px-2 py-1 rounded-md transition-colors ${activeTab === 'selector' ? 'text-white' : 'text-amber-600 dark:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                style={activeTab === 'selector' ? { backgroundColor: colors.accent } : {}}
                            >
                                <FileQuestion size={12} /> BUSCAR
                            </button>
                        </div>
                      </div>

                      {selectedQuestions.length === 0 ? (
                        <div 
                          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors group"
                          style={{ borderColor: colors.border }}
                        >
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <FileQuestion className="text-gray-600 dark:text-gray-400" size={24} />
                          </div>
                          <p className="text-xs font-medium mb-1" style={{ color: colors.text }}>No hay preguntas seleccionadas</p>
                          <p className="text-[10px] opacity-60 mb-3" style={{ color: colors.textMuted }}>Empieza añadiendo preguntas al test</p>
                          <div className="flex gap-3">
                            <button onClick={openCreateQuestion} className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-transparent border-0 p-0 hover:bg-transparent transition-colors">Crear una</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setActiveTab('selector')} className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline bg-transparent border-0 p-0 hover:bg-transparent transition-colors">Buscar existentes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-transparent space-y-1">
                          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={selectedQuestions} strategy={verticalListSortingStrategy}>
                              {selectedQuestions.map((q) => (
                                <SortableQuestionItem 
                                  key={q.id} 
                                  question={q} 
                                  onRemove={(id) => setSelectedQuestions(items => items.filter(i => i.id !== id))}
                                  onEdit={openEditQuestion}
                                  colors={colors}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* RIGHT: SELECTOR DRAWER */}
          {activeTab === 'selector' && (
            <div 
              className="absolute inset-0 md:static md:w-[320px] lg:w-[350px] flex flex-col border-l shadow-xl z-20 animate-in slide-in-from-right-10 duration-200"
              style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: colors.border }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: colors.text }}>
                  <Plus size={16} className="text-amber-500"/> Banco de Preguntas
                </h3>
                <button 
                  onClick={() => setActiveTab('content')}
                  className="p-1.5 rounded-lg border transition-colors shadow-sm"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: isDarkMode ? colors.bgCard : '#ffffff',
                    color: colors.text
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                 <QuestionSelectorWrapper 
                    currentSelected={selectedQuestions}
                    onSelectionChange={setSelectedQuestions}
                    colors={colors}
                 />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t flex items-center justify-end gap-3" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
           {/* Hint count */}
           <div className="mr-auto text-xs" style={{ color: colors.textMuted }}>
             {selectedQuestions.length} preguntas seleccionadas
           </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            style={{ backgroundColor: colors.accent }}
          >
            {isSaving ? <span className="animate-spin">⌛</span> : <Save size={14} />}
            {mode === 'create' ? 'Crear Test' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* QUESTION MODAL LAYER */}
      {questionModal.isOpen && (
        <QuestionModal
          isOpen={questionModal.isOpen}
          onClose={closeQuestionModal}
          mode={questionModal.mode}
          question={questionModal.question}
          onSave={handleSaveQuestion}
          isSimplified={true}
          /* parent information to help context */
          parentQuizId={null} // We are editing transiently, not really tied to a saved quiz yet
        />
      )}
    </div>
  );
};

// Wrapper ensuring we get objects not just IDs
const QuestionSelectorWrapper = ({ currentSelected, onSelectionChange, colors }) => {
  return (
    <QuestionSelector 
       selectedIds={currentSelected.map(q => q.id)}
       onSelect={() => {}} // Ignore generic bulk ID update
       onToggleQuestion={(question) => {
          const exists = currentSelected.find(q => q.id === question.id);
          if (exists) {
            onSelectionChange(prev => prev.filter(q => q.id !== question.id));
            toast.info(`Pregunta removida`, { autoClose: 1000, position: 'bottom-right' });
          } else {
            onSelectionChange(prev => [...prev, question]);
            toast.success(`Pregunta añadida al test`, { autoClose: 1000, position: 'bottom-right' });
          }
       }}
    />
  );
}

export default UnifiedTestModal;
