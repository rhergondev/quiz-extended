import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ChevronDown, CheckCircle, Circle, Loader2, X, ExternalLink, Lock, Tag, Square, CheckSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../contexts/ThemeContext';
import useQuestionsAdmin from '../../hooks/useQuestionsAdmin';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';

const decodeHtml = (str) => {
  if (!str) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};

const QuestionSelector = ({
  selectedIds = [],
  onSelect,
  onToggleQuestion, // New prop to handle object selection directly
  multiSelect = true,
  excludedIds = [],
  onEditQuestion = null, // Optional: open the in-app edit modal for a question
  questionOverrides = {}, // Map of id → updated question data, used to refresh individual cards without reloading the list
  providerRefreshKey = 0, // Increment to re-fetch allowedProviderIds (e.g. after toggling a provider lock)
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const topicDropdownRef = React.useRef(null);
  
  // Internal selection state for the current session
  const [localSelected, setLocalSelected] = useState(new Set(selectedIds));

  // Sync with prop
  useEffect(() => {
    setLocalSelected(new Set(selectedIds));
  }, [selectedIds]);

  // Batch category-change mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState(new Set());
  const [batchCategory, setBatchCategory] = useState('');
  const [updatingBatch, setUpdatingBatch] = useState(false);

  const toggleBatchSelect = (questionId) => {
    setBatchSelected(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  };

  const cancelBatch = () => {
    setBatchMode(false);
    setBatchSelected(new Set());
    setBatchCategory('');
  };

  const confirmBatchCategory = async () => {
    if (!batchCategory || batchSelected.size === 0) return;
    setUpdatingBatch(true);
    try {
      const config = window.qe_data || {};
      const endpoint = config.endpoints?.questions;
      if (!endpoint) throw new Error('No questions endpoint');
      await Promise.all(
        Array.from(batchSelected).map(id =>
          fetch(`${endpoint}/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce },
            credentials: 'same-origin',
            body: JSON.stringify({ qe_category: [parseInt(batchCategory)] }),
          })
        )
      );
      toast.success(`Categoría actualizada en ${batchSelected.size} pregunta${batchSelected.size !== 1 ? 's' : ''}`, { autoClose: 2000, position: 'bottom-right' });
      cancelBatch();
    } catch (err) {
      console.error('Error updating batch categories:', err);
      toast.error('Error al actualizar categorías', { position: 'bottom-right' });
    } finally {
      setUpdatingBatch(false);
    }
  };

  // Hooks
  const questionsHook = useQuestionsAdmin({
    autoFetch: true,
    perPage: 20,
    debounceMs: 300
  });

  const { options: taxonomyOptions } = useTaxonomyOptions(['qe_category', 'qe_provider']);
  const [allLessons, setAllLessons] = useState([]);
  // Lessons filtered to only those that have questions for the selected provider.
  // null means no provider is selected → show all lessons.
  const [providerLessons, setProviderLessons] = useState(null);
  const [providerLessonsLoading, setProviderLessonsLoading] = useState(false);

  // Local category state — used only to drive the Temas dropdown.
  // NOT sent to the questions query (questions are not filtered by category taxonomy).
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Set of provider IDs whose questions are allowed in tests.
  // null = loading (fail open), empty Set = no restrictions (fail open), Set with IDs = restriction active.
  const [allowedProviderIds, setAllowedProviderIds] = useState(null);

  // Map of questionId → [{id, title}] for the currently displayed questions
  const [quizMembership, setQuizMembership] = useState({});

  // Fetch quiz membership whenever the displayed question list changes
  useEffect(() => {
    const ids = questionsHook.questions.map(q => q.id).filter(Boolean);
    if (ids.length === 0) {
      setQuizMembership({});
      return;
    }
    let cancelled = false;
    const fetchMembership = async () => {
      try {
        const config = getApiConfig();
        const res = await makeApiRequest(`${config.apiUrl}/qe/v1/questions/quiz-membership?ids=${ids.join(',')}`);
        if (!cancelled) setQuizMembership(res.data || {});
      } catch {
        // non-critical — badges just won't show if the request fails
      }
    };
    fetchMembership();
    return () => { cancelled = true; };
  // Use a stable key so the effect only re-runs when the set of IDs actually changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsHook.questions.map(q => q.id).join(',')]);

  useEffect(() => {
    const fetchAllowedProviders = async () => {
      try {
        const config = getApiConfig();
        const res = await makeApiRequest(`${config.apiUrl}/wp/v2/qe_provider?per_page=100&_fields=id,meta`);
        const terms = Array.isArray(res.data) ? res.data : [];
        const ids = terms.filter(t => t.meta?._test_unlocked).map(t => t.id);
        setAllowedProviderIds(new Set(ids));
      } catch (err) {
        console.error('Error fetching allowed providers:', err);
        setAllowedProviderIds(new Set()); // fail open
      }
    };
    fetchAllowedProviders();
  }, [providerRefreshKey]);

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

  // Fetch all lessons globally (auto-paginate)
  useEffect(() => {
    const fetchAllLessons = async () => {
      try {
        const config = getApiConfig();
        const baseUrl = `${config.apiUrl}/wp/v2/qe_lesson`;
        const params = new URLSearchParams({ per_page: '100', _fields: 'id,title', status: 'publish,draft,private' });
        const firstRes = await makeApiRequest(`${baseUrl}?${params}`);
        let lessons = Array.isArray(firstRes.data) ? firstRes.data : [];
        const totalPages = parseInt(firstRes.headers?.['X-WP-TotalPages'] || '1', 10);
        for (let page = 2; page <= totalPages; page++) {
          params.set('page', page.toString());
          const pageRes = await makeApiRequest(`${baseUrl}?${params}`);
          if (Array.isArray(pageRes.data)) lessons = lessons.concat(pageRes.data);
        }
        setAllLessons(lessons.map(l => ({ value: l.id, label: decodeHtml(l.title?.rendered || l.title || `Lesson #${l.id}`) })));
      } catch (err) {
        console.error('Error fetching all lessons:', err);
      }
    };
    fetchAllLessons();
  }, []);

  // When provider or category changes, update the Temas dropdown and clear lesson filter.
  //
  // - Provider selected → use the existing provider-lessons endpoint (questions→quiz→lesson chain)
  // - Category only → fetch courses in that category, collect their _lesson_ids, then fetch lesson names
  // - Neither → show all lessons
  useEffect(() => {
    const provider = questionsHook.filters?.provider;
    const hasProvider = provider && provider !== 'all';
    const hasCategory = selectedCategory && selectedCategory !== 'all';

    // Always clear the lesson selection when provider or category changes
    questionsHook.updateFilter('lessons', null);

    if (!hasProvider && !hasCategory) {
      setProviderLessons(null);
      return;
    }

    let cancelled = false;

    if (hasProvider) {
      // Provider path: use the existing provider→quiz→lesson endpoint
      const fetchProviderLessons = async () => {
        setProviderLessonsLoading(true);
        try {
          const config = getApiConfig();
          const params = new URLSearchParams();
          params.set('provider', provider);
          if (hasCategory) params.set('category', selectedCategory);
          const res = await makeApiRequest(`${config.apiUrl}/quiz-extended/v1/debug/provider-lessons?${params}`);
          if (cancelled) return;
          const lessons = res.data?.data?.lessons || [];
          setProviderLessons(lessons.map(l => ({ value: l.id, label: decodeHtml(l.title || `Lesson #${l.id}`) })));
        } catch (err) {
          if (!cancelled) {
            console.error('Error fetching provider lessons:', err);
            setProviderLessons([]);
          }
        } finally {
          if (!cancelled) setProviderLessonsLoading(false);
        }
      };
      fetchProviderLessons();
    } else {
      // Category-only path: courses in that category → their lesson IDs → lesson names
      const fetchCategoryLessons = async () => {
        setProviderLessonsLoading(true);
        try {
          const config = getApiConfig();
          // Step 1: fetch courses tagged with this category
          const coursesRes = await makeApiRequest(
            `${config.apiUrl}/wp/v2/qe_course?qe_category=${selectedCategory}&per_page=100&_fields=id,meta&status=publish,draft,private`
          );
          if (cancelled) return;
          const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
          // Step 2: collect all lesson IDs from every course (deduplicated)
          const lessonIds = [...new Set(courses.flatMap(c => c.meta?._lesson_ids || []).filter(Boolean))];
          if (lessonIds.length === 0) {
            if (!cancelled) setProviderLessons([]);
            return;
          }
          // Step 3: fetch lesson titles for those IDs
          const lessonsRes = await makeApiRequest(
            `${config.apiUrl}/wp/v2/qe_lesson?include=${lessonIds.join(',')}&per_page=100&_fields=id,title&status=publish,draft,private`
          );
          if (cancelled) return;
          const lessons = Array.isArray(lessonsRes.data) ? lessonsRes.data : [];
          setProviderLessons(lessons.map(l => ({ value: l.id, label: decodeHtml(l.title?.rendered || l.title || `Lesson #${l.id}`) })));
        } catch (err) {
          if (!cancelled) {
            console.error('Error fetching category lessons:', err);
            setProviderLessons([]);
          }
        } finally {
          if (!cancelled) setProviderLessonsLoading(false);
        }
      };
      fetchCategoryLessons();
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsHook.filters?.provider, selectedCategory]);

  // Filter Handling
  const categoryOptions = useMemo(() => taxonomyOptions.qe_category || [], [taxonomyOptions]);
  const providerOptions = useMemo(() => taxonomyOptions.qe_provider || [], [taxonomyOptions]);
  // When a provider is selected, topicOptions is limited to lessons that have
  // questions for that provider. Otherwise show all lessons.
  const topicOptions = providerLessons !== null ? providerLessons : allLessons;
  const difficultyOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Media' },
    { value: 'hard', label: 'Difícil' },
  ];

  // Filtered topic options for searchable dropdown
  const filteredTopicOptions = useMemo(() => {
    const opts = topicOptions.filter(o => o.value !== 'all');
    if (!topicSearch.trim()) return opts;
    const term = topicSearch.toLowerCase().trim();
    return opts.filter(o => o.label.toLowerCase().includes(term));
  }, [topicOptions, topicSearch]);

  // Close topic dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(e.target)) {
        setTopicDropdownOpen(false);
      }
    };
    if (topicDropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [topicDropdownOpen]);

  // Get selected topic label
  const selectedTopicLabel = useMemo(() => {
    const val = questionsHook.filters?.lessons;
    if (!val || val === 'all' || val === null) return 'Temas';
    // lessons filter can be a single ID or array
    const lessonId = Array.isArray(val) ? val[0] : val;
    const found = topicOptions.find(o => String(o.value) === String(lessonId));
    return found ? found.label : 'Temas';
  }, [questionsHook.filters?.lessons, topicOptions]);

  // Returns true if this question can be added to a test.
  // Restriction is active only when at least one provider is marked as _test_unlocked.
  // If none are marked, fail open so the system is not accidentally restrictive.
  const isQuestionAllowed = useCallback((question) => {
    if (allowedProviderIds === null) return true; // still loading → fail open
    if (allowedProviderIds.size === 0) return true; // no providers unlocked → fail open
    return (question.qe_provider || []).some(id => allowedProviderIds.has(id));
  }, [allowedProviderIds]);

  // Build the WP admin edit URL for a question
  const getWpEditUrl = (questionId) => {
    const apiUrl = window.qe_data?.api_url || '';
    const siteUrl = apiUrl.replace(/\/wp-json\/?$/, '');
    return `${siteUrl}/wp-admin/post.php?post=${questionId}&action=edit`;
  };

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
            title="Filtros"
          >
            <Filter size={18} />
          </button>
          <button
            onClick={() => { setBatchMode(prev => !prev); setBatchSelected(new Set()); setBatchCategory(''); }}
            className="p-2 rounded-lg border transition-colors shadow-sm"
            style={batchMode
              ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' }
              : { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderColor: colors.border, color: colors.text }
            }
            title="Cambiar categoría en lote"
          >
            <Tag size={18} />
          </button>
        </div>

        {/* Batch category controls */}
        {batchMode && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#3b82f6' }}>
              <Tag size={12} />
              <span>
                {batchSelected.size === 0
                  ? 'Selecciona preguntas de la lista'
                  : `${batchSelected.size} pregunta${batchSelected.size !== 1 ? 's' : ''} seleccionada${batchSelected.size !== 1 ? 's' : ''}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={batchCategory}
                onChange={e => setBatchCategory(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none"
                style={{
                  border: `2px solid #3b82f6`,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: colors.text
                }}
              >
                <option value="">Seleccionar categoría...</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={confirmBatchCategory}
                disabled={!batchCategory || batchSelected.size === 0 || updatingBatch}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#3b82f6' }}
              >
                {updatingBatch ? '...' : 'Aplicar'}
              </button>
              <button
                onClick={cancelBatch}
                disabled={updatingBatch}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ border: `1px solid ${colors.border}`, color: colors.textMuted, backgroundColor: 'transparent' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 text-sm animate-in fade-in slide-in-from-top-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${selectedCategory !== 'all' ? colors.accent : colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: selectedCategory !== 'all' ? colors.accent : colors.text
              }}
            >
              <option value="all">Categorías</option>
              {categoryOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={questionsHook.filters?.provider || 'all'}
              onChange={(e) => questionsHook.updateFilter('provider', e.target.value)}
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
             {/* Searchable Topic Dropdown */}
             <div className="relative" ref={topicDropdownRef}>
              <button
                type="button"
                onClick={() => { setTopicDropdownOpen(!topicDropdownOpen); setTopicSearch(''); }}
                className="w-full px-2 py-2 rounded-lg text-left flex items-center justify-between gap-1 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                style={{
                  border: `2px solid ${topicDropdownOpen ? colors.accent : colors.border}`,
                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                  color: questionsHook.filters?.lessons && questionsHook.filters.lessons !== null ? colors.accent : colors.text
                }}
              >
                <span className="truncate text-sm">
                  {providerLessonsLoading ? 'Cargando temas...' : selectedTopicLabel}
                </span>
                {providerLessonsLoading
                  ? <Loader2 size={14} className="flex-shrink-0 animate-spin opacity-50" />
                  : <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${topicDropdownOpen ? 'rotate-180' : ''}`} />
                }
              </button>
              {topicDropdownOpen && (
                <div
                  className="absolute z-50 left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden"
                  style={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div className="p-1.5">
                    <input
                      type="text"
                      value={topicSearch}
                      onChange={e => setTopicSearch(e.target.value)}
                      placeholder="Buscar tema..."
                      autoFocus
                      className="w-full text-sm px-2 py-1.5 rounded outline-none"
                      style={{
                        backgroundColor: isDarkMode ? '#111827' : '#f3f4f6',
                        color: colors.text
                      }}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { questionsHook.updateFilter('lessons', null); setTopicDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-sm transition-colors"
                      style={{ color: colors.textMuted, fontStyle: 'italic', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.hoverBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      Todos los temas
                    </button>
                    {filteredTopicOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm" style={{ color: colors.textMuted }}>
                        {providerLessons !== null && providerLessons.length === 0
                          ? 'Sin temas para este proveedor'
                          : 'Sin resultados'
                        }
                      </div>
                    ) : (
                      filteredTopicOptions.map(opt => {
                        const currentLesson = questionsHook.filters?.lessons;
                        const currentLessonId = Array.isArray(currentLesson) ? currentLesson[0] : currentLesson;
                        const isActive = currentLessonId != null && String(currentLessonId) === String(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { questionsHook.updateFilter('lessons', [opt.value]); setTopicDropdownOpen(false); }}
                            className="w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between"
                            style={{
                              color: isActive ? colors.accent : colors.text,
                              fontWeight: isActive ? 600 : 400,
                              backgroundColor: isActive ? `${colors.accent}15` : 'transparent'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isActive ? `${colors.accent}25` : colors.hoverBg; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isActive ? `${colors.accent}15` : 'transparent'; }}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isActive && (
                              <CheckCircle size={12} style={{ color: colors.accent, flexShrink: 0 }} />
                            )}
                          </button>
                        );
                      }))
                    }
                  </div>
                </div>
              )}
             </div>
            <select
              value={questionsHook.filters?.difficulty || 'all'}
              onChange={(e) => questionsHook.updateFilter('difficulty', e.target.value)}
              className="px-2 py-2 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              style={{
                border: `2px solid ${colors.border}`,
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                color: colors.text
              }}
            >
               <option value="all">Dificultad</option>
              {difficultyOptions.filter(o => o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && questionsHook.pagination.total > 0 && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs border-b"
          style={{ color: colors.textMuted, borderColor: colors.border }}
        >
          <span>
            {questionsHook.hasMore
              ? `Mostrando ${questionsHook.questions.length} de ${questionsHook.pagination.total}`
              : `${questionsHook.pagination.total} pregunta${questionsHook.pagination.total !== 1 ? 's' : ''}`
            }
          </span>
          {questionsHook.loading && (
            <Loader2 size={12} className="animate-spin opacity-50" style={{ color: colors.textMuted }} />
          )}
        </div>
      )}

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
            {questionsHook.questions.map(baseQuestion => {
              // Merge any locally-edited override so individual cards reflect changes
              // (e.g. lock disappears after provider is changed) without reloading the list
              const question = questionOverrides[baseQuestion.id]
                ? { ...baseQuestion, ...questionOverrides[baseQuestion.id] }
                : baseQuestion;

              const isSelected = localSelected.has(question.id);
              const isExcluded = excludedIds.includes(question.id);

              if (isExcluded) return null;

              // Compute match indicators when searching
              const searchTerm = (questionsHook.filters?.search || '').toLowerCase().trim();
              let matchTags = null;
              if (searchTerm) {
                const matches = [];
                const title = (question.title?.rendered || question.title || '').toLowerCase();
                const content = (question.content?.rendered || question.content || '').replace(/<[^>]*>/g, '').toLowerCase();
                const matchingOpts = (question.meta?._question_options || []).filter(o => (o.text || '').toLowerCase().includes(searchTerm));

                if (title.includes(searchTerm)) matches.push('título');
                if (content.includes(searchTerm)) matches.push('explicación');
                if (matchingOpts.length > 0) matches.push(matchingOpts.length === 1 ? '1 opción' : `${matchingOpts.length} opciones`);
                if (matches.length > 0) matchTags = matches;
              }

              const allowed = isQuestionAllowed(question);

              if (!allowed) {
                // Restricted: cannot be added to a test, but can still be batch-edited
                return (
                  <div
                    key={question.id}
                    onClick={batchMode ? () => toggleBatchSelect(question.id) : undefined}
                    className={`flex items-start gap-3 p-3 ${batchMode ? 'cursor-pointer' : ''}`}
                    style={{
                      opacity: batchMode ? 1 : 0.6,
                      backgroundColor: batchMode && batchSelected.has(question.id)
                        ? (isDarkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff')
                        : 'transparent'
                    }}
                  >
                    <div className="mt-0.5">
                      {batchMode
                        ? batchSelected.has(question.id)
                          ? <CheckSquare size={18} className="text-blue-500" />
                          : <Square size={18} className="text-gray-400 dark:text-gray-600" />
                        : <Lock size={16} className="text-gray-300 dark:text-gray-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2 mb-0.5" style={{ color: colors.text }}>
                        {question.title?.rendered || question.title || 'Sin título'}
                      </p>
                      <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: colors.textMuted }}>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                          style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                        >
                          {(() => {
                            const providerIds = question.qe_provider || [];
                            const names = providerIds
                              .map(id => providerOptions.find(p => p.value === id)?.label)
                              .filter(Boolean);
                            return names.length > 0
                              ? `Proveedor: ${names.join(', ')}`
                              : 'Sin proveedor';
                          })()}
                        </span>
                        {(quizMembership[question.id] || []).map(quiz => (
                          <span
                            key={quiz.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none border"
                            style={isDarkMode
                              ? { backgroundColor: `${colors.accent}15`, color: colors.accent, borderColor: `${colors.accent}40` }
                              : { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
                            }
                          >
                            {quiz.title}
                          </span>
                        ))}
                        {question.difficulty && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            question.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {question.difficulty === 'hard' ? 'Difícil' : question.difficulty === 'medium' ? 'Media' : 'Fácil'}
                          </span>
                        )}
                      </div>
                    </div>
                    {onEditQuestion ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditQuestion(question); }}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors mt-0.5"
                        style={{
                          border: `1.5px solid ${colors.accent}`,
                          color: colors.accent,
                          backgroundColor: `${colors.accent}10`,
                        }}
                      >
                        <ExternalLink size={11} />
                        Editar
                      </button>
                    ) : (
                      <a
                        href={getWpEditUrl(question.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors mt-0.5"
                        style={{
                          border: `1.5px solid ${colors.accent}`,
                          color: colors.accent,
                          backgroundColor: `${colors.accent}10`,
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={11} />
                        Editar
                      </a>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={question.id}
                  onClick={() => batchMode ? toggleBatchSelect(question.id) : handleToggleSelect(question)}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                    batchMode
                      ? batchSelected.has(question.id) ? '' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                      : isSelected ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  style={{
                    backgroundColor: batchMode
                      ? batchSelected.has(question.id) ? (isDarkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent'
                      : isSelected ? colors.selectedBg : 'transparent'
                  }}
                >
                  <div className="mt-0.5">
                    {batchMode
                      ? batchSelected.has(question.id)
                        ? <CheckSquare size={18} className="text-blue-500" />
                        : <Square size={18} className="text-gray-400 dark:text-gray-600" />
                      : isSelected
                        ? <CheckCircle size={18} className="text-amber-500" />
                        : <Circle size={18} className="text-gray-400 dark:text-gray-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 mb-0.5" style={{ color: colors.text }}>
                      {question.title?.rendered || question.title || 'Sin título'}
                    </p>
                    <div className="flex items-center gap-2 text-xs opacity-70 flex-wrap" style={{ color: colors.textMuted }}>
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
                      {matchTags && matchTags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                          style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
                        >
                          {tag}
                        </span>
                      ))}
                      {(quizMembership[question.id] || []).map(quiz => (
                        <span
                          key={quiz.id}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none border"
                          style={isDarkMode
                            ? { backgroundColor: `${colors.accent}15`, color: colors.accent, borderColor: `${colors.accent}40` }
                            : { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
                          }
                        >
                          {quiz.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  {onEditQuestion ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditQuestion(question); }}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors mt-0.5"
                      style={{
                        border: `1.5px solid ${colors.accent}`,
                        color: colors.accent,
                        backgroundColor: `${colors.accent}10`,
                      }}
                    >
                      <ExternalLink size={11} />
                      Editar
                    </button>
                  ) : (
                    <a
                      href={getWpEditUrl(question.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors mt-0.5"
                      style={{
                        border: `1.5px solid ${colors.accent}`,
                        color: colors.accent,
                        backgroundColor: `${colors.accent}10`,
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={11} />
                      Editar
                    </a>
                  )}
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
              disabled={questionsHook.loading}
              className="inline-flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-lg transition-opacity disabled:opacity-60"
              style={{ backgroundColor: colors.accent, color: '#ffffff' }}
            >
              {questionsHook.loading
                ? <><Loader2 size={13} className="animate-spin" /> Cargando...</>
                : 'Cargar más'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionSelector;
