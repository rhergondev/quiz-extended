import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import useCourse from '../../../hooks/useCourse';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import ScoreEvolutionChart from '../../../components/statistics/ScoreEvolutionChart';
import { 
  getPerformanceByLesson, 
  getWeakSpots, 
  getDifficultyStats,
  getUserQuestionStats 
} from '../../../api/services/userStatsService';
import { getMyRankingStatus, getCourseRanking } from '../../../api/services/courseRankingService';
import { 
  TrendingUp, 
  Award, 
  Target, 
  AlertCircle, 
  BarChart2,
  Trophy,
  Zap,
  CheckCircle,
  BookOpen,
  ChevronRight,
  X,
  AlertTriangle,
  TrendingDown,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronDown,
  Users,
  Minus
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CourseStatisticsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getColor } = useTheme();
  const { formatScore, convertScore, format, isPercentage } = useScoreFormat();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  const [loading, setLoading] = useState(true);
  const [performanceByLesson, setPerformanceByLesson] = useState([]);
  const [weakSpots, setWeakSpots] = useState([]);
  const [difficultyStats, setDifficultyStats] = useState(null);
  const [rankingStatus, setRankingStatus] = useState(null);
  const [rankingStatistics, setRankingStatistics] = useState(null);
  const [questionStats, setQuestionStats] = useState(null);
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [lessonSortOrder, setLessonSortOrder] = useState('desc'); // 'desc' = high to low, 'asc' = low to high
  const [riskViewMode, setRiskViewMode] = useState('without'); // 'with' or 'without' risk
  const [selectedLessonFilter, setSelectedLessonFilter] = useState(null); // For filtering chart and question analysis
  const [showRiskPanel, setShowRiskPanel] = useState(false); // For risk analysis slide panel

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      
      setLoading(true);
      try {
        const [lessonsData, weakData, difficultyData, rankingData, rankingFullData, questionStatsData] = await Promise.all([
          getPerformanceByLesson(courseId),
          getWeakSpots(courseId),
          getDifficultyStats(courseId),
          getMyRankingStatus(courseId),
          getCourseRanking(courseId, { page: 1, perPage: 20, withRisk: false }),
          getUserQuestionStats(courseId, null) // Initial load without filter
        ]);
        
        console.log('📊 Question Stats API Response:', questionStatsData);

        const lessonsArray = lessonsData.data?.lessons || lessonsData.data || [];
        
        setPerformanceByLesson(lessonsArray);
        setWeakSpots(weakData.data || []);
        setDifficultyStats(difficultyData.data || {});
        setRankingStatus(rankingData.data);
        setRankingStatistics(rankingFullData?.data?.statistics || null);
        setQuestionStats(questionStatsData?.data || questionStatsData || null);
      } catch (error) {
        console.error('❌ Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  // Refetch question stats when lesson filter changes
  useEffect(() => {
    const refetchQuestionStats = async () => {
      if (!courseId) return;
      try {
        const questionStatsData = await getUserQuestionStats(courseId, selectedLessonFilter);
        setQuestionStats(questionStatsData?.data || questionStatsData || null);
      } catch (error) {
        console.error('❌ Error refetching question stats:', error);
      }
    };

    refetchQuestionStats();
  }, [courseId, selectedLessonFilter]);

  // Calcular estadísticas derivadas
  const computedStats = useMemo(() => {
    // Calcular quizzes completados desde performanceByLesson (suma de quizzes_completed de cada lección)
    const completedQuizzes = performanceByLesson?.reduce((sum, lesson) => sum + (lesson.quizzes_completed || 0), 0) || 0;
    
    // Calcular total de quizzes desde performanceByLesson (suma de total_quizzes de cada lección)
    const totalQuizzes = performanceByLesson?.reduce((sum, lesson) => sum + (lesson.total_quizzes || 0), 0) || 0;
    
    // Si no hay datos de lecciones, retornar null
    if (!performanceByLesson || performanceByLesson.length === 0) {
      return null;
    }

    // avgScore: calcular desde performanceByLesson si no hay rankingStatus
    let avgScore = 0;
    if (rankingStatus?.average_score !== undefined) {
      // avgScore viene del backend en formato 0-100 (porcentaje)
      avgScore = rankingStatus.average_score;
    } else if (performanceByLesson.length > 0) {
      // Calcular promedio manual desde las lecciones
      const lessonsWithScores = performanceByLesson.filter(l => l.avg_score > 0);
      if (lessonsWithScores.length > 0) {
        avgScore = lessonsWithScores.reduce((sum, l) => sum + l.avg_score, 0) / lessonsWithScores.length;
      }
    }
    
    const progressPercentage = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;

    // Calcular lecciones completadas (las que tienen avg_score y al menos un quiz completado)
    const completedLessons = performanceByLesson?.filter(l => l.quizzes_completed > 0).length || 0;

    // Calcular mejor y peor lección
    let bestLesson = null;
    let worstLesson = null;
    
    if (performanceByLesson.length > 0) {
      bestLesson = performanceByLesson.reduce((best, current) => 
        (current.avg_score > best.avg_score) ? current : best
      );
      worstLesson = performanceByLesson.reduce((worst, current) => 
        (current.avg_score < worst.avg_score) ? current : worst
      );
    }

    return {
      avgScore,
      completedQuizzes,
      completedLessons,
      totalQuizzes,
      progressPercentage,
      bestLesson,
      worstLesson
    };
  }, [rankingStatus, performanceByLesson]);

  // All lessons sorted by user preference (for expanded lesson analysis modal)
  const sortedAllLessons = useMemo(() => {
    if (!performanceByLesson || performanceByLesson.length === 0) {
      return [];
    }
    // Include all lessons that have quizzes
    const lessonsWithQuizzes = performanceByLesson.filter(lesson => lesson.total_quizzes > 0);
    return [...lessonsWithQuizzes].sort((a, b) => {
      if (lessonSortOrder === 'desc') {
        return b.avg_score - a.avg_score; // High to low
      }
      return a.avg_score - b.avg_score; // Low to high
    });
  }, [performanceByLesson, lessonSortOrder]);

  // Lessons sorted by score LOW to HIGH (for main statistics panel - always shows worst first)
  const lessonsLowToHigh = useMemo(() => {
    if (!performanceByLesson || performanceByLesson.length === 0) {
      return [];
    }
    const lessonsWithQuizzes = performanceByLesson.filter(lesson => lesson.total_quizzes > 0);
    return [...lessonsWithQuizzes].sort((a, b) => a.avg_score - b.avg_score);
  }, [performanceByLesson]);

  // Filtrar lecciones que tienen quizzes y calcular lecciones a repasar (top 5 con peor rendimiento)
  const lessonsToReview = useMemo(() => {
    if (!performanceByLesson || performanceByLesson.length === 0) {
      return [];
    }

    // Solo mostrar lecciones que tienen quizzes (total_quizzes > 0)
    const lessonsWithQuizzes = performanceByLesson.filter(lesson => lesson.total_quizzes > 0);

    // Ordenar por avg_score ascendente y tomar las 5 peores
    return [...lessonsWithQuizzes]
      .sort((a, b) => a.avg_score - b.avg_score)
      .slice(0, 5);
  }, [performanceByLesson]);

  // 🎨 Helper: Obtener estilo según el score (ya viene en base10 0-10)
  const getReviewStyle = (base10Score) => {
    if (base10Score < 6) {
      return {
        priority: 'critical',
        bgColor: '#fef2f2',
        borderColor: '#fca5a5',
        textColor: '#dc2626',
        iconColor: '#ef4444',
        label: t('statistics.critical')
      };
    } else if (base10Score < 8) {
      return {
        priority: 'medium',
        bgColor: '#fefce8',
        borderColor: '#fde047',
        textColor: '#ca8a04',
        iconColor: '#eab308',
        label: t('statistics.needsImprovement')
      };
    } else {
      return {
        priority: 'good',
        bgColor: '#f0fdf4',
        borderColor: '#86efac',
        textColor: '#16a34a',
        iconColor: '#22c55e',
        label: t('statistics.good')
      };
    }
  };

  // 📍 Navegar a la lección específica en la página de tests
  const handleNavigateToLesson = async (lesson) => {
    try {
      // Obtener la lección completa para tener acceso a los steps y quiz_ids
      const { getCourseLessons } = await import('../../../api/services/courseLessonService');
      const lessonsData = await getCourseLessons(parseInt(courseId));
      const fullLesson = lessonsData.data?.find(l => l.id === lesson.lesson_id);
      
      if (fullLesson) {
        // Buscar el primer quiz en los lesson steps
        const quizStep = fullLesson.meta?._lesson_steps?.find(step => step.type === 'quiz');
        const firstQuizId = quizStep?.data?.quiz_id;
        
        if (firstQuizId) {
          // Navegar igual que TestHistoryPage - con selectedQuizId y scrollToQuiz
          navigate(`/courses/${courseId}/tests`, {
            state: {
              selectedQuizId: parseInt(firstQuizId),
              scrollToQuiz: true,
              returnTo: `/courses/${courseId}/statistics`
            }
          });
          return;
        }
      }
      
      // Fallback: solo navegar a tests sin quiz específico
      navigate(`/courses/${courseId}/tests`);
    } catch (error) {
      console.error('Error navigating to lesson:', error);
      navigate(`/courses/${courseId}/tests`);
    }
  };

  // Helper for progress bars
  const ProgressBar = ({ value, color, height = 'h-2', showPercentage = false }) => (
    <div className="w-full">
      <div className={`w-full rounded-full ${height} overflow-hidden`} style={{ backgroundColor: `${color}20` }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-end mt-1">
          <span className="text-xs font-medium" style={{ color }}>{value.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );

  // Helper: Obtener color según el score (espera valor en base10 0-10)
  const getScoreColor = (base10Score) => {
    if (base10Score >= 8) return '#22c55e'; // green
    if (base10Score >= 6) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // 🔥 IMPORTANTE: El backend ahora devuelve scores en base10 (0-10)
  // No necesita conversión, pasamos directamente a formatScore()
  const convertFromBackend = (backendScore) => {
    // Backend devuelve en base10 (0-10), devolvemos tal cual
    return backendScore;
  };

  if (loading) {
    return (
      <CoursePageTemplate courseId={courseId} courseName={courseName} sectionName={t('statistics.title')}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') }}></div>
        </div>
      </CoursePageTemplate>
    );
  }

  return (
    <CoursePageTemplate courseId={courseId} courseName={courseName} sectionName={t('statistics.title')}>
      <div className="relative h-full">
        
        {/* Main View */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showAllLessons ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 pt-8 pb-24">{/* Increased max-w and adjusted padding */}
              
              {/* Overview Section - Tarjetas de Resumen */}
              <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center gap-2">
                  <Activity size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  <h2 className="text-lg font-bold uppercase tracking-wide" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('statistics.title')}
                  </h2>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Nota Media */}
                  {(() => {
                    const top10Cutoff = rankingStatistics?.top_10_cutoff_without_risk;
                    const userScore = computedStats?.avgScore || 0;
                    const hasTop10Data = top10Cutoff !== undefined && top10Cutoff !== null && top10Cutoff > 0;
                    const isInTop10 = hasTop10Data && userScore >= top10Cutoff;
                    
                    return (
                      <div 
                        className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                        style={{ 
                          backgroundColor: getColor('secondaryBackground'),
                          borderColor: isInTop10 ? '#22c55e' : getColor('borderColor')
                        }}
                      >
                        <div 
                          className="px-4 py-2 flex items-center justify-between"
                          style={{ backgroundColor: isInTop10 ? '#22c55e' : getColor('primary', '#1a202c') }}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                            {t('statistics.averageScore')}
                          </span>
                          {isInTop10 ? (
                            <Award size={16} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                          ) : (
                            <TrendingUp size={16} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                          )}
                        </div>
                        <div 
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }} 
                        />
                        <div className="p-4">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-4xl font-bold" style={{ color: isInTop10 ? '#22c55e' : getColor('primary', '#1a202c') }}>
                              {computedStats ? formatScore(computedStats.avgScore) : '-'}
                            </span>
                            <span className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                              / {isPercentage ? '100' : '10'}
                            </span>
                          </div>
                          
                          {/* Top 10% Cutoff info */}
                          {hasTop10Data ? (
                            <div 
                              className="flex items-center gap-2 mt-2 p-2 rounded-lg"
                              style={{ 
                                backgroundColor: isInTop10 ? '#dcfce7' : '#fef3c7',
                                border: `1px solid ${isInTop10 ? '#86efac' : '#fcd34d'}`
                              }}
                            >
                              {isInTop10 ? (
                                <>
                                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                                  <span className="text-xs font-medium text-green-800">
                                    {t('statistics.passedCutoff')}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Target size={14} className="text-amber-600 flex-shrink-0" />
                                  <span className="text-xs text-amber-800">
                                    <span className="font-medium">{t('statistics.cutoffScore')}:</span>{' '}
                                    <strong>{formatScore(top10Cutoff)}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-2 mt-2 p-2 rounded-lg"
                              style={{ 
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #e5e7eb'
                              }}
                            >
                              <AlertCircle size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500">
                                {t('statistics.noCutoffDataYet')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ranking */}
                  <div 
                    className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground'),
                      borderColor: getColor('borderColor')
                    }}
                  >
                    <div 
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ backgroundColor: getColor('accent', '#f59e0b') }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.ranking')}
                      </span>
                      <Trophy size={16} className="text-white" />
                    </div>
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />
                    <div className="p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                          #{rankingStatus?.position || '-'}
                        </span>
                        {computedStats?.completedQuizzes === computedStats?.totalQuizzes && computedStats?.totalQuizzes > 0 && (
                          <CheckCircle size={16} className="text-green-500 mb-1" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tests Completados */}
                  <div 
                    className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground'),
                      borderColor: getColor('borderColor')
                    }}
                  >
                    <div 
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ backgroundColor: '#64748b' }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.completedQuizzes')}
                      </span>
                      <Target size={16} className="text-white" />
                    </div>
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />
                    <div className="p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-bold" style={{ color: '#475569' }}>
                          {computedStats?.completedQuizzes || 0}
                        </span>
                        <span className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          / {computedStats?.totalQuizzes || 0}
                        </span>
                      </div>
                      {computedStats && computedStats.totalQuizzes > 0 && (
                        <div className="mt-2">
                          <ProgressBar 
                            value={computedStats.progressPercentage} 
                            color="#64748b"
                            height="h-1.5"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mejor Lección */}
                  <div 
                    className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground'),
                      borderColor: getColor('borderColor')
                    }}
                  >
                    <div 
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ backgroundColor: '#10b981' }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.bestPerformance')}
                      </span>
                      <Award size={16} className="text-white" />
                    </div>
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />
                    <div className="p-4">
                      {computedStats?.bestLesson ? (
                        <>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-4xl font-bold" style={{ color: '#059669' }}>
                              {formatScore(computedStats.bestLesson.avg_score)}
                            </span>
                            <span className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                              / {isPercentage ? '100' : '10'}
                            </span>
                          </div>
                          <p className="text-xs mt-1 truncate" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                            {computedStats.bestLesson.lesson_title}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          {t('statistics.noDataYet')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lesson Filter for Chart and Question Analysis */}
              {performanceByLesson && performanceByLesson.length > 0 && (
                <div className="mt-6 flex items-center gap-3">
                  <Filter size={16} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                  <span className="text-sm font-medium" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                    Filtrar por tema:
                  </span>
                  <select
                    value={selectedLessonFilter || ''}
                    onChange={(e) => setSelectedLessonFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className="text-sm px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: getColor('background', '#ffffff'),
                      borderColor: getColor('borderColor', '#e5e7eb'),
                      color: getColor('primary', '#1a202c')
                    }}
                  >
                    <option value="">Todos los temas</option>
                    {performanceByLesson.filter(l => l.total_quizzes > 0).map(lesson => (
                      <option key={lesson.lesson_id} value={lesson.lesson_id}>
                        {lesson.lesson_title}
                      </option>
                    ))}
                  </select>
                  {selectedLessonFilter && (
                    <button
                      onClick={() => setSelectedLessonFilter(null)}
                      className="text-xs px-2 py-1 rounded-lg transition-all"
                      style={{ 
                        backgroundColor: '#fee2e2',
                        color: '#dc2626'
                      }}
                    >
                      ✕ Limpiar
                    </button>
                  )}
                </div>
              )}

              {/* Score Evolution Chart */}
              <div className="mt-4">
                <ScoreEvolutionChart courseId={courseId} lessonId={selectedLessonFilter} />
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                
                {/* Análisis de Temas - Lista de TODAS las lecciones con orden */}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={20} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                          {t('statistics.lessonAnalysis')}
                        </h3>
                      </div>
                      {/* Ver Todas las Lecciones */}
                      <button
                        onClick={() => setShowAllLessons(true)}
                        className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-all"
                        style={{ 
                          color: getColor('textColorContrast', '#ffffff'),
                          backgroundColor: 'rgba(255, 255, 255, 0.15)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                      >
                        {t('statistics.allLessons')}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Separador */}
                  <div 
                    style={{ 
                      height: '1px', 
                      backgroundColor: 'rgba(156, 163, 175, 0.2)'
                    }} 
                  />
                  
                  {/* Content - Scrollable list of ALL lessons (sorted low to high) */}
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {lessonsLowToHigh.length > 0 ? (
                      <div className="space-y-2">
                        {lessonsLowToHigh.map((lesson, index) => {
                          const lessonScore = lesson.avg_score;
                          const scoreColor = getScoreColor(lesson.avg_score);
                          
                          return (
                            <div 
                              key={lesson.lesson_id} 
                              className="p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer"
                              style={{ 
                                backgroundColor: getColor('background', '#ffffff'),
                                borderColor: getColor('borderColor', '#e5e7eb')
                              }}
                              onClick={() => handleNavigateToLesson(lesson.lesson_id)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span 
                                    className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ 
                                      backgroundColor: `${scoreColor}15`,
                                      color: scoreColor
                                    }}
                                  >
                                    {index + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate" style={{ color: getColor('primary', '#1a202c') }}>
                                      {lesson.lesson_title}
                                    </h4>
                                    <span className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}50` }}>
                                      {lesson.quizzes_completed} / {lesson.total_quizzes} {t('statistics.quizzesCompleted')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div 
                                    className="text-right px-2 py-1 rounded"
                                    style={{ backgroundColor: `${scoreColor}10` }}
                                  >
                                    <span className="font-bold text-sm" style={{ color: scoreColor }}>
                                      {formatScore(lessonScore)}
                                    </span>
                                    <span className="text-xs ml-1" style={{ color: `${scoreColor}80` }}>
                                      / {isPercentage ? '100' : '10'}
                                    </span>
                                  </div>
                                  <ChevronRight size={16} style={{ color: `${getColor('primary', '#1a202c')}30` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 rounded-lg" style={{ backgroundColor: `${getColor('primary', '#1a202c')}05` }}>
                        <BookOpen size={32} className="mx-auto mb-2" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                        <p className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                          {t('statistics.noLessonsData')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Análisis de Preguntas - Comparativa Usuario vs Global */}
                <div 
                  className="rounded-xl overflow-hidden border-2 flex flex-col relative"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target size={20} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                          {t('statistics.questionAnalysis')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Users count badge */}
                        {questionStats?.global_stats?.total_users > 0 && (
                          <div 
                            className="flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                          >
                            <Users size={12} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                            <span className="text-xs font-medium" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                              {questionStats.global_stats.total_users}
                            </span>
                          </div>
                        )}
                        {/* Risk Analysis Button */}
                        {questionStats && (questionStats.correct_with_risk > 0 || questionStats.incorrect_with_risk > 0 || 
                          questionStats.global_stats?.correct_with_risk_pct > 0) && (
                          <button
                            onClick={() => setShowRiskPanel(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.3)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.5)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.3)'}
                          >
                            <Zap size={12} style={{ color: '#fcd34d' }} />
                            <span className="text-xs font-medium" style={{ color: '#fcd34d' }}>
                              Riesgo
                            </span>
                            <ChevronRight size={12} style={{ color: '#fcd34d' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador */}
                  <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />
                  
                  {/* Content */}
                  <div className="flex-1 p-4">
                    {questionStats ? (
                      <div className="space-y-4">
                        {/* User Stats Summary */}
                        {questionStats.total_questions > 0 ? (
                          <div className="text-center pb-3 border-b" style={{ borderColor: getColor('borderColor', '#e5e7eb') }}>
                            <span className="text-3xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                              {questionStats.total_questions}
                            </span>
                            <span className="text-xs ml-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                              preguntas respondidas
                            </span>
                          </div>
                        ) : (
                          <div 
                            className="text-center py-3 px-4 rounded-lg border"
                            style={{ 
                              backgroundColor: '#fef3c7',
                              borderColor: '#fcd34d'
                            }}
                          >
                            <AlertCircle size={20} className="mx-auto mb-1 text-amber-600" />
                            <p className="text-xs font-medium text-amber-800">
                              Aún no has respondido preguntas en este curso
                            </p>
                          </div>
                        )}

                        {/* Comparison Stats */}
                        <div className="space-y-3">
                          {/* Correctas */}
                          {(() => {
                            const userPct = questionStats.user_correct_pct || 0;
                            const globalPct = questionStats.global_stats?.correct_pct || 0;
                            const diff = questionStats.comparison?.correct_diff || 0;
                            const isAbove = diff > 0.5;
                            const isBelow = diff < -0.5;
                            
                            return (
                              <div 
                                className="p-3 rounded-lg border"
                                style={{ 
                                  backgroundColor: getColor('background', '#ffffff'),
                                  borderColor: getColor('borderColor', '#e5e7eb')
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle size={16} style={{ color: '#10b981' }} />
                                    <span className="text-sm font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                                      Correctas
                                    </span>
                                  </div>
                                  {questionStats.total_questions > 0 && (
                                    <div 
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                      style={{ 
                                        backgroundColor: isAbove ? '#dcfce7' : isBelow ? '#fee2e2' : '#f3f4f6',
                                      }}
                                    >
                                      {isAbove ? (
                                        <TrendingUp size={12} style={{ color: '#16a34a' }} />
                                      ) : isBelow ? (
                                        <TrendingDown size={12} style={{ color: '#dc2626' }} />
                                      ) : (
                                        <Minus size={12} style={{ color: '#6b7280' }} />
                                      )}
                                      <span 
                                        className="text-xs font-bold"
                                        style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : '#6b7280' }}
                                      >
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {/* Two rows: Tú and Media */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 font-medium" style={{ color: getColor('primary', '#1a202c') }}>Tú</span>
                                    <span className="text-xs w-10 font-bold" style={{ color: '#10b981' }}>{userPct}%</span>
                                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${userPct}%`, backgroundColor: '#10b981' }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12" style={{ color: `${getColor('primary', '#1a202c')}60` }}>Media</span>
                                    <span className="text-xs w-10" style={{ color: `${getColor('primary', '#1a202c')}60` }}>{globalPct}%</span>
                                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Incorrectas */}
                          {(() => {
                            const userPct = questionStats.user_incorrect_pct || 0;
                            const globalPct = questionStats.global_stats?.incorrect_pct || 0;
                            const diff = questionStats.comparison?.incorrect_diff || 0;
                            const isAbove = diff < -0.5;
                            const isBelow = diff > 0.5;
                            
                            return (
                              <div 
                                className="p-3 rounded-lg border"
                                style={{ 
                                  backgroundColor: getColor('background', '#ffffff'),
                                  borderColor: getColor('borderColor', '#e5e7eb')
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <X size={16} style={{ color: '#ef4444' }} />
                                    <span className="text-sm font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                                      Incorrectas
                                    </span>
                                  </div>
                                  {questionStats.total_questions > 0 && (
                                    <div 
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                      style={{ 
                                        backgroundColor: isAbove ? '#dcfce7' : isBelow ? '#fee2e2' : '#f3f4f6',
                                      }}
                                    >
                                      {isAbove ? (
                                        <TrendingUp size={12} style={{ color: '#16a34a' }} />
                                      ) : isBelow ? (
                                        <TrendingDown size={12} style={{ color: '#dc2626' }} />
                                      ) : (
                                        <Minus size={12} style={{ color: '#6b7280' }} />
                                      )}
                                      <span 
                                        className="text-xs font-bold"
                                        style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : '#6b7280' }}
                                      >
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {/* Two rows: Tú and Media */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 font-medium" style={{ color: getColor('primary', '#1a202c') }}>Tú</span>
                                    <span className="text-xs w-10 font-bold" style={{ color: '#ef4444' }}>{userPct}%</span>
                                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${userPct}%`, backgroundColor: '#ef4444' }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12" style={{ color: `${getColor('primary', '#1a202c')}60` }}>Media</span>
                                    <span className="text-xs w-10" style={{ color: `${getColor('primary', '#1a202c')}60` }}>{globalPct}%</span>
                                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Sin contestar - Solo mostrar si hay datos */}
                          {(questionStats.user_unanswered_pct > 0 || questionStats.global_stats?.unanswered_pct > 0) && (() => {
                            const userPct = questionStats.user_unanswered_pct || 0;
                            const globalPct = questionStats.global_stats?.unanswered_pct || 0;
                            const diff = questionStats.comparison?.unanswered_diff || 0;
                            const isAbove = diff < -0.5;
                            const isBelow = diff > 0.5;
                            
                            return (
                              <div 
                                className="p-3 rounded-lg border"
                                style={{ 
                                  backgroundColor: getColor('background', '#ffffff'),
                                  borderColor: getColor('borderColor', '#e5e7eb')
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle size={16} style={{ color: '#6b7280' }} />
                                    <span className="text-sm font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                                      Sin contestar
                                    </span>
                                  </div>
                                  {questionStats.total_questions > 0 && (
                                    <div 
                                      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                      style={{ 
                                        backgroundColor: isAbove ? '#dcfce7' : isBelow ? '#fee2e2' : '#f3f4f6',
                                      }}
                                    >
                                      {isAbove ? (
                                        <TrendingUp size={12} style={{ color: '#16a34a' }} />
                                      ) : isBelow ? (
                                        <TrendingDown size={12} style={{ color: '#dc2626' }} />
                                      ) : (
                                        <Minus size={12} style={{ color: '#6b7280' }} />
                                      )}
                                      <span 
                                        className="text-xs font-bold"
                                        style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : '#6b7280' }}
                                      >
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {/* Two rows: Tú and Media */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 font-medium" style={{ color: getColor('primary', '#1a202c') }}>Tú</span>
                                    <span className="text-xs w-10 font-bold" style={{ color: '#6b7280' }}>{userPct}%</span>
                                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${userPct}%`, backgroundColor: '#94a3b8' }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12" style={{ color: `${getColor('primary', '#1a202c')}60` }}>Media</span>
                                    <span className="text-xs w-10" style={{ color: `${getColor('primary', '#1a202c')}60` }}>{globalPct}%</span>
                                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target size={32} className="mx-auto mb-2" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                        <p className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          Cargando datos de análisis...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Risk Analysis Slide Panel */}
                  <div 
                    className={`absolute inset-0 transition-transform duration-300 ease-in-out rounded-xl ${
                      showRiskPanel ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
                  >
                    {showRiskPanel && questionStats && (
                      <div className="h-full flex flex-col">
                        {/* Risk Panel Header */}
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ backgroundColor: getColor('accent', '#f59e0b') }}
                        >
                          <div className="flex items-center gap-2">
                            <Zap size={18} className="text-white" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                              Análisis Con Riesgo
                            </h3>
                          </div>
                          <button
                            onClick={() => setShowRiskPanel(false)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                          >
                            <X size={18} className="text-white" />
                          </button>
                        </div>
                        
                        <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />
                        
                        {/* Risk Panel Content */}
                        <div className="flex-1 p-4 overflow-y-auto">
                          <div className="space-y-4">
                            {/* Correctas con riesgo */}
                            <div 
                              className="p-4 rounded-lg border"
                              style={{ 
                                backgroundColor: '#dcfce7',
                                borderColor: '#86efac'
                              }}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle size={18} style={{ color: '#16a34a' }} />
                                <span className="text-sm font-bold" style={{ color: '#166534' }}>
                                  Correctas con riesgo
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: '#166534' }}>Tú</span>
                                  <span className="text-lg font-bold" style={{ color: '#16a34a' }}>
                                    {questionStats.correct_with_risk || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: '#166534' }}>Media global</span>
                                  <span className="text-sm font-medium" style={{ color: '#166534' }}>
                                    {questionStats.global_stats?.correct_with_risk_pct || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Incorrectas con riesgo */}
                            <div 
                              className="p-4 rounded-lg border"
                              style={{ 
                                backgroundColor: '#fee2e2',
                                borderColor: '#fca5a5'
                              }}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <X size={18} style={{ color: '#dc2626' }} />
                                <span className="text-sm font-bold" style={{ color: '#991b1b' }}>
                                  Incorrectas con riesgo
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium" style={{ color: '#991b1b' }}>Tú</span>
                                  <span className="text-lg font-bold" style={{ color: '#dc2626' }}>
                                    {questionStats.incorrect_with_risk || 0}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs" style={{ color: '#991b1b' }}>Media global</span>
                                  <span className="text-sm font-medium" style={{ color: '#991b1b' }}>
                                    {questionStats.global_stats?.incorrect_with_risk_pct || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* All Lessons View - Slides from Right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            showAllLessons ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {showAllLessons && (
            <div className="h-full flex flex-col">
              {/* Header Compacto con ordenación */}
              <div 
                className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('primary', '#1a202c'),
                  borderColor: `${getColor('primary', '#1a202c')}` 
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <BarChart2 size={18} style={{ color: getColor('textColorContrast', '#ffffff') }} className="flex-shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold leading-tight truncate uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                    {t('statistics.performanceByLesson')}
                  </h2>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-1"
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: getColor('textColorContrast', '#ffffff')
                    }}
                  >
                    {sortedAllLessons.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Toggle */}
                  <button
                    onClick={() => setLessonSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="text-xs font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
                    style={{ 
                      color: getColor('textColorContrast', '#ffffff'),
                      backgroundColor: 'rgba(255, 255, 255, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                  >
                    {lessonSortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                    <span className="hidden sm:inline">
                      {lessonSortOrder === 'desc' ? t('statistics.sortHighToLow') : t('statistics.sortLowToHigh')}
                    </span>
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => setShowAllLessons(false)}
                    className="p-1.5 rounded-lg transition-all flex-shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                    }}
                    title={t('common.back')}
                  >
                    <X size={20} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 max-w-5xl mx-auto">
                  {sortedAllLessons.length > 0 ? (
                    <div className="space-y-4">
                      {sortedAllLessons.map((lesson, index) => {
                        const lessonScore = lesson.avg_score;
                        const scoreColor = getScoreColor(lesson.avg_score);
                        
                        return (
                          <div 
                            key={lesson.lesson_id} 
                            className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                            style={{ 
                              backgroundColor: getColor('background', '#ffffff'),
                              borderColor: getColor('borderColor')
                            }}
                          >
                            <div 
                            className="px-4 py-2"
                            style={{ backgroundColor: scoreColor }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                                <span 
                                  className="text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                                >
                                  {index + 1}
                                </span>
                                <span className="font-bold text-sm text-white truncate">
                                  {lesson.lesson_title}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1 flex-shrink-0">
                                <span className="font-bold text-lg text-white">
                                  {formatScore(lessonScore)}
                                </span>
                                <span className="text-xs text-white opacity-80">
                                  / {isPercentage ? '100' : '10'}
                                </span>
                              </div>
                            </div>
                            </div>
                            
                            <div 
                              style={{ 
                                height: '1px', 
                                backgroundColor: 'rgba(156, 163, 175, 0.2)'
                              }} 
                            />
                            
                            <div className="p-4">
                              <ProgressBar 
                                value={lesson.avg_score} 
                                color={scoreColor}
                                height="h-2"
                              />
                              <div className="flex justify-between mt-2 text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                <span className="font-medium">{lesson.quizzes_completed} {t('statistics.quizzesCompleted')}</span>
                                <span className="font-medium">{lesson.total_attempts} {t('statistics.attempts')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart2 size={48} className="mx-auto mb-3" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                      <p className="text-sm font-medium" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                        {t('statistics.noDataAvailable')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </CoursePageTemplate>
  );
};

export default CourseStatisticsPage;
