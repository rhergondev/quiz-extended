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
import CoursePageTemplate from '../../components/course/CoursePageTemplate';

// Simple MultiSelect Component
const MultiSelect = ({ label, options, selected, onChange, placeholder = "Seleccionar...", pageColors, isDarkMode }) => {
  const { getColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
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
        className="w-full px-3 py-2 text-left border rounded-lg flex items-center justify-between transition-all text-sm"
        style={{ 
          borderColor: isOpen ? pageColors.accent : getColor('borderColor', '#e5e7eb'),
          backgroundColor: getColor('background', '#ffffff'),
          color: pageColors.text
        }}
      >
        <span className="block truncate">
          {selected.length === 0 
            ? <span style={{ color: pageColors.textMuted }}>{placeholder}</span>
            : `${selected.length} seleccionados`
          }
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: pageColors.textMuted }} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute z-20 w-full mt-1 max-h-48 overflow-auto rounded-lg shadow-lg border"
            style={{ 
              backgroundColor: getColor('background', '#ffffff'),
              borderColor: getColor('borderColor', '#e5e7eb')
            }}
          >
            {options.map(option => (
              <div 
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}05`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ 
                    backgroundColor: selected.includes(option.value) ? pageColors.accent : 'transparent',
                    borderColor: selected.includes(option.value) ? pageColors.accent : getColor('borderColor', '#d1d5db')
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
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedLabels.map((label, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ 
                backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.text}10`,
                color: isDarkMode ? pageColors.accent : pageColors.text
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
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
  };

  // State
  const [showQuiz, setShowQuiz] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [config, setConfig] = useState({
    lessons: [],
    difficulty: 'all',
    numQuestions: 10,
    timeLimit: 0,
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
    await fetchQuestions(true, {
      course_id: courseId, // 🔥 Filtrar por el curso actual
      lessons: config.lessons.length > 0 ? config.lessons : null,
      difficulty: config.difficulty !== 'all' ? config.difficulty : null,
      perPage: config.numQuestions,
      status_filters: config.statusFilters.length > 0 ? config.statusFilters : null
    });
    setShowQuiz(true);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
  };

  // Generated Quiz Object
  const generatedQuiz = useMemo(() => ({
    id: 'custom-generated',
    title: { rendered: 'Test Personalizado' },
    meta: {
      _quiz_question_ids: questions.map(q => q.id),
      _time_limit: config.timeLimit,
      _passing_score: 70,
    },
    question_count: questions.length
  }), [questions, config.timeLimit]);

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
            <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
              {isLoading ? (
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
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="rounded-lg border overflow-hidden"
                  style={{ 
                    backgroundColor: getColor('background', '#ffffff'),
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: isDarkMode ? pageColors.accent : getColor('primary', '#1a202c') }}
                  >
                    <Sparkles size={20} className="text-white flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {t('courses.testGenerator')}
                      </h3>
                      <p className="text-xs text-white/70 truncate">
                        {t('tests.customTestDescription')}
                      </p>
                    </div>
                  </div>

                  {/* Configuration Content */}
                  <div className="p-4 space-y-5">
                    {/* Filters Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sliders size={14} style={{ color: pageColors.accent }} />
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
                          {t('tests.configuration')}
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {/* Row 1: Lessons Multi-Select */}
                        <MultiSelect
                          label={t('lessons.title')}
                          options={lessonOptions}
                          selected={config.lessons}
                          onChange={(selected) => handleConfigChange('lessons', selected)}
                          placeholder={t('common.all')}
                          pageColors={pageColors}
                          isDarkMode={isDarkMode}
                        />

                        {/* Row 2: Difficulty, Questions & Time */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Difficulty */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                              {t('courses.difficulty.label')}
                            </label>
                            <div className="relative">
                              <select
                                value={config.difficulty}
                                onChange={(e) => handleConfigChange('difficulty', e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg appearance-none transition-all"
                                style={{ 
                                  borderColor: getColor('borderColor', '#e5e7eb'),
                                  backgroundColor: getColor('background', '#ffffff'),
                                  color: pageColors.text
                                }}
                              >
                                {difficultyOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <ChevronDown 
                                className="absolute right-2.5 top-2.5 pointer-events-none" 
                                size={14} 
                                style={{ color: pageColors.textMuted }}
                              />
                            </div>
                          </div>

                          {/* Number of Questions */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                              {t('common.questions')}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={config.numQuestions}
                              onChange={(e) => handleConfigChange('numQuestions', parseInt(e.target.value) || 10)}
                              className="w-full px-3 py-2 text-sm border rounded-lg transition-all"
                              style={{ 
                                borderColor: getColor('borderColor', '#e5e7eb'),
                                backgroundColor: getColor('background', '#ffffff'),
                                color: pageColors.text
                              }}
                            />
                          </div>

                          {/* Time Limit */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: pageColors.text }}>
                              {t('tests.timeLimit')}
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={config.timeLimit}
                              onChange={(e) => handleConfigChange('timeLimit', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 text-sm border rounded-lg transition-all"
                              style={{ 
                                borderColor: getColor('borderColor', '#e5e7eb'),
                                backgroundColor: getColor('background', '#ffffff'),
                                color: pageColors.text
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separador */}
                    <div style={{ height: '1px', backgroundColor: getColor('borderColor', '#e5e7eb') }} />

                    {/* Status Filters */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} style={{ color: pageColors.accent }} />
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
                          {t('courses.questionTypes')}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'favorites', label: t('courses.favorites'), icon: Star, colorHex: '#fbbf24' },
                          { id: 'failed', label: t('courses.failed'), icon: XCircle, colorHex: '#ef4444' },
                          { id: 'risked', label: t('courses.atRisk'), icon: AlertTriangle, colorHex: '#f97316' },
                          { id: 'unanswered', label: t('courses.notAnswered'), icon: HelpCircle, colorHex: '#3b82f6' }
                        ].map(status => {
                          const isSelected = config.statusFilters.includes(status.id);
                          return (
                            <button
                              key={status.id}
                              onClick={() => toggleStatusFilter(status.id)}
                              className="relative px-2 py-3 rounded-lg border transition-all flex flex-col items-center gap-1.5"
                              style={{ 
                                borderColor: isSelected ? status.colorHex : getColor('borderColor', '#e5e7eb'),
                                backgroundColor: isSelected ? `${status.colorHex}15` : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = isDarkMode ? `${status.colorHex}10` : `${pageColors.text}03`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <status.icon size={16} style={{ color: status.colorHex }} />
                              <span 
                                className="text-xs font-medium text-center leading-tight"
                                style={{ color: pageColors.text }}
                              >
                                {status.label}
                              </span>
                              {isSelected && (
                                <div 
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: status.colorHex }}
                                >
                                  <Check size={10} className="text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Separador */}
                    <div style={{ height: '1px', backgroundColor: getColor('borderColor', '#e5e7eb') }} />

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
              {/* Header Compacto */}
              <div 
                className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles size={16} style={{ color: pageColors.accent }} className="flex-shrink-0" />
                  <h2 className="text-sm font-medium leading-tight truncate" style={{ color: pageColors.text }}>
                    {t('tests.customTest')}
                  </h2>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.text}10`,
                      color: isDarkMode ? pageColors.accent : pageColors.text
                    }}
                  >
                    {questions.length} {t('common.questions').toLowerCase()}
                  </span>
                </div>

                {/* Close button */}
                <button
                  onClick={handleCloseQuiz}
                  className="p-1.5 rounded-lg transition-all flex-shrink-0"
                  style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                  }}
                  title={t('common.back')}
                >
                  <X size={18} style={{ color: pageColors.text }} />
                </button>
              </div>

              {/* Quiz Content */}
              <div className="flex-1 overflow-hidden">
                {questions.length > 0 ? (
                  <Quiz 
                    quizId="custom" 
                    customQuiz={generatedQuiz}
                    onQuizComplete={() => {}} // Handle completion if needed
                  />
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