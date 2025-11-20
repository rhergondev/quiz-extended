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
        <span className="block truncate text-sm">
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
    categories: [],
    difficulty: 'all',
    numQuestions: 10,
    timeLimit: 0,
    statusFilters: [] // favorites, failed, risked, unanswered
  });

  // Data Hooks
  const { options: taxonomyOptions, isLoading: taxonomiesLoading } = useTaxonomyOptions(['qe_category', 'qe_difficulty']);
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
    // Fetch questions
    await fetchQuestions(true, {
      lessons: config.lessons.length > 0 ? config.lessons : null,
      category: config.categories.length > 0 ? config.categories : null,
      difficulty: config.difficulty !== 'all' ? config.difficulty : null,
      perPage: config.numQuestions,
      status_filters: config.statusFilters
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
  const categoryOptions = (taxonomyOptions.qe_category || []).map(c => ({ value: c.value, label: c.label }));
  const difficultyOptions = [
    { value: 'all', label: t('courses.difficulty.all') },
    ...(taxonomyOptions.qe_difficulty || []).map(d => ({ value: d.value, label: d.label }))
  ];

  const isLoading = courseLoading || lessonsLoading;

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.testGenerator')}
    >
      <div className="relative h-full overflow-hidden">
        {/* Main Configuration Panel */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showQuiz ? '-translate-x-full' : 'translate-x-0'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          <div className="h-full flex flex-col max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-lg p-3 animate-pulse" style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}>
                    <div className="h-5 rounded" style={{ backgroundColor: `${getColor('primary', '#1a202c')}20`, width: '60%' }}></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Filters Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}>
                      <Sliders size={18} style={{ color: getColor('primary', '#1a202c') }} />
                    </div>
                    <h2 className="text-base font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                      {t('tests.configuration')}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {/* Lessons Select */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('lessons.title')}
                      </label>
                      <div className="relative">
                        <select
                          value={config.lessons[0] || 'all'}
                          onChange={(e) => handleConfigChange('lessons', e.target.value === 'all' ? [] : [parseInt(e.target.value)])}
                          className="w-full px-3 py-2 text-sm border-2 rounded-lg appearance-none transition-colors"
                          style={{ 
                            borderColor: getColor('borderColor', '#e5e7eb'),
                            backgroundColor: getColor('background', '#ffffff'),
                            color: getColor('primary', '#1a202c')
                          }}
                        >
                          <option value="all">{t('common.all')}</option>
                          {lessonOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          className="absolute right-3 top-2.5 pointer-events-none" 
                          size={14} 
                          style={{ color: `${getColor('primary', '#1a202c')}60` }}
                        />
                      </div>
                    </div>

                    {/* Categories Select */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('courses.category.label')}
                      </label>
                      <div className="relative">
                        <select
                          value={config.categories[0] || 'all'}
                          onChange={(e) => handleConfigChange('categories', e.target.value === 'all' ? [] : [parseInt(e.target.value)])}
                          className="w-full px-3 py-2 text-sm border-2 rounded-lg appearance-none transition-colors"
                          style={{ 
                            borderColor: getColor('borderColor', '#e5e7eb'),
                            backgroundColor: getColor('background', '#ffffff'),
                            color: getColor('primary', '#1a202c')
                          }}
                        >
                          <option value="all">{t('common.all')}</option>
                          {categoryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          className="absolute right-3 top-2.5 pointer-events-none" 
                          size={14} 
                          style={{ color: `${getColor('primary', '#1a202c')}60` }}
                        />
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('courses.difficulty.label')}
                      </label>
                      <div className="relative">
                        <select
                          value={config.difficulty}
                          onChange={(e) => handleConfigChange('difficulty', e.target.value)}
                          className="w-full px-3 py-2 text-sm border-2 rounded-lg appearance-none transition-colors"
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
                          className="absolute right-3 top-2.5 pointer-events-none" 
                          size={14} 
                          style={{ color: `${getColor('primary', '#1a202c')}60` }}
                        />
                      </div>
                    </div>

                    {/* Number of Questions */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('common.questions')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={config.numQuestions}
                        onChange={(e) => handleConfigChange('numQuestions', parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors"
                        style={{ 
                          borderColor: getColor('borderColor', '#e5e7eb'),
                          backgroundColor: getColor('background', '#ffffff'),
                          color: getColor('primary', '#1a202c')
                        }}
                      />
                    </div>

                    {/* Time Limit */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('tests.timeLimit')} ({t('tests.minutes')})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.timeLimit}
                        onChange={(e) => handleConfigChange('timeLimit', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors"
                        style={{ 
                          borderColor: getColor('borderColor', '#e5e7eb'),
                          backgroundColor: getColor('background', '#ffffff'),
                          color: getColor('primary', '#1a202c')
                        }}
                      />
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
                      <button
                        onClick={handleGenerate}
                        disabled={questionsLoading}
                        className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg"
                        style={{ 
                          backgroundColor: getColor('accent', '#f59e0b'),
                          color: '#ffffff'
                        }}
                      >
                        {questionsLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <>
                            <FileText size={16} />
                            <span>{t('tests.generateTest')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Filters */}
                <div className="mt-4">
                  <h3 className="text-xs font-semibold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('courses.questionTypes')}
                  </h3>
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
                          className="relative p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5"
                          style={{ 
                            borderColor: isSelected ? getColor('primary', '#1a202c') : getColor('borderColor', '#e5e7eb'),
                            backgroundColor: isSelected ? `${getColor('primary', '#1a202c')}05` : getColor('background', '#ffffff')
                          }}
                        >
                          <status.icon size={14} style={{ color: status.colorHex }} />
                          <span 
                            className="text-xs font-medium text-center leading-tight"
                            style={{ color: isSelected ? getColor('primary', '#1a202c') : `${getColor('primary', '#1a202c')}80` }}
                          >
                            {status.label}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1">
                              <Check size={10} style={{ color: getColor('primary', '#1a202c') }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quiz Viewer - Slides from Right */}
        <div 
        className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
          showQuiz ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        {showQuiz && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div 
              className="px-4 sm:px-6 py-4 flex items-center justify-between"
              style={{ 
                borderBottom: `1px solid ${getColor('borderColor', '#e5e7eb')}`,
                backgroundColor: getColor('background', '#ffffff')
              }}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseQuiz}
                  className="p-2 rounded-lg transition-colors"
                  style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                  }}
                >
                  <ChevronLeft size={24} style={{ color: getColor('primary', '#1a202c') }} />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('tests.generateTest')}
                  </h2>
                  <p className="text-xs hidden sm:block" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                    {questions.length} {t('common.questions').toLowerCase()} • {config.timeLimit > 0 ? `${config.timeLimit} ${t('tests.minutes')}` : t('common.unlimited')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${getColor('primary', '#1a202c')}10`,
                    color: getColor('primary', '#1a202c')
                  }}
                >
                  {t('tests.statistics')}
                </span>
              </div>
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
                  style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                  >
                    <AlertTriangle size={32} style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('tests.noTestsFound')}
                  </h3>
                  <p className="max-w-md mx-auto mb-6" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                    {t('tests.tryDifferentSearch')}
                  </p>
                  <button
                    onClick={handleCloseQuiz}
                    className="px-6 py-2 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: getColor('primary', '#1a202c'),
                      color: '#ffffff'
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