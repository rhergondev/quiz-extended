import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ChevronDown, CheckCircle, Circle, Loader2, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useQuestionsAdmin from '../../hooks/useQuestionsAdmin';
import useLessons from '../../hooks/useLessons';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { getCourseLessons } from '../../api/services/courseLessonService';

const QuestionSelector = ({ 
  selectedIds = [], 
  onSelect,
  onToggleQuestion, // New prop to handle object selection directly
  multiSelect = true,
  excludedIds = []
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  
  // Internal selection state for the current session
  const [localSelected, setLocalSelected] = useState(new Set(selectedIds));

  // Sync with prop
  useEffect(() => {
    setLocalSelected(new Set(selectedIds));
  }, [selectedIds]);

  // Hooks
  const questionsHook = useQuestionsAdmin({ 
    autoFetch: true, 
    perPage: 20, 
    debounceMs: 300 
  });
  
  const { options: taxonomyOptions } = useTaxonomyOptions(['qe_category', 'qe_provider', 'qe_topic', 'qe_difficulty']);
  const { lessons, loading: lessonsLoading } = useLessons({ autoFetch: false });
  const [filteredLessons, setFilteredLessons] = useState([]);

  // Colors
  const colors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    background: isDarkMode ? getColor('background', '#0f172a') : '#ffffff',
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#f9fafb',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    hoverBg: isDarkMode ? '#1f2937' : '#f3f4f6',
    selectedBg: isDarkMode ? '#78350f' : '#fef3c7',
  }), [getColor, isDarkMode]);

  // Handle selection
  const handleToggleSelect = (question) => {
    const newSelected = new Set(localSelected);
    
    if (newSelected.has(question.id)) {
      newSelected.delete(question.id);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(question.id);
    }
    
    setLocalSelected(newSelected);
    
    if (onToggleQuestion) {
      onToggleQuestion(question);
    }

    if (onSelect) {
      if (multiSelect) {
        onSelect(Array.from(newSelected));
      } else {
        onSelect(question);
      }
    }
  };

  // Filter Handling (Simplified from QuestionsManager)
  // ... (Course/Lesson logic omitted for brevity, keeping simple filters first)
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions]);
  const topicOptions = useMemo(() => taxonomyOptions.qe_topic || [], [taxonomyOptions]);
  const difficultyTaxOptions = useMemo(() => taxonomyOptions.qe_difficulty || [], [taxonomyOptions]);
  
  const difficultyOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' },
  ];

  const isLoading = !questionsHook.filters || !questionsHook.computed;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search 
              size={16} 
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" 
              style={{ color: colors.text }} 
            />
            <input
              type="text"
              value={questionsHook.filters?.search || ''}
              onChange={(e) => questionsHook.updateFilter('search', e.target.value)}
              placeholder={t('tests.searchQuestions', 'Buscar preguntas...')}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none shadow-sm"
              style={{ 
                border: `2px solid ${colors.border}`, 
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text 
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg border transition-colors shadow-sm"
            style={showFilters 
              ? { backgroundColor: colors.accent, borderColor: colors.accent, color: '#ffffff' }
              : { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: colors.border, color: colors.text }
            }
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 text-sm animate-in fade-in slide-in-from-top-2">
            <select
              value={questionsHook.filters?.category || 'all'}
              onChange={(e) => questionsHook.updateFilter('category', e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text
              }}
            >
              <option value="all">Categorías</option>
              {categoryOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={questionsHook.filters?.qe_provider || 'all'}
              onChange={(e) => questionsHook.updateFilter('qe_provider', e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text
              }}
            >
              <option value="all">Proveedores</option>
              {providerOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
             <select
              value={questionsHook.filters?.qe_topic || 'all'}
              onChange={(e) => questionsHook.updateFilter('qe_topic', e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text
              }}
            >
              <option value="all">Temas</option>
              {topicOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={questionsHook.filters?.qe_difficulty || 'all'}
              onChange={(e) => questionsHook.updateFilter('qe_difficulty', e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text
              }}
            >
               <option value="all">Dificultad (Tax)</option>
              {difficultyTaxOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin opacity-50" size={24} style={{ color: colors.text }} />
          </div>
        ) : questionsHook.questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-60">
            <p style={{ color: colors.text }}>No se encontraron preguntas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {questionsHook.questions.map(question => {
              const isSelected = localSelected.has(question.id);
              const isExcluded = excludedIds.includes(question.id);
              
              if (isExcluded) return null;

              return (
                <div 
                  key={question.id}
                  onClick={() => handleToggleSelect(question)}
                  className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${isSelected ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  style={{ backgroundColor: isSelected ? colors.selectedBg : 'transparent' }}
                >
                  <div className={`mt-0.5 ${isSelected ? 'text-amber-500' : 'text-gray-400 dark:text-gray-600'}`}>
                    {isSelected ? <CheckCircle size={20} className="text-amber-500" /> : <Circle size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 mb-1" style={{ color: colors.text }}>
                      {question.title?.rendered || question.title || 'Sin título'}
                    </p>
                    <div className="flex items-center gap-2 text-xs opacity-70" style={{ color: colors.textMuted }}>
                      <span className="capitalize">{question.type || 'multiple_choice'}</span>
                      {question.difficulty && (
                        <>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            question.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {question.difficulty === 'hard' ? 'Difícil' : question.difficulty === 'medium' ? 'Media' : 'Fácil'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Load More */}
        {questionsHook.hasMore && (
           <div className="p-4 text-center">
             <button 
               onClick={(e) => { e.stopPropagation(); questionsHook.loadMoreQuestions(); }}
               className="text-xs font-medium px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
               style={{ color: colors.text }}
               disabled={questionsHook.loading}
             >
               {questionsHook.loading ? 'Cargando...' : 'Cargar más'}
             </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default QuestionSelector;
