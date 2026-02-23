import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import useCourse from '../../../hooks/useCourse';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import ScoreEvolutionChart from '../../../components/statistics/ScoreEvolutionChart';
import { CourseRankingProvider, CourseRankingSlidePanel } from '../../../components/frontend/CourseRankingPanel';
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
  const { getColor, isDarkMode } = useTheme();
  const { formatScore, convertScore, format, isPercentage } = useScoreFormat();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Dark mode colors - improved borders with primary/accent
  const pageColors = {
    text: isDarkMode ? '#f9fafb' : '#1a202c',
    textMuted: isDarkMode ? '#9ca3af' : '#6b7280',
    background: isDarkMode ? '#1f2937' : '#ffffff',
    secondaryBg: isDarkMode ? '#111827' : '#f3f4f6',
    border: isDarkMode ? getColor('accent', '#f59e0b') + '60' : getColor('primary', '#3b82f6') + '40',
    borderSubtle: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1f2937' : '#ffffff',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    headerBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    labelColor: isDarkMode ? '#ffffff' : getColor('primary', '#3b82f6'),
  };

  // State for ranking panel
  const [isRankingOpen, setIsRankingOpen] = useState(false);

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
  const [rankingRiskView, setRankingRiskView] = useState(false); // false = sin riesgo, true = con riesgo

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
          getUserQuestionStats(courseId, selectedLessonFilter, selectedDifficulty) // Use current filters for initial load
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

  // Refetch question stats when lesson filter or difficulty changes
  useEffect(() => {
    const refetchQuestionStats = async () => {
      if (!courseId) return;
      try {
        console.log('🔍 Refetching Question Stats with filters:', {
          courseId,
          lessonId: selectedLessonFilter,
          difficulty: selectedDifficulty
        });
        const questionStatsData = await getUserQuestionStats(courseId, selectedLessonFilter, selectedDifficulty);
        console.log('📊 Question Stats Response (filtered):', questionStatsData);
        setQuestionStats(questionStatsData?.data || questionStatsData || null);
      } catch (error) {
        console.error('❌ Error refetching question stats:', error);
      }
    };

    refetchQuestionStats();
  }, [courseId, selectedLessonFilter, selectedDifficulty]);

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
            <div className="max-w-7xl mx-auto px-3 py-4">
              
              {/* Overview Section - Tarjetas de Resumen */}
              <div className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center gap-2">
                  <Activity size={16} style={{ color: pageColors.text }} />
                  <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
                    {t('statistics.title')}
                  </h2>
                </div>

                {/* Stats Grid - More compact */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Combined: Nota Media + Media del Curso */}
                  {(() => {
                    const withoutRiskCutoff = rankingStatistics?.top_20_cutoff_without_risk;
                    const withRiskCutoff = rankingStatistics?.top_20_cutoff_with_risk;
                    const activeCutoff = rankingRiskView ? withRiskCutoff : withoutRiskCutoff;
                    const userScore = computedStats?.avgScore || 0;
                    const hasTop10Data = withoutRiskCutoff !== undefined && withoutRiskCutoff !== null && withoutRiskCutoff > 0;
                    const isInTop10 = hasTop10Data && userScore >= withoutRiskCutoff;
                    const globalAvg = rankingRiskView
                      ? (rankingStatistics?.avg_score_with_risk || 0)
                      : (rankingStatistics?.avg_score_without_risk || 0);

                    return (
                      <div
                        className="col-span-2 rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-md"
                        style={{
                          backgroundColor: pageColors.cardBg,
                          borderColor: pageColors.border
                        }}
                      >
                        {/* Header */}
                        <div
                          className="px-3 py-1.5 flex items-center justify-between"
                          style={{ backgroundColor: pageColors.headerBg }}
                        >
                          <div className="flex items-center gap-1.5">
                            {isInTop10 ? (
                              <Award size={14} style={{ color: '#ffffff' }} />
                            ) : (
                              <TrendingUp size={14} style={{ color: '#ffffff' }} />
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ffffff' }}>
                              {t('statistics.averageScore')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setRankingRiskView(!rankingRiskView)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-full transition-all duration-200 shadow-sm"
                              style={{
                                backgroundColor: isDarkMode ? '#ffffff' : (rankingRiskView ? pageColors.accent : '#ffffff'),
                                color: isDarkMode ? pageColors.secondaryBg : (rankingRiskView ? '#ffffff' : pageColors.primary),
                              }}
                            >
                              {rankingRiskView ? 'Con riesgo' : 'Sin riesgo'}
                            </button>
                            <button
                              onClick={() => setIsRankingOpen(true)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm"
                              style={{
                                backgroundColor: isDarkMode ? '#ffffff' : '#ffffff',
                                color: isDarkMode ? pageColors.secondaryBg : pageColors.accent,
                              }}
                              title={t('statistics.ranking')}
                            >
                              <Trophy size={12} style={{ color: isDarkMode ? pageColors.secondaryBg : pageColors.accent }} />
                              <span>#{rankingStatus?.position || '-'}</span>
                              {rankingStatus?.total_users && (
                                <span style={{ color: isDarkMode ? pageColors.secondaryBg : pageColors.primary }}>/{rankingStatus.total_users}</span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Body - two sections */}
                        <div className="grid grid-cols-2">
                          {/* Left: My score */}
                          <div className="p-3" style={{ borderRight: `1px solid ${pageColors.border}` }}>
                            <p className="text-xs mb-1 font-medium" style={{ color: pageColors.labelColor }}>Mi nota</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold" style={{ color: isInTop10 ? '#22c55e' : pageColors.text }}>
                                {computedStats ? formatScore(computedStats.avgScore) : '-'}
                              </span>
                              <span className="text-xs" style={{ color: pageColors.labelColor }}>
                                / {isPercentage ? '100' : '10'}
                              </span>
                            </div>
                            {isInTop10 ? (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle size={11} style={{ color: '#22c55e' }} />
                                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>Top 20%</span>
                              </div>
                            ) : (
                              <div className="mt-1 h-4" />
                            )}
                          </div>

                          {/* Right: Course global average */}
                          <div className="p-3">
                            <p className="text-xs font-medium mb-1" style={{ color: pageColors.labelColor }}>Media del curso</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold" style={{ color: pageColors.text }}>
                                {rankingStatistics ? formatScore(globalAvg) : '-'}
                              </span>
                              <span className="text-xs" style={{ color: pageColors.labelColor }}>
                                / {isPercentage ? '100' : '10'}
                              </span>
                            </div>
                            {activeCutoff > 0 && (
                              <div
                                className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs"
                                style={{ backgroundColor: isDarkMode ? '#92400e' : '#fef3c7' }}
                              >
                                <Target size={10} style={{ color: isDarkMode ? '#fcd34d' : '#d97706' }} />
                                <span style={{ color: isDarkMode ? '#fcd34d' : '#92400e' }}>
                                  Nota de corte: <strong>{formatScore(activeCutoff)}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tests Completados */}
                  <div 
                    className="rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: pageColors.cardBg,
                      borderColor: pageColors.border
                    }}
                  >
                    <div
                      className="px-3 py-1.5 flex items-center justify-between"
                      style={{ backgroundColor: pageColors.headerBg }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.completedQuizzes')}
                      </span>
                      <Target size={14} className="text-white" />
                    </div>
                    <div className="p-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#475569' }}>
                          {computedStats?.completedQuizzes || 0}
                        </span>
                        <span className="text-xs font-medium" style={{ color: pageColors.labelColor }}>
                          / {computedStats?.totalQuizzes || 0}
                        </span>
                      </div>
                      {computedStats && computedStats.totalQuizzes > 0 && (
                        <div className="mt-2">
                          <ProgressBar 
                            value={computedStats.progressPercentage} 
                            color="#64748b"
                            height="h-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mejor Lección */}
                  <div 
                    className="rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: pageColors.cardBg,
                      borderColor: pageColors.border
                    }}
                  >
                    <div
                      className="px-3 py-1.5 flex items-center justify-between"
                      style={{ backgroundColor: pageColors.headerBg }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.bestPerformance')}
                      </span>
                      <Award size={14} className="text-white" />
                    </div>
                    <div className="p-3">
                      {computedStats?.bestLesson ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold" style={{ color: isDarkMode ? '#34d399' : '#059669' }}>
                              {formatScore(computedStats.bestLesson.avg_score)}
                            </span>
                            <span className="text-xs font-medium" style={{ color: pageColors.labelColor }}>
                              / {isPercentage ? '100' : '10'}
                            </span>
                          </div>
                          <p className="text-xs mt-1 truncate font-medium" style={{ color: pageColors.labelColor }}>
                            {computedStats.bestLesson.lesson_title}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs" style={{ color: pageColors.labelColor }}>
                          {t('statistics.noDataYet')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lesson Filter for Chart and Question Analysis */}
              {performanceByLesson && performanceByLesson.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Filter size={14} style={{ color: pageColors.textMuted }} />
                  <span className="text-xs font-medium" style={{ color: pageColors.textMuted }}>
                    Filtrar:
                  </span>
                  <select
                    value={selectedLessonFilter || ''}
                    onChange={(e) => setSelectedLessonFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className="text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1"
                    style={{ 
                      backgroundColor: pageColors.cardBg,
                      borderColor: pageColors.border,
                      color: pageColors.text
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
                      className="text-xs px-1.5 py-0.5 rounded transition-all"
                      style={{ 
                        backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                        color: isDarkMode ? '#fca5a5' : '#dc2626'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* NEW LAYOUT: Two Analysis Widgets Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                
                {/* Temas Widget */}
                <div 
                  className="rounded-lg overflow-hidden border flex flex-col"
                  style={{ 
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.border,
                    minHeight: '280px'
                  }}
                >
                  {/* Header */}
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ backgroundColor: pageColors.headerBg }}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-white" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {t('statistics.performanceByLesson', 'Rendimiento temas')}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowAllLessons(true)}
                      className="text-xs font-bold flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: isDarkMode ? '#ffffff' : '#ffffff',
                        color: isDarkMode ? pageColors.secondaryBg : pageColors.primary,
                      }}
                    >
                      {t('statistics.viewAll', 'Ver todos')}
                      <ChevronRight size={12} style={{ color: isDarkMode ? pageColors.secondaryBg : pageColors.primary }} />
                    </button>
                  </div>
                  
                  {/* Subheader */}
                  <div className="px-3 py-1.5 border-b" style={{ borderColor: pageColors.border }}>
                    <span className="text-xs font-medium" style={{ color: pageColors.labelColor }}>
                      Ordenados por nota (peor → mejor)
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {lessonsLowToHigh.length > 0 ? (
                      <div className="space-y-1.5">
                        {lessonsLowToHigh.slice(0, 5).map((lesson, index) => {
                          const scoreColor = getScoreColor(lesson.avg_score);
                          return (
                            <div 
                              key={lesson.lesson_id} 
                              className="p-2 rounded border transition-all hover:shadow-sm cursor-pointer"
                              style={{ 
                                backgroundColor: isDarkMode ? '#111827' : '#fafafa',
                                borderColor: pageColors.border
                              }}
                              onClick={() => handleNavigateToLesson(lesson)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span 
                                    className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
                                  >
                                    {index + 1}
                                  </span>
                                  <span className="font-medium text-xs truncate" style={{ color: pageColors.text }}>
                                    {lesson.lesson_title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="font-bold text-xs" style={{ color: scoreColor }}>
                                    {formatScore(lesson.avg_score)}
                                  </span>
                                  <ChevronRight size={12} style={{ color: pageColors.textMuted }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <BookOpen size={24} className="mx-auto mb-2" style={{ color: pageColors.textMuted }} />
                        <p className="text-xs" style={{ color: pageColors.textMuted }}>
                          {t('statistics.noLessonsData')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preguntas Widget */}
                <div
                  className="rounded-lg overflow-hidden border flex flex-col"
                  style={{
                    backgroundColor: pageColors.cardBg,
                    borderColor: pageColors.border,
                    minHeight: '280px'
                  }}
                >
                  {/* Header */}
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ backgroundColor: pageColors.headerBg }}
                  >
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-white" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Análisis Preguntas
                      </span>
                    </div>
                    <button
                      onClick={() => setShowRiskPanel(prev => !prev)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 shadow-sm"
                      style={{
                        backgroundColor: isDarkMode ? '#ffffff' : '#ffffff',
                        color: isDarkMode ? pageColors.secondaryBg : (showRiskPanel ? pageColors.accent : pageColors.primary),
                      }}
                    >
                      <Zap size={10} style={{ color: isDarkMode ? pageColors.secondaryBg : (showRiskPanel ? pageColors.accent : pageColors.primary) }} />
                      {showRiskPanel ? 'Con riesgo' : 'Sin riesgo'}
                    </button>
                  </div>

                  {/* Subheader */}
                  <div className="px-3 py-1.5 border-b flex items-center justify-between gap-2" style={{ borderColor: pageColors.border }}>
                    <div className="flex items-center gap-2">
                      {questionStats?.global_stats?.total_users > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
                          <Users size={10} style={{ color: pageColors.labelColor }} />
                          <span className="text-xs font-medium" style={{ color: pageColors.labelColor }}>
                            {questionStats.global_stats.total_users}
                          </span>
                        </div>
                      )}
                      {questionStats?.total_questions > 0 && (
                        <span className="text-xs font-medium" style={{ color: pageColors.labelColor }}>
                          {questionStats.total_questions} respondidas
                        </span>
                      )}
                    </div>
                    {/* Selector de dificultad */}
                    <div className="flex items-center gap-1">
                      {['easy', 'medium', 'hard'].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                          style={{
                            backgroundColor: selectedDifficulty === diff
                              ? (diff === 'easy' ? '#22c55e' : diff === 'medium' ? '#f59e0b' : '#ef4444')
                              : (isDarkMode ? '#374151' : '#f3f4f6'),
                            color: selectedDifficulty === diff ? '#ffffff' : pageColors.textMuted
                          }}
                        >
                          {diff === 'easy' ? 'Fácil' : diff === 'medium' ? 'Media' : 'Difícil'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {questionStats ? (
                      <div className="space-y-2">
                        {!showRiskPanel ? (
                          <>
                            {/* Correctas */}
                            {(() => {
                              const userPct = questionStats.user_correct_pct || 0;
                              const globalPct = questionStats.global_stats?.correct_pct || 0;
                              const diff = questionStats.comparison?.correct_diff || 0;
                              const isAbove = diff > 0.5;
                              const isBelow = diff < -0.5;
                              return (
                                <div className="p-2 rounded border" style={{ backgroundColor: isDarkMode ? '#111827' : '#fafafa', borderColor: pageColors.border }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle size={12} style={{ color: '#10b981' }} />
                                      <span className="text-xs font-semibold" style={{ color: pageColors.text }}>Correctas</span>
                                    </div>
                                    {questionStats.total_questions > 0 && (
                                      <span className="text-xs font-bold" style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : pageColors.textMuted }}>
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.text }}>Tú</span>
                                      <span className="text-xs w-8 font-bold" style={{ color: '#10b981' }}>{userPct}%</span>
                                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${userPct}%`, backgroundColor: '#10b981' }} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.textMuted }}>Media</span>
                                      <span className="text-xs w-8" style={{ color: pageColors.textMuted }}>{globalPct}%</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }} />
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
                                <div className="p-2 rounded border" style={{ backgroundColor: isDarkMode ? '#111827' : '#fafafa', borderColor: pageColors.border }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <X size={12} style={{ color: '#ef4444' }} />
                                      <span className="text-xs font-semibold" style={{ color: pageColors.text }}>Incorrectas</span>
                                    </div>
                                    {questionStats.total_questions > 0 && (
                                      <span className="text-xs font-bold" style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : pageColors.textMuted }}>
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.text }}>Tú</span>
                                      <span className="text-xs w-8 font-bold" style={{ color: '#ef4444' }}>{userPct}%</span>
                                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${userPct}%`, backgroundColor: '#ef4444' }} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.textMuted }}>Media</span>
                                      <span className="text-xs w-8" style={{ color: pageColors.textMuted }}>{globalPct}%</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Sin contestar */}
                            {(questionStats.user_unanswered_pct > 0 || questionStats.global_stats?.unanswered_pct > 0) && (() => {
                              const userPct = questionStats.user_unanswered_pct || 0;
                              const globalPct = questionStats.global_stats?.unanswered_pct || 0;
                              return (
                                <div className="p-2 rounded border" style={{ backgroundColor: isDarkMode ? '#111827' : '#fafafa', borderColor: pageColors.border }}>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <AlertCircle size={12} style={{ color: '#6b7280' }} />
                                    <span className="text-xs font-semibold" style={{ color: pageColors.text }}>Sin contestar</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.text }}>Tú</span>
                                      <span className="text-xs w-8 font-bold" style={{ color: '#6b7280' }}>{userPct}%</span>
                                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${userPct}%`, backgroundColor: '#94a3b8' }} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.textMuted }}>Media</span>
                                      <span className="text-xs w-8" style={{ color: pageColors.textMuted }}>{globalPct}%</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            {/* Correctas con riesgo */}
                            {(() => {
                              const userCount = questionStats.correct_with_risk || 0;
                              const total = questionStats.total_questions || 0;
                              const userPct = total > 0 ? Math.round((userCount / total) * 100) : 0;
                              const globalPct = questionStats.global_stats?.correct_with_risk_pct || 0;
                              const diff = userPct - globalPct;
                              const isAbove = diff > 0.5;
                              const isBelow = diff < -0.5;
                              return (
                                <div className="p-2 rounded border" style={{ backgroundColor: isDarkMode ? '#111827' : '#fafafa', borderColor: pageColors.border }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle size={12} style={{ color: '#10b981' }} />
                                      <span className="text-xs font-semibold" style={{ color: pageColors.text }}>Correctas</span>
                                    </div>
                                    {total > 0 && (
                                      <span className="text-xs font-bold" style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : pageColors.textMuted }}>
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.text }}>Tú</span>
                                      <span className="text-xs w-8 font-bold" style={{ color: '#10b981' }}>{userPct}%</span>
                                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${userPct}%`, backgroundColor: '#10b981' }} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.textMuted }}>Media</span>
                                      <span className="text-xs w-8" style={{ color: pageColors.textMuted }}>{globalPct}%</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Incorrectas con riesgo */}
                            {(() => {
                              const userCount = questionStats.incorrect_with_risk || 0;
                              const total = questionStats.total_questions || 0;
                              const userPct = total > 0 ? Math.round((userCount / total) * 100) : 0;
                              const globalPct = questionStats.global_stats?.incorrect_with_risk_pct || 0;
                              const diff = userPct - globalPct;
                              const isAbove = diff < -0.5;
                              const isBelow = diff > 0.5;
                              return (
                                <div className="p-2 rounded border" style={{ backgroundColor: isDarkMode ? '#111827' : '#fafafa', borderColor: pageColors.border }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <X size={12} style={{ color: '#ef4444' }} />
                                      <span className="text-xs font-semibold" style={{ color: pageColors.text }}>Incorrectas</span>
                                    </div>
                                    {total > 0 && (
                                      <span className="text-xs font-bold" style={{ color: isAbove ? '#16a34a' : isBelow ? '#dc2626' : pageColors.textMuted }}>
                                        {diff > 0 ? '+' : ''}{diff}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.text }}>Tú</span>
                                      <span className="text-xs w-8 font-bold" style={{ color: '#ef4444' }}>{userPct}%</span>
                                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${userPct}%`, backgroundColor: '#ef4444' }} />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10" style={{ color: pageColors.textMuted }}>Media</span>
                                      <span className="text-xs w-8" style={{ color: pageColors.textMuted }}>{globalPct}%</span>
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                                        <div className="h-full rounded-full" style={{ width: `${globalPct}%`, backgroundColor: '#9ca3af' }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    ) : questionStats?.total_questions === 0 ? (
                      <div className="text-center py-6">
                        <AlertCircle size={24} className="mx-auto mb-2" style={{ color: '#f59e0b' }} />
                        <p className="text-xs" style={{ color: pageColors.textMuted }}>
                          Aún no has respondido preguntas
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Target size={24} className="mx-auto mb-2" style={{ color: pageColors.textMuted }} />
                        <p className="text-xs" style={{ color: pageColors.textMuted }}>
                          Cargando...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Score Evolution Chart - Centered at 50% width */}
              <div className="mt-3 flex justify-center">
                <div className="w-full lg:w-1/2">
                  <ScoreEvolutionChart courseId={courseId} lessonId={selectedLessonFilter} compact={true} isDarkMode={isDarkMode} pageColors={pageColors} />
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
          style={{ backgroundColor: pageColors.secondaryBg }}
        >
          {showAllLessons && (
            <div className="h-full flex flex-col">
              {/* Header Compacto con ordenación */}
              <div 
                className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('primary', '#1a202c'),
                  borderColor: pageColors.border 
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <BarChart2 size={16} style={{ color: '#ffffff' }} className="flex-shrink-0" />
                  <h2 className="text-xs sm:text-sm font-bold leading-tight truncate uppercase tracking-wide" style={{ color: '#ffffff' }}>
                    {t('statistics.performanceByLesson')}
                  </h2>
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
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
                <div className="p-4 max-w-5xl mx-auto">
                  {sortedAllLessons.length > 0 ? (
                    <div className="space-y-2">
                      {sortedAllLessons.map((lesson, index) => {
                        const lessonScore = lesson.avg_score;
                        const scoreColor = getScoreColor(lesson.avg_score);
                        
                        return (
                          <div
                            key={lesson.lesson_id}
                            className="rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-md"
                            style={{
                              backgroundColor: pageColors.cardBg,
                              borderColor: `${scoreColor}40`
                            }}
                          >
                            <div
                            className="px-3 py-1.5"
                            style={{ backgroundColor: `${scoreColor}10` }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                <span
                                  className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
                                >
                                  {index + 1}
                                </span>
                                <span className="font-bold text-xs truncate" style={{ color: pageColors.text }}>
                                  {lesson.lesson_title}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-1 flex-shrink-0">
                                <span className="font-bold text-sm" style={{ color: scoreColor }}>
                                  {formatScore(lessonScore)}
                                </span>
                                <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                  / {isPercentage ? '100' : '10'}
                                </span>
                              </div>
                            </div>
                            </div>
                            
                            <div className="p-3">
                              <ProgressBar 
                                value={lesson.avg_score} 
                                color={scoreColor}
                                height="h-1.5"
                              />
                              <div className="flex justify-between mt-1.5 text-xs" style={{ color: pageColors.textMuted }}>
                                <span>{lesson.quizzes_completed} {t('statistics.quizzesCompleted')}</span>
                                <span>{lesson.total_attempts} {t('statistics.attempts')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart2 size={32} className="mx-auto mb-2" style={{ color: pageColors.textMuted }} />
                      <p className="text-xs" style={{ color: pageColors.textMuted }}>
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

      {/* Ranking Panel - usando el mismo componente que TestsPage */}
      <CourseRankingProvider
        courseId={courseId}
        courseName={courseName}
        isOpen={isRankingOpen}
        onOpen={() => setIsRankingOpen(true)}
        onClose={() => setIsRankingOpen(false)}
      >
        <CourseRankingSlidePanel />
      </CourseRankingProvider>
    </CoursePageTemplate>
  );
};

export default CourseStatisticsPage;
