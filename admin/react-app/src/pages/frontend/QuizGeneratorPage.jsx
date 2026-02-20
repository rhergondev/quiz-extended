import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sliders, Sparkles, Settings, Play, RotateCcw, Filter, 
  Check, ChevronDown, X, Clock, Target, BookOpen, 
  AlertTriangle, Star, XCircle, HelpCircle, ChevronLeft, FileText
} from 'lucide-react';

// Hooks
import useQuestions from '../../hooks/useQuestions';
import useCourse from '../../hooks/useCourse';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions';
import { useTheme } from '../../contexts/ThemeContext';

// Services
import { getCourseLessons } from '../../api/services/courseLessonService';

// Components
import Quiz from '../../components/frontend/Quiz';
import QuizResults from '../../components/frontend/QuizResults';
import CoursePageTemplate from '../../components/course/CoursePageTemplate';

// Simple MultiSelect Component with Select All
const MultiSelect = ({ label, options, selected, onChange, placeholder = "Seleccionar...", pageColors, isDarkMode, selectAllLabel }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const allValues = options.map(o => o.value);
  const isAllSelected = allValues.length > 0 && allValues.every(v => selected.includes(v));

  const handleToggle = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(allValues);
    }
  };

  const selectedLabels = options
    .filter(opt => selected.includes(opt.value))
    .map(opt => opt.label);

  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg flex items-center justify-between transition-all text-sm"
        style={{ 
          border: `2px solid ${isOpen ? pageColors.accent : pageColors.inputBorder}`,
          backgroundColor: pageColors.inputBg,
          color: pageColors.text
        }}
      >
        <span className="block truncate">
          {selected.length === 0 
            ? <span style={{ color: pageColors.textMuted }}>{placeholder}</span>
            : isAllSelected 
              ? <span>{selectAllLabel || t('common.allSelected')}</span>
              : `${selected.length} seleccionados`
          }
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: pageColors.textMuted }} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute z-20 w-full mt-1 max-h-48 overflow-auto rounded-lg shadow-lg border-2"
            style={{ 
              backgroundColor: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
              borderColor: isDarkMode ? pageColors.accent : pageColors.inputBorder
            }}
          >
            {/* Select All Option */}
            <div 
              onClick={handleSelectAll}
              className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors border-b"
              style={{ backgroundColor: 'transparent', borderColor: pageColors.inputBorder }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div 
                className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                style={{ 
                  backgroundColor: isAllSelected ? pageColors.accent : 'transparent',
                  borderColor: isAllSelected ? pageColors.accent : pageColors.inputBorder
                }}
              >
                {isAllSelected && <Check size={10} className="text-white" />}
              </div>
              <span className="text-sm font-medium" style={{ color: pageColors.text }}>{selectAllLabel || t('common.selectAll')}</span>
            </div>
            {options.map(option => (
              <div 
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ 
                    backgroundColor: selected.includes(option.value) ? pageColors.accent : 'transparent',
                    borderColor: selected.includes(option.value) ? pageColors.accent : pageColors.inputBorder
                  }}
                >
                  {selected.includes(option.value) && <Check size={10} className="text-white" />}
                </div>
                <span className="text-sm truncate" style={{ color: pageColors.text }}>{option.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Selected Tags */}
      {selected.length > 0 && !isAllSelected && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabels.map((label, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ 
                backgroundColor: isDarkMode ? `${pageColors.accent}30` : `${pageColors.text}15`,
                color: isDarkMode ? '#ffffff' : pageColors.text
              }}
            >
              {label}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(options.find(o => o.label === label).value);
                }}
                className="ml-1 hover:opacity-70"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const QuizGeneratorPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  // Colores adaptativos según el modo (misma lógica que otras páginas)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}60`,
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#1a202c'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
    // Colores para inputs - bordes más visibles en ambos modos
    inputBg: isDarkMode ? 'rgba(0,0,0,0.2)' : '#ffffff',
    inputBorder: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    // Borde de contenedor principal - accent en dark mode
    containerBorder: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb'),
  };

  // State
  const [showQuiz, setShowQuiz] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [quizResults, setQuizResults] = useState(null);
  const [resultsQuestions, setResultsQuestions] = useState(null);
  const [resultsQuizInfo, setResultsQuizInfo] = useState(null);
  const [config, setConfig] = useState({
    lessons: [],
    difficulty: 'all',
    numQuestions: 10,
    statusFilters: [] // favorites, failed, risked, unanswered
  });

  // Data Hooks
  const { questions, loading: questionsLoading, fetchQuestions } = useQuestions({ autoFetch: false });

  // Fetch lessons for the course
  useEffect(() => {
    const fetchLessons = async () => {
      if (!courseId) return;
      
      setLessonsLoading(true);
      try {
        const courseIdInt = parseInt(courseId, 10);
        if (isNaN(courseIdInt)) {
          throw new Error('Invalid course ID');
        }
        
        const result = await getCourseLessons(courseIdInt, { perPage: 100 });
        setLessons(result.data || []);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  // Handlers
  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleStatusFilter = (filter) => {
    setConfig(prev => {
      const filters = prev.statusFilters.includes(filter)
        ? prev.statusFilters.filter(f => f !== filter)
        : [...prev.statusFilters, filter];
      return { ...prev, statusFilters: filters };
    });
  };

  const handleGenerate = async () => {
    // Fetch questions with all filters
    // If lessons are selected, don't pass course_id (lessons already belong to this course)
    // This avoids redundant AND conditions in the meta_query
    const allLessonIds = lessons.map(l => l.id).filter(Boolean);
    const hasLessons = config.lessons.length > 0;
    
    // Si se seleccionaron todos los temas o ninguno, no enviar filtro de lessons (usar null)
    // Solo filtrar cuando hay una selección parcial
    const isAllSelected = hasLessons && config.lessons.length === allLessonIds.length;
    const lessonsFilter = (hasLessons && !isAllSelected) ? config.lessons : null;
    
    await fetchQuestions(true, {
      course_id: null, // Always prefer lessons filter (all lessons if none selected)
      lessons: lessonsFilter,
      difficulty: config.difficulty !== 'all' ? config.difficulty : null,
      perPage: config.numQuestions,
      status_filters: config.statusFilters.length > 0 ? config.statusFilters : null,
      status: 'publish'
    });
    setShowQuiz(true);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
  };

  const handleQuizComplete = (result, questions, quizInfo) => {
    setQuizResults(result);
    setResultsQuestions(questions);
    setResultsQuizInfo(quizInfo);
  };

  const handleCloseResults = () => {
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
    setShowQuiz(false);
  };

  // Generated Quiz Object
  const generatedQuiz = useMemo(() => {
    // Calcular time_limit dinámicamente: mitad del número de preguntas
    const calculatedTimeLimit = questions.length > 0 ? Math.max(1, Math.ceil(questions.length / 2)) : 0;
    
    return {
      id: 'custom-generated',
      title: { rendered: 'Test Personalizado' },
      meta: {
        _quiz_question_ids: questions.map(q => q.id),
        _time_limit: calculatedTimeLimit,
        _passing_score: 70,
      },
      question_count: questions.length
    };
  }, [questions]);

  // Options for selects
  const lessonOptions = lessons.map(l => ({ 
    value: l.id, 
    label: l.title?.rendered || l.title || t('courses.untitledLesson')
  }));
  
  // Opciones de dificultad (meta field _difficulty_level: easy, medium, hard)
  const difficultyOptions = [
    { value: 'all', label: t('courses.difficulty.all') },
    { value: 'easy', label: t('common.easy') },
    { value: 'medium', label: t('common.medium') },
    { value: 'hard', label: t('common.hard') }
  ];

  const isLoading = courseLoading || lessonsLoading;

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.testGenerator')}
    >
      <div className="relative h-full">
        {/* Main Configuration Panel */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showQuiz ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="mx-auto pt-8 pb-24" style={{ paddingLeft: '3rem', paddingRight: '3rem' }}>
              {isLoading ? (
                <div 
                  className="rounded-xl border-2 overflow-hidden"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.containerBorder
                  }}
                >
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className="px-4 py-3 flex items-center gap-3 animate-pulse"
                      style={{ borderBottom: i < 3 ? `1px solid rgba(156, 163, 175, 0.2)` : 'none' }}
                    >
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
                      <div className="h-4 rounded flex-1" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', maxWidth: '200px' }}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="rounded-xl border-2 overflow-hidden"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.containerBorder
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3"
                    style={{ backgroundColor: pageColors.primary }}
                  >
                    <h3 className="text-base font-bold text-white">
                      {t('courses.testGenerator')}
                    </h3>
                  </div>

                  {/* Configuration Content */}
                  <div className="p-4 space-y-4">
                    {/* Row 1: Lessons Multi-Select (full width) */}
                    <div 
                      className="rounded-lg p-3"
                      style={{ border: `1px solid ${pageColors.inputBorder}` }}
                    >
                      <MultiSelect
                      label={t('lessons.title')}
                      options={lessonOptions}
                      selected={config.lessons}
                      onChange={(selected) => handleConfigChange('lessons', selected)}
                      placeholder={t('common.all')}
                      pageColors={pageColors}
                      isDarkMode={isDarkMode}
                      selectAllLabel={t('common.allLessons')}
                    />
                    </div>

                    {/* Row 2: Difficulty | Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Difficulty */}
                      <div 
                        className="rounded-lg p-3"
                        style={{ border: `1px solid ${pageColors.inputBorder}` }}
                      >
                        <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                          {t('courses.difficulty.label')}
                        </label>
                        <div className="relative">
                          <select
                            value={config.difficulty}
                            onChange={(e) => handleConfigChange('difficulty', e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg appearance-none transition-all"
                            style={{ 
                              border: `2px solid ${pageColors.inputBorder}`,
                              backgroundColor: pageColors.inputBg,
                              color: pageColors.text
                            }}
                          >
                            {difficultyOptions.map(opt => (
                              <option key={opt.value} value={opt.value} style={{ backgroundColor: pageColors.inputBg, color: pageColors.text }}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown 
                            className="absolute right-2.5 top-2.5 pointer-events-none" 
                            size={14} 
                            style={{ color: pageColors.textMuted }}
                          />
                        </div>
                      </div>

                      {/* Filters - 2x2 Checkboxes */}
                      <div 
                        className="rounded-lg p-3"
                        style={{ border: `1px solid ${pageColors.inputBorder}` }}
                      >
                        <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                          {t('courses.questionTypes')}
                        </label>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          {[
                            { id: 'favorites', label: t('courses.favorites') },
                            { id: 'failed', label: t('courses.failed') },
                            { id: 'risked', label: t('courses.atRisk') },
                            { id: 'unanswered', label: t('courses.notAnswered') }
                          ].map(status => {
                            const isSelected = config.statusFilters.includes(status.id);
                            return (
                              <label
                                key={status.id}
                                className="flex items-center gap-2 cursor-pointer py-1"
                              >
                                <div 
                                  className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                                  style={{ 
                                    backgroundColor: isSelected ? pageColors.accent : 'transparent',
                                    borderColor: isSelected ? pageColors.accent : pageColors.inputBorder
                                  }}
                                  onClick={() => toggleStatusFilter(status.id)}
                                >
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span 
                                  className="text-xs"
                                  style={{ color: pageColors.text }}
                                  onClick={() => toggleStatusFilter(status.id)}
                                >
                                  {status.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Number of Questions | Time Limit */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Number of Questions */}
                      <div 
                        className="rounded-lg p-3"
                        style={{ border: `1px solid ${pageColors.inputBorder}` }}
                      >
                        <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                          {t('common.questions')}
                        </label>
                        <div className="relative">
                          <select
                            value={config.numQuestions}
                            onChange={(e) => handleConfigChange('numQuestions', parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg appearance-none transition-all"
                            style={{ 
                              border: `2px solid ${pageColors.inputBorder}`,
                              backgroundColor: pageColors.inputBg,
                              color: pageColors.text
                            }}
                          >
                            {Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map(num => (
                              <option key={num} value={num} style={{ backgroundColor: pageColors.inputBg, color: pageColors.text }}>{num}</option>
                            ))}
                          </select>
                          <ChevronDown 
                            className="absolute right-2.5 top-2.5 pointer-events-none" 
                            size={14} 
                            style={{ color: pageColors.textMuted }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button
                      onClick={handleGenerate}
                      disabled={questionsLoading}
                      className="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ 
                        backgroundColor: pageColors.accent,
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        if (!questionsLoading) {
                          e.currentTarget.style.opacity = '0.9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!questionsLoading) {
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                    >
                      {questionsLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('common.loading')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>{t('tests.generateTest')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quiz Viewer - Slides from Right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showQuiz ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {showQuiz && (
            <div className="h-full flex flex-col">
              {/* Quiz Content */}
              <div className="flex-1 overflow-hidden">
                {questions.length > 0 ? (
                  quizResults ? (
                    <QuizResults
                      result={quizResults}
                      questions={resultsQuestions}
                      quizInfo={resultsQuizInfo}
                      quizTitle={t('tests.customTest')}
                      noPadding={true}
                      onBack={handleCloseResults}
                      courseId={courseId}
                      courseName={courseName}
                    />
                  ) : (
                    <Quiz 
                      quizId="custom" 
                      customQuiz={generatedQuiz}
                      onQuizComplete={handleQuizComplete}
                      onExit={handleCloseQuiz}
                      hideDarkModeToggle={true}
                    />
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                    >
                      <AlertTriangle size={28} style={{ color: pageColors.textMuted }} />
                    </div>
                    <h3 className="text-base font-bold mb-2" style={{ color: pageColors.text }}>
                      {t('tests.noQuestionsFound')}
                    </h3>
                    <p className="max-w-md mx-auto mb-5 text-sm" style={{ color: pageColors.textMuted }}>
                      {t('tests.adjustFilters')}
                    </p>
                    <button
                      onClick={handleCloseQuiz}
                      className="px-5 py-2 rounded-lg font-medium text-sm transition-all"
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
                      {t('common.back')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default QuizGeneratorPage;