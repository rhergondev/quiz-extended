import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Loader2, 
  AlertCircle, 
  Save, 
  Calendar, 
  Gauge,
  X,
  CheckCircle,
  Minus
} from 'lucide-react';

/**
 * CourseQuizBatchActions
 * 
 * Componente para gestionar acciones en lote sobre los quizzes de un curso
 * Permite cambiar dificultad y fecha de inicio de múltiples quizzes a la vez
 */
const CourseQuizBatchActions = ({ courseId, courseName, onClose }) => {
  const { t } = useTranslation();
  
  // Estado principal
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  
  // Estado de batch updates
  const [batchDifficulty, setBatchDifficulty] = useState('');
  const [batchStartDate, setBatchStartDate] = useState('');
  
  // Expandir/colapsar lecciones
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  
  // Agrupar quizzes por lección
  const quizzesByLesson = useMemo(() => {
    const groups = {};
    quizzes.forEach(quiz => {
      const lessonId = quiz.lesson_id || 'no-lesson';
      const lessonTitle = quiz.lesson_title || t('quizzes.noLesson', 'Sin lección');
      if (!groups[lessonId]) {
        groups[lessonId] = {
          lessonId,
          lessonTitle,
          quizzes: []
        };
      }
      groups[lessonId].quizzes.push(quiz);
    });
    return Object.values(groups);
  }, [quizzes, t]);
  
  // Opciones de dificultad
  const difficultyOptions = [
    { value: 'easy', label: t('quizzes.difficulty.easy', 'Fácil'), color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: t('quizzes.difficulty.medium', 'Medio'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'hard', label: t('quizzes.difficulty.hard', 'Difícil'), color: 'bg-red-100 text-red-800' },
  ];
  
  // Cargar quizzes del curso
  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = window.qe_data?.endpoints?.custom_api || `${window.qe_data?.api_url}/qe/v1`;
      const response = await fetch(`${apiUrl}/courses/${courseId}/quizzes`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.qe_data?.nonce,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setQuizzes(result.data || []);
      
      // Expandir todas las lecciones por defecto
      const lessonIds = new Set(result.data?.map(q => q.lesson_id || 'no-lesson') || []);
      setExpandedLessons(lessonIds);
      
    } catch (err) {
      console.error('Error fetching course quizzes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);
  
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);
  
  // Handlers de selección
  const toggleQuizSelection = (quizId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };
  
  const toggleLessonSelection = (lessonQuizzes) => {
    const quizIds = lessonQuizzes.map(q => q.id);
    const allSelected = quizIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        quizIds.forEach(id => newSet.delete(id));
      } else {
        quizIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(quizzes.map(q => q.id)));
  };
  
  const deselectAll = () => {
    setSelectedIds(new Set());
  };
  
  const toggleLessonExpand = (lessonId) => {
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
  
  // Aplicar cambios en lote
  const applyBatchUpdate = async () => {
    if (selectedIds.size === 0) {
      alert(t('quizzes.batch.noSelection', 'Selecciona al menos un cuestionario'));
      return;
    }
    
    const updates = {};
    if (batchDifficulty) updates.difficulty_level = batchDifficulty;
    if (batchStartDate) updates.start_date = batchStartDate;
    
    if (Object.keys(updates).length === 0) {
      alert(t('quizzes.batch.noChanges', 'No hay cambios que aplicar'));
      return;
    }
    
    setSaving(true);
    setSaveResult(null);
    
    try {
      const apiUrl = window.qe_data?.endpoints?.custom_api || `${window.qe_data?.api_url}/qe/v1`;
      const response = await fetch(`${apiUrl}/courses/${courseId}/quizzes/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.qe_data?.nonce,
        },
        body: JSON.stringify({
          quiz_ids: Array.from(selectedIds),
          updates
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSaveResult(result);
      
      // Actualizar datos locales
      setQuizzes(prev => prev.map(quiz => {
        if (selectedIds.has(quiz.id)) {
          return {
            ...quiz,
            difficulty_level: batchDifficulty || quiz.difficulty_level,
            start_date: batchStartDate || quiz.start_date,
          };
        }
        return quiz;
      }));
      
      // Limpiar selección y valores
      setBatchDifficulty('');
      setBatchStartDate('');
      
    } catch (err) {
      console.error('Error applying batch update:', err);
      setSaveResult({ success: false, error: err.message });
    } finally {
      setSaving(false);
    }
  };
  
  // Renderizar badge de dificultad
  const renderDifficultyBadge = (difficulty) => {
    const option = difficultyOptions.find(o => o.value === difficulty) || difficultyOptions[1];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };
  
  // Estado de selección de lección
  const getLessonSelectionState = (lessonQuizzes) => {
    const quizIds = lessonQuizzes.map(q => q.id);
    const selectedCount = quizIds.filter(id => selectedIds.has(id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === quizIds.length) return 'all';
    return 'partial';
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Overlay oscuro */}
        <div 
          className="absolute inset-0 bg-black/30" 
          onClick={onClose}
        />
        {/* Panel deslizante */}
        <div className="ml-auto w-full max-w-lg bg-white shadow-xl h-full flex flex-col relative z-10 animate-slide-in-right">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('quizzes.batch.title', 'Acciones en Lote')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Overlay oscuro */}
        <div 
          className="absolute inset-0 bg-black/30" 
          onClick={onClose}
        />
        {/* Panel deslizante */}
        <div className="ml-auto w-full max-w-lg bg-white shadow-xl h-full flex flex-col relative z-10">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('quizzes.batch.title', 'Acciones en Lote')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchQuizzes}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('common.retry', 'Reintentar')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay oscuro */}
      <div 
        className="absolute inset-0 bg-black/30" 
        onClick={onClose}
      />
      {/* Panel deslizante */}
      <div className="ml-auto w-full max-w-lg bg-white shadow-xl h-full flex flex-col relative z-10">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('quizzes.batch.title', 'Acciones en Lote')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {quizzes.length} {t('quizzes.title', 'cuestionarios')}
          </p>
        </div>
      
      {/* Barra de acciones */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
        {/* Selección rápida */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} {t('common.selected', 'seleccionados')}
          </span>
          <button 
            onClick={selectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('common.selectAll', 'Seleccionar todos')}
          </button>
          <button 
            onClick={deselectAll}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {t('common.deselectAll', 'Deseleccionar todos')}
          </button>
        </div>
        
        {/* Campos de batch update */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dificultad */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Gauge size={14} className="inline mr-1" />
              {t('quizzes.form.difficulty', 'Dificultad')}
            </label>
            <select
              value={batchDifficulty}
              onChange={(e) => setBatchDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('quizzes.batch.noChange', '— Sin cambio —')}</option>
              {difficultyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Fecha de inicio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Calendar size={14} className="inline mr-1" />
              {t('quizzes.form.startDate', 'Fecha de Inicio')}
            </label>
            <input
              type="date"
              value={batchStartDate}
              onChange={(e) => setBatchStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Botón aplicar */}
          <div className="flex items-end">
            <button
              onClick={applyBatchUpdate}
              disabled={saving || selectedIds.size === 0 || (!batchDifficulty && !batchStartDate)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {t('quizzes.batch.apply', 'Aplicar Cambios')}
            </button>
          </div>
        </div>
        
        {/* Resultado del guardado */}
        {saveResult && (
          <div className={`p-3 rounded-md ${saveResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {saveResult.success ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle size={16} />
                <span className="text-sm">
                  {t('quizzes.batch.success', 'Cambios aplicados')}: {saveResult.summary?.updated || 0} {t('quizzes.batch.updated', 'actualizados')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <span className="text-sm">{saveResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Lista de quizzes por lección */}
      <div className="flex-1 overflow-y-auto">
        {quizzesByLesson.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('quizzes.noQuizzes', 'No hay cuestionarios en este curso')}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {quizzesByLesson.map(group => {
              const isExpanded = expandedLessons.has(group.lessonId);
              const selectionState = getLessonSelectionState(group.quizzes);
              
              return (
                <div key={group.lessonId}>
                  {/* Header de lección */}
                  <div 
                    className="flex items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleLessonExpand(group.lessonId)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLessonSelection(group.quizzes);
                      }}
                      className="mr-3 text-gray-400 hover:text-blue-600"
                    >
                      {selectionState === 'all' ? (
                        <CheckSquare size={20} className="text-blue-600" />
                      ) : selectionState === 'partial' ? (
                        <Minus size={20} className="text-blue-400" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                    
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-gray-400 mr-2" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400 mr-2" />
                    )}
                    
                    <span className="font-medium text-gray-800 flex-1">
                      {group.lessonTitle}
                    </span>
                    <span className="text-sm text-gray-500">
                      {group.quizzes.length} quizzes
                    </span>
                  </div>
                  
                  {/* Lista de quizzes */}
                  {isExpanded && (
                    <div className="bg-white">
                      {group.quizzes.map(quiz => (
                        <div 
                          key={quiz.id}
                          className={`flex items-center px-4 py-2 pl-12 border-l-4 hover:bg-gray-50 ${
                            selectedIds.has(quiz.id) ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                          }`}
                        >
                          <button
                            onClick={() => toggleQuizSelection(quiz.id)}
                            className="mr-3 text-gray-400 hover:text-blue-600"
                          >
                            {selectedIds.has(quiz.id) ? (
                              <CheckSquare size={18} className="text-blue-600" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {quiz.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {renderDifficultyBadge(quiz.difficulty_level)}
                              {quiz.start_date && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {quiz.start_date}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {quiz.question_count} preguntas
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default CourseQuizBatchActions;
