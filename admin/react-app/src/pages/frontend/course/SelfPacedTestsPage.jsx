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

const SelfPacedTestsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
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
                    style={{ backgroundColor: getColor('primary', '#1a202c') }}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={24} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                          {t('courses.selfPacedTests')}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.8 }}>
                          {t('tests.practiceAtYourPace')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />

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
                        {/* Lessons Multi-Select */}
                        <div>
                          <MultiSelect
                            label={t('lessons.title')}
                            options={lessonOptions}
                            selected={config.lessons}
                            onChange={(selected) => handleConfigChange('lessons', selected)}
                            placeholder={t('common.all')}
                          />
                        </div>

                        {/* Difficulty & Questions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />

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

                    <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />

                    {/* Start Button */}
                    <div>
                      <button
                        onClick={handleStartPractice}
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
                            <ArrowRight size={20} />
                            <span>{t('tests.startPractice')}</span>
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
                className="flex items-center justify-between px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles size={18} style={{ color: getColor('accent', '#f59e0b') }} className="flex-shrink-0" />
                  <h2 className="text-sm sm:text-base font-semibold leading-tight truncate" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('courses.selfPacedPractice')}
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

                <button
                  onClick={handleClosePractice}
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

              {/* Numbered Navigation Bar */}
              {questions.length > 0 && (
                <div 
                  className="px-4 py-3 border-b"
                  style={{ 
                    backgroundColor: getColor('background', '#ffffff'),
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                  <div className="flex flex-wrap gap-2 justify-center">
                    {questions.map((q, idx) => {
                      const isAnswered = questionAnswers.hasOwnProperty(q.id);
                      const isCorrect = questionAnswers[q.id];
                      const isCurrent = idx === currentQuestionIndex;
                      
                      return (
                        <button
                          key={q.id}
                          onClick={() => handleNavigateQuestion(idx)}
                          className="w-10 h-10 rounded-lg font-semibold text-sm transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: isCurrent 
                              ? getColor('primary', '#3b82f6')
                              : isAnswered
                              ? isCorrect ? '#10b981' : '#ef4444'
                              : getColor('background', '#ffffff'),
                            color: isCurrent || isAnswered ? '#ffffff' : getColor('textPrimary', '#1f2937'),
                            border: `2px solid ${
                              isCurrent 
                                ? getColor('primary', '#3b82f6')
                                : isAnswered
                                ? isCorrect ? '#10b981' : '#ef4444'
                                : getColor('borderColor', '#e5e7eb')
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
                      <AlertTriangle size={48} style={{ color: getColor('error', '#ef4444'), margin: '0 auto 1rem' }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('tests.noQuestionsFound')}
                      </h3>
                      <p className="text-sm mb-4" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                        {t('tests.adjustFilters')}
                      </p>
                      <button
                        onClick={handleClosePractice}
                        className="px-6 py-2 rounded-lg font-medium transition-all"
                        style={{ 
                          backgroundColor: getColor('primary', '#1a202c'),
                          color: '#ffffff'
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
