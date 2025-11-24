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
const MultiSelect = ({ label, options, selected, onChange, placeholder = "Seleccionar..." }) => {
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
      <label className="block text-sm font-medium mb-2" style={{ color: getColor('textPrimary', '#1f2937') }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 text-left border-2 rounded-xl flex items-center justify-between transition-all"
        style={{ 
          borderColor: isOpen ? getColor('primary', '#3b82f6') : getColor('borderColor', '#e5e7eb'),
          backgroundColor: getColor('background', '#ffffff')
        }}
      >
        <span className="block truncate text-sm" style={{ color: getColor('textPrimary', '#1f2937') }}>
          {selected.length === 0 
            ? <span className="text-gray-400">{placeholder}</span>
            : `${selected.length} seleccionados`
          }
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute z-20 w-full mt-2 max-h-60 overflow-auto rounded-xl shadow-lg border border-gray-100"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
          >
            {options.map(option => (
              <div 
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className="px-4 py-2.5 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selected.includes(option.value) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: selected.includes(option.value) ? getColor('primary', '#3b82f6') : 'transparent',
                    borderColor: selected.includes(option.value) ? getColor('primary', '#3b82f6') : '#d1d5db'
                  }}
                >
                  {selected.includes(option.value) && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-gray-700">{option.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Selected Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedLabels.map((label, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ 
                backgroundColor: `${getColor('primary', '#3b82f6')}10`,
                color: getColor('primary', '#3b82f6')
              }}
            >
              {label}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(options.find(o => o.label === label).value);
                }}
                className="ml-1.5 hover:opacity-70"
              >
                <X size={12} />
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
  const { getColor } = useTheme();
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
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
            <div className="max-w-4xl mx-auto px-4 pt-8 pb-24">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="rounded-lg p-4 animate-pulse" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                      <div className="h-6 rounded" style={{ backgroundColor: `${getColor('primary', '#1a202c')}20`, width: '60%' }}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="rounded-xl overflow-hidden border-2"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground'),
                    borderColor: getColor('borderColor')
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3"
                    style={{ 
                      backgroundColor: getColor('primary', '#1a202c')
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={24} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                          {t('courses.testGenerator')}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.8 }}>
                          {t('tests.customTestDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador */}
                  <div 
                    style={{ 
                      height: '1px', 
                      backgroundColor: 'rgba(156, 163, 175, 0.2)'
                    }} 
                  />

                  {/* Configuration Content */}
                  <div className="p-6 space-y-6">
                    {/* Filters Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sliders size={18} style={{ color: getColor('primary', '#1a202c') }} />
                        <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('primary', '#1a202c') }}>
                          {t('tests.configuration')}
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {/* Row 1: Lessons Multi-Select */}
                        <div>
                          <MultiSelect
                            label={t('lessons.title')}
                            options={lessonOptions}
                            selected={config.lessons}
                            onChange={(selected) => handleConfigChange('lessons', selected)}
                            placeholder={t('common.all')}
                          />
                        </div>

                        {/* Row 2: Difficulty, Questions & Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Difficulty */}
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: getColor('textPrimary', '#1f2937') }}>
                              {t('courses.difficulty.label')}
                            </label>
                            <div className="relative">
                              <select
                                value={config.difficulty}
                                onChange={(e) => handleConfigChange('difficulty', e.target.value)}
                                className="w-full px-4 py-2.5 text-sm border-2 rounded-lg appearance-none transition-all"
                                style={{ 
                                  borderColor: getColor('borderColor', '#e5e7eb'),
                                  backgroundColor: getColor('background', '#ffffff'),
                                  color: getColor('primary', '#1a202c')
                                }}
                              >
                                {difficultyOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <ChevronDown 
                                className="absolute right-3 top-3 pointer-events-none" 
                                size={16} 
                                style={{ color: `${getColor('primary', '#1a202c')}60` }}
                              />
                            </div>
                          </div>

                          {/* Number of Questions */}
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: getColor('textPrimary', '#1f2937') }}>
                              {t('common.questions')}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={config.numQuestions}
                              onChange={(e) => handleConfigChange('numQuestions', parseInt(e.target.value) || 10)}
                              className="w-full px-4 py-2.5 text-sm border-2 rounded-lg transition-all"
                              style={{ 
                                borderColor: getColor('borderColor', '#e5e7eb'),
                                backgroundColor: getColor('background', '#ffffff'),
                                color: getColor('primary', '#1a202c')
                              }}
                            />
                          </div>

                          {/* Time Limit */}
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: getColor('textPrimary', '#1f2937') }}>
                              {t('tests.timeLimit')} ({t('tests.minutes')})
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={config.timeLimit}
                              onChange={(e) => handleConfigChange('timeLimit', parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-2.5 text-sm border-2 rounded-lg transition-all"
                              style={{ 
                                borderColor: getColor('borderColor', '#e5e7eb'),
                                backgroundColor: getColor('background', '#ffffff'),
                                color: getColor('primary', '#1a202c')
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Separador */}
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />

                    {/* Status Filters */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Filter size={18} style={{ color: getColor('primary', '#1a202c') }} />
                        <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('primary', '#1a202c') }}>
                          {t('courses.questionTypes')}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                              className="relative px-3 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 hover:shadow-md"
                              style={{ 
                                borderColor: isSelected ? status.colorHex : getColor('borderColor', '#e5e7eb'),
                                backgroundColor: isSelected ? `${status.colorHex}10` : getColor('background', '#ffffff')
                              }}
                            >
                              <status.icon size={20} style={{ color: status.colorHex }} />
                              <span 
                                className="text-xs font-medium text-center leading-tight"
                                style={{ color: getColor('textPrimary', '#1f2937') }}
                              >
                                {status.label}
                              </span>
                              {isSelected && (
                                <div 
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: status.colorHex }}
                                >
                                  <Check size={12} style={{ color: '#ffffff' }} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Separador inferior */}
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />

                    {/* Generate Button */}
                    <div>
                      <button
                        onClick={handleGenerate}
                        disabled={questionsLoading}
                        className="w-full py-3 rounded-lg font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                        style={{ 
                          backgroundColor: getColor('accent', '#f59e0b'),
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          if (!questionsLoading) {
                            e.currentTarget.style.backgroundColor = `${getColor('accent', '#f59e0b')}dd`;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!questionsLoading) {
                            e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b');
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                          }
                        }}
                      >
                        {questionsLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={20} />
                            <span>{t('tests.generateTest')}</span>
                          </>
                        )}
                      </button>
                    </div>
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
                className="flex items-center justify-between px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles size={18} style={{ color: getColor('accent', '#f59e0b') }} className="flex-shrink-0" />
                  <h2 className="text-sm sm:text-base font-semibold leading-tight truncate" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('tests.customTest')}
                  </h2>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-1"
                    style={{ 
                      backgroundColor: `${getColor('accent', '#f59e0b')}10`,
                      color: getColor('accent', '#f59e0b')
                    }}
                  >
                    {questions.length} {t('common.questions').toLowerCase()}
                  </span>
                </div>

                {/* Close button */}
                <button
                  onClick={handleCloseQuiz}
                  className="p-1.5 rounded-lg transition-all flex-shrink-0"
                  style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                  }}
                  title={t('common.back')}
                >
                  <X size={20} style={{ color: getColor('primary', '#1a202c') }} />
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
                  <div 
                    className="h-full flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                    >
                      <AlertTriangle size={32} style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
                      {t('tests.noQuestionsFound')}
                    </h3>
                    <p className="max-w-md mx-auto mb-6 text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                      {t('tests.adjustFilters')}
                    </p>
                    <button
                      onClick={handleCloseQuiz}
                      className="px-6 py-2 rounded-lg font-medium transition-all"
                      style={{ 
                        backgroundColor: getColor('primary', '#1a202c'),
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}dd`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
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