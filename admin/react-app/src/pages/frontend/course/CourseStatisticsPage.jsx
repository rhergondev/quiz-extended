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
  getDifficultyStats 
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
  ChevronDown
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
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [lessonSortOrder, setLessonSortOrder] = useState('desc'); // 'desc' = high to low, 'asc' = low to high
  const [riskViewMode, setRiskViewMode] = useState('without'); // 'with' or 'without' risk
  const [selectedLessonFilter, setSelectedLessonFilter] = useState(null); // For question analysis filter

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      
      setLoading(true);
      try {
        const [lessonsData, weakData, difficultyData, rankingData, rankingFullData] = await Promise.all([
          getPerformanceByLesson(courseId),
          getWeakSpots(courseId),
          getDifficultyStats(courseId),
          getMyRankingStatus(courseId),
          getCourseRanking(courseId, { page: 1, perPage: 20, withRisk: false })
        ]);

        const lessonsArray = lessonsData.data?.lessons || lessonsData.data || [];
        
        setPerformanceByLesson(lessonsArray);
        setWeakSpots(weakData.data || []);
        setDifficultyStats(difficultyData.data || {});
        setRankingStatus(rankingData.data);
        setRankingStatistics(rankingFullData?.data?.statistics || null);
      } catch (error) {
        console.error('❌ Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

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

              {/* Score Evolution Chart */}
              <div className="mt-6">
                <ScoreEvolutionChart courseId={courseId} />
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

                {/* Análisis de Preguntas - Con toggle Sin/Con Riesgo */}
                <div 
                  className="rounded-xl overflow-hidden border-2 flex flex-col"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground'),
                    borderColor: getColor('borderColor')
                  }}
                >
                  {/* Header - cambia de color según riskViewMode */}
                  <div 
                    className="px-4 py-3 transition-colors duration-300"
                    style={{ backgroundColor: riskViewMode === 'with' ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c') }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target size={20} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                          {t('statistics.questionAnalysis')}
                        </h3>
                      </div>
                      {/* Risk Toggle */}
                      <div className="flex items-center gap-1 bg-white/20 rounded-lg p-0.5">
                        <button
                          onClick={() => setRiskViewMode('without')}
                          className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                            riskViewMode === 'without' 
                              ? 'bg-white shadow-sm' 
                              : 'text-white/90 hover:text-white hover:bg-white/10'
                          }`}
                          style={{
                            color: riskViewMode === 'without' ? getColor('primary', '#1a202c') : undefined
                          }}
                        >
                          {t('statistics.withoutRisk')}
                        </button>
                        <button
                          onClick={() => setRiskViewMode('with')}
                          className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1 ${
                            riskViewMode === 'with' 
                              ? 'bg-white shadow-sm' 
                              : 'text-white/90 hover:text-white hover:bg-white/10'
                          }`}
                          style={{
                            color: riskViewMode === 'with' ? getColor('accent', '#f59e0b') : undefined
                          }}
                        >
                          <AlertTriangle size={12} />
                          {t('statistics.withRisk')}
                        </button>
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
                  
                  {difficultyStats && Object.keys(difficultyStats).length > 0 ? (
                    <div className="flex-1 flex flex-col p-4">
                      {/* Difficulty Tabs - Mejorados */}
                      <div 
                        className="flex p-1 rounded-xl mb-4 border"
                        style={{ 
                          backgroundColor: getColor('background', '#ffffff'),
                          borderColor: getColor('borderColor', '#e5e7eb')
                        }}
                      >
                        {['easy', 'medium', 'hard'].map((level) => {
                          const isSelected = selectedDifficulty === level;
                          const tabColors = {
                            easy: { bg: '#10b981', text: 'white' },
                            medium: { bg: '#f59e0b', text: 'white' },
                            hard: { bg: '#ef4444', text: 'white' }
                          };
                          return (
                            <button
                              key={level}
                              onClick={() => setSelectedDifficulty(level)}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${
                                isSelected ? 'shadow-md' : 'hover:bg-gray-50'
                              }`}
                              style={{
                                backgroundColor: isSelected ? tabColors[level].bg : 'transparent',
                                color: isSelected ? tabColors[level].text : getColor('primary', '#1a202c')
                              }}
                            >
                              {t(`statistics.${level}`)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Stats Content */}
                      {(() => {
                        const stats = difficultyStats[selectedDifficulty] || { 
                          total: 0, correct: 0, incorrect: 0, unanswered: 0, 
                          risked: 0, risked_correct: 0, risked_incorrect: 0, risked_unanswered: 0 
                        };
                        
                        // Calculate stats based on risk mode
                        const displayStats = riskViewMode === 'with' 
                          ? {
                              total: stats.risked || 0,
                              correct: stats.risked_correct || 0,
                              incorrect: stats.risked_incorrect || 0,
                              unanswered: stats.risked_unanswered || 0
                            }
                          : {
                              total: stats.total || 0,
                              correct: stats.correct || 0,
                              incorrect: stats.incorrect || 0,
                              unanswered: stats.unanswered || 0
                            };
                        
                        // Calculate percentages
                        const calcPercent = (val) => displayStats.total > 0 ? ((val / displayStats.total) * 100).toFixed(1) : 0;

                        return (
                          <div className="flex-1">
                            {displayStats.total > 0 ? (
                              <div className="space-y-3">
                                {/* Quick stats row */}
                                <div className="text-center mb-2">
                                  <span className="text-2xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                    {displayStats.total}
                                  </span>
                                  <span className="text-xs ml-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                    {riskViewMode === 'with' ? t('statistics.markedWithRisk') : 'preguntas totales'}
                                  </span>
                                </div>

                                {/* Stats bars */}
                                <div className="space-y-2">
                                  {/* Correct */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 text-xs font-medium" style={{ color: '#059669' }}>{t('statistics.correct')}</div>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full transition-all duration-500"
                                        style={{ width: `${calcPercent(displayStats.correct)}%`, backgroundColor: '#34d399' }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" 
                                            style={{ color: calcPercent(displayStats.correct) > 50 ? 'white' : '#059669' }}>
                                        {displayStats.correct} ({calcPercent(displayStats.correct)}%)
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Incorrect */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 text-xs font-medium" style={{ color: '#dc2626' }}>{t('statistics.incorrect')}</div>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full transition-all duration-500"
                                        style={{ width: `${calcPercent(displayStats.incorrect)}%`, backgroundColor: '#f87171' }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                                            style={{ color: calcPercent(displayStats.incorrect) > 50 ? 'white' : '#dc2626' }}>
                                        {displayStats.incorrect} ({calcPercent(displayStats.incorrect)}%)
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Unanswered */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 text-xs font-medium text-gray-500">{t('statistics.unanswered')}</div>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full bg-gray-400 transition-all duration-500"
                                        style={{ width: `${calcPercent(displayStats.unanswered)}%` }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                                            style={{ color: calcPercent(displayStats.unanswered) > 50 ? 'white' : '#6b7280' }}>
                                        {displayStats.unanswered} ({calcPercent(displayStats.unanswered)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Risk indicator when viewing without risk */}
                                {riskViewMode === 'without' && stats.risked > 0 && (
                                  <div 
                                    className="flex items-center justify-between p-2 rounded-lg border mt-3"
                                    style={{ 
                                      backgroundColor: '#fef3c7',
                                      borderColor: '#fcd34d'
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle size={14} className="text-amber-600" />
                                      <span className="text-xs font-medium text-amber-800">
                                        {stats.risked} {t('statistics.markedWithRisk')}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setRiskViewMode('with')}
                                      className="text-xs font-medium transition-colors"
                                      style={{ color: getColor('accent', '#3b82f6') }}
                                    >
                                      {t('statistics.viewDetail')} →
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <Target size={28} className="mx-auto mb-2" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                                <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                  {riskViewMode === 'with' 
                                    ? t('statistics.noRiskDataForDifficulty')
                                    : t('statistics.noDataForDifficulty')
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target size={32} className="mx-auto mb-2" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                      <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                        {t('statistics.noDifficultyData')}
                      </p>
                    </div>
                  )}
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
