import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sliders, Sparkles, Filter, Check, ChevronDown, X,
  Star, XCircle, AlertTriangle, HelpCircle, ArrowRight
} from 'lucide-react';

// Hooks
import useQuestions from '../../../hooks/useQuestions';
import useCourse from '../../../hooks/useCourse';
import { useTheme } from '../../../contexts/ThemeContext';

// Services
import { getCourseLessons } from '../../../api/services/courseLessonService';

// Components
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import SelfPacedQuestion from '../../../components/frontend/SelfPacedQuestion';

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
          borderColor: isOpen ? pageColors.accent : (isDarkMode ? 'rgba(255,255,255,0.2)' : getColor('borderColor', '#e5e7eb')),
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : getColor('background', '#ffffff'),
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
              backgroundColor: isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff'),
              borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : getColor('borderColor', '#e5e7eb')
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
                    borderColor: selected.includes(option.value) ? pageColors.accent : (isDarkMode ? 'rgba(255,255,255,0.3)' : getColor('borderColor', '#d1d5db'))
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

const SelfPacedTestsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  // Colores adaptativos según el modo
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}60`,
    accent: getColor('accent', '#f59e0b'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
    // Colores para inputs y cards en modo oscuro
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : getColor('background', '#ffffff'),
    inputBorder: isDarkMode ? 'rgba(255,255,255,0.2)' : getColor('borderColor', '#e5e7eb'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff'),
  };

  // State
  const [showPractice, setShowPractice] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
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

  const handleStartPractice = async () => {
    await fetchQuestions(true, {
      course_id: courseId,
      lessons: config.lessons.length > 0 ? config.lessons : null,
      difficulty: config.difficulty !== 'all' ? config.difficulty : null,
      perPage: config.numQuestions,
      status_filters: config.statusFilters.length > 0 ? config.statusFilters : null
    });
    setCurrentQuestionIndex(0);
    setQuestionAnswers({});
    setShowPractice(true);
  };

  const handleClosePractice = () => {
    setShowPractice(false);
    setCurrentQuestionIndex(0);
    setQuestionAnswers({});
  };

  const handleNavigateQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleQuestionAnswered = (questionId, isCorrect) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: isCorrect
    }));
  };

  // Options for selects
  const lessonOptions = lessons.map(l => ({ 
    value: l.id, 
    label: l.title?.rendered || l.title || t('courses.untitledLesson')
  }));
  
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
      sectionName={t('courses.selfPacedTests')}
    >
      <div className="relative h-full">
        {/* Configuration Panel */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showPractice ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
              {isLoading ? (
                <div 
                  className="rounded-lg border overflow-hidden"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.inputBorder
                  }}
                >
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className="px-4 py-3 flex items-center gap-3 animate-pulse"
                      style={{ borderBottom: i < 3 ? `1px solid ${pageColors.inputBorder}` : 'none' }}
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
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.inputBorder
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
                        {t('courses.selfPacedTests')}
                      </h3>
                      <p className="text-xs text-white/70 truncate">
                        {t('tests.practiceAtYourPace')}
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
                        {/* Lessons Multi-Select */}
                        <MultiSelect
                          label={t('lessons.title')}
                          options={lessonOptions}
                          selected={config.lessons}
                          onChange={(selected) => handleConfigChange('lessons', selected)}
                          placeholder={t('common.all')}
                          pageColors={pageColors}
                          isDarkMode={isDarkMode}
                        />

                        {/* Difficulty & Questions */}
                        <div className="grid grid-cols-2 gap-3">
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
                                  borderColor: pageColors.inputBorder,
                                  backgroundColor: pageColors.inputBg,
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
                                borderColor: pageColors.inputBorder,
                                backgroundColor: pageColors.inputBg,
                                color: pageColors.text
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separador */}
                    <div style={{ height: '1px', backgroundColor: pageColors.inputBorder }} />

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
                                borderColor: isSelected ? status.colorHex : pageColors.inputBorder,
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
                    <div style={{ height: '1px', backgroundColor: pageColors.inputBorder }} />

                    {/* Start Button */}
                    <button
                      onClick={handleStartPractice}
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
                          <ArrowRight size={16} />
                          <span>{t('tests.startPractice')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Practice View - Slides from Right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showPractice ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {showPractice && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div 
                className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: pageColors.cardBg,
                  borderColor: pageColors.inputBorder
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles size={16} style={{ color: pageColors.accent }} className="flex-shrink-0" />
                  <h2 className="text-sm font-medium leading-tight truncate" style={{ color: pageColors.text }}>
                    {t('courses.selfPacedPractice')}
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

                <button
                  onClick={handleClosePractice}
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

              {/* Numbered Navigation Bar */}
              {questions.length > 0 && (
                <div 
                  className="px-4 py-2.5 border-b"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.inputBorder
                  }}
                >
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {questions.map((q, idx) => {
                      const isAnswered = questionAnswers.hasOwnProperty(q.id);
                      const isCorrect = questionAnswers[q.id];
                      const isCurrent = idx === currentQuestionIndex;
                      
                      return (
                        <button
                          key={q.id}
                          onClick={() => handleNavigateQuestion(idx)}
                          className="w-8 h-8 rounded-lg font-medium text-xs transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: isCurrent 
                              ? pageColors.accent
                              : isAnswered
                              ? isCorrect ? '#10b981' : '#ef4444'
                              : 'transparent',
                            color: isCurrent || isAnswered ? '#ffffff' : pageColors.text,
                            border: `1px solid ${
                              isCurrent 
                                ? pageColors.accent
                                : isAnswered
                                ? isCorrect ? '#10b981' : '#ef4444'
                                : pageColors.inputBorder
                            }`,
                            transform: isCurrent ? 'scale(1.1)' : 'scale(1)'
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {questions.length > 0 ? (
                  <SelfPacedQuestion
                    questions={questions}
                    currentIndex={currentQuestionIndex}
                    onNavigate={handleNavigateQuestion}
                    onClose={handleClosePractice}
                    onAnswered={handleQuestionAnswered}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center">
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto"
                        style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                      >
                        <AlertTriangle size={28} style={{ color: pageColors.textMuted }} />
                      </div>
                      <h3 className="text-base font-bold mb-2" style={{ color: pageColors.text }}>
                        {t('tests.noQuestionsFound')}
                      </h3>
                      <p className="text-sm mb-5" style={{ color: pageColors.textMuted }}>
                        {t('tests.adjustFilters')}
                      </p>
                      <button
                        onClick={handleClosePractice}
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

export default SelfPacedTestsPage;
