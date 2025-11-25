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
import { getMyRankingStatus } from '../../../api/services/courseRankingService';
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
  Activity
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
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy'); // Added state for difficulty tab

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      
      setLoading(true);
      try {
        const [lessonsData, weakData, difficultyData, rankingData] = await Promise.all([
          getPerformanceByLesson(courseId),
          getWeakSpots(courseId),
          getDifficultyStats(courseId),
          getMyRankingStatus(courseId)
        ]);

        const lessonsArray = lessonsData.data?.lessons || lessonsData.data || [];
        
        console.log('📊 Statistics Debug - Full Data:', {
          lessonsData,
          rankingData,
          weakData,
          difficultyData
        });

        console.log('🧠 Difficulty Data Raw:', difficultyData);
        console.log('🧠 Difficulty Data .data:', difficultyData?.data);

        console.log('🏆 Ranking Status Raw:', rankingData);
        console.log('🏆 Ranking Status Data:', rankingData.data);
        
        setPerformanceByLesson(lessonsArray);
        setWeakSpots(weakData.data || []);
        setDifficultyStats(difficultyData.data || {});
        setRankingStatus(rankingData.data);
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
      worstLesson,
      hasCompletedAll: completedQuizzes === totalQuizzes && totalQuizzes > 0
    };
  }, [rankingStatus, performanceByLesson]);

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

  // 🎨 Helper: Obtener estilo según el score (rangos en base10)
  const getReviewStyle = (percentageScore) => {
    const base10Score = percentageScore / 10;
    
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

  // Helper: Obtener color según el score (espera valor en porcentaje 0-100)
  const getScoreColor = (percentageScore) => {
    if (percentageScore >= 80) return '#22c55e'; // green
    if (percentageScore >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // 🔥 IMPORTANTE: El backend actualmente devuelve scores en porcentaje (0-100)
  // Convertir de porcentaje a base10 para usar ScoreFormatContext
  const convertFromBackend = (backendScore) => {
    // Backend devuelve en porcentaje (0-100), dividimos por 10 para obtener base10 (0-10)
    return backendScore / 10;
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
                  <div 
                    className="rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground'),
                      borderColor: getColor('borderColor')
                    }}
                  >
                    <div 
                      className="px-4 py-2 flex items-center justify-between"
                      style={{ backgroundColor: getColor('primary', '#1a202c') }}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                        {t('statistics.averageScore')}
                      </span>
                      <TrendingUp size={16} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                    </div>
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />
                    <div className="p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                          {computedStats ? formatScore(computedStats.avgScore / 10) : '-'}
                        </span>
                        <span className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          / {isPercentage ? '100' : '10'}
                        </span>
                      </div>
                      {rankingStatus?.is_temporary && (
                        <div className="flex items-center gap-1 mt-2">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: `${getColor('warning', '#f59e0b')}15`,
                              color: getColor('warning', '#f59e0b')
                            }}
                          >
                            {t('statistics.temporary')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

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
                          #{rankingStatus?.temporary_position || rankingStatus?.position || '-'}
                        </span>
                        {computedStats?.hasCompletedAll && (
                          <CheckCircle size={16} className="text-green-500 mb-1" />
                        )}
                      </div>
                      {rankingStatus?.is_temporary && (
                        <div className="flex items-center gap-1 mt-2">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ 
                              backgroundColor: `${getColor('warning', '#f59e0b')}15`,
                              color: getColor('warning', '#f59e0b')
                            }}
                          >
                            {t('statistics.temporary')}
                          </span>
                        </div>
                      )}
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
                      style={{ backgroundColor: '#3b82f6' }}
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
                        <span className="text-4xl font-bold" style={{ color: '#3b82f6' }}>
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
                            color="#3b82f6"
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
                      style={{ backgroundColor: '#22c55e' }}
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
                            <span className="text-4xl font-bold text-green-600">
                              {formatScore(computedStats.bestLesson.avg_score / 10)}
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
                
                {/* Áreas de Mejora - Lista de Repaso */}
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
                          {t('statistics.lessonsToReview')}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAllLessons(true)}
                        className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-all"
                        style={{ 
                          color: getColor('textColorContrast', '#ffffff'),
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
                  
                  {/* Content */}
                  <div className="p-6">
                    {lessonsToReview.length > 0 ? (
                      <div className="space-y-3">
                        {lessonsToReview.map((lesson) => {
                          const lessonScore = lesson.avg_score / 10;
                          const style = getReviewStyle(lesson.avg_score);
                          
                          return (
                            <div 
                              key={lesson.lesson_id} 
                              className="p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                              style={{ 
                                backgroundColor: getColor('background', '#ffffff'),
                                borderColor: style.borderColor
                              }}
                              onClick={() => handleNavigateToLesson(lesson.lesson_id)}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate" style={{ color: getColor('primary', '#1a202c') }}>
                                    {lesson.lesson_title}
                                  </h4>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span 
                                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ 
                                        backgroundColor: `${style.iconColor}15`,
                                        color: style.textColor
                                      }}
                                    >
                                      {style.label}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-baseline gap-1 flex-shrink-0">
                                  <span className="font-bold text-lg" style={{ color: style.textColor }}>
                                    {formatScore(lessonScore)}
                                  </span>
                                  <span className="text-xs" style={{ color: `${style.textColor}80` }}>
                                    / {isPercentage ? '100' : '10'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button 
                                  className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 font-medium"
                                  style={{
                                    backgroundColor: style.iconColor,
                                    color: '#ffffff'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToLesson(lesson.lesson_id);
                                  }}
                                >
                                  <Target size={12} />
                                  {t('statistics.review')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 rounded-lg" style={{ backgroundColor: `${getColor('primary', '#1a202c')}05` }}>
                        <Zap size={32} className="mx-auto mb-2 text-green-500" />
                        <p className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                          {t('statistics.greatJob')}
                        </p>
                        <p className="text-xs mt-1" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          {t('statistics.allLessonsAbove8')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Análisis de Dificultad */}
                <div 
                  className="rounded-xl overflow-hidden border-2 flex flex-col"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground'),
                    borderColor: getColor('borderColor')
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    <div className="flex items-center gap-2">
                      <Target size={20} className="text-white" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                        {t('statistics.difficultyAnalysis')}
                      </h3>
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
                    <div className="flex-1 flex flex-col p-6">
                      {/* Tabs */}
                      <div className="flex p-1 rounded-lg mb-6" style={{ backgroundColor: `${getColor('primary', '#1a202c')}08` }}>
                        {['easy', 'medium', 'hard'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setSelectedDifficulty(level)}
                            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all capitalize ${
                              selectedDifficulty === level ? 'shadow-md' : ''
                            }`}
                            style={{
                              backgroundColor: selectedDifficulty === level ? getColor('background', '#ffffff') : 'transparent',
                              color: selectedDifficulty === level ? getColor('primary', '#1a202c') : `${getColor('primary', '#1a202c')}60`
                            }}
                          >
                            {t(`statistics.${level}`)}
                          </button>
                        ))}
                      </div>

                      {/* Chart Content */}
                      {(() => {
                        const stats = difficultyStats[selectedDifficulty] || { total: 0, correct: 0, incorrect: 0, unanswered: 0, risked: 0 };
                        const data = [
                          { name: t('statistics.correct'), value: stats.correct, color: '#22c55e' },
                          { name: t('statistics.incorrect'), value: stats.incorrect, color: '#ef4444' },
                          { name: t('statistics.unanswered'), value: stats.unanswered, color: '#9ca3af' }
                        ].filter(d => d.value > 0);

                        return (
                          <div className="flex-1 flex flex-col items-center justify-center">
                            {stats.total > 0 ? (
                              <>
                                <div className="w-48 h-48 relative mb-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                      >
                                        {data.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                      </Pie>
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: getColor('background', '#ffffff'),
                                          borderColor: getColor('borderColor', '#e5e7eb'),
                                          borderRadius: '0.5rem',
                                          fontSize: '0.75rem'
                                        }}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                  {/* Center Text */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                      {stats.total}
                                    </span>
                                    <span className="text-xs uppercase tracking-wider" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                      Total
                                    </span>
                                  </div>
                                </div>

                                {/* Legend & Details */}
                                <div className="w-full space-y-3">
                                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-3 rounded-lg border-2 border-green-200" style={{ backgroundColor: '#f0fdf4' }}>
                                      <div className="font-bold text-lg text-green-600">{stats.correct}</div>
                                      <div className="text-green-800 opacity-70 font-medium mt-1">{t('statistics.correct')}</div>
                                    </div>
                                    <div className="p-3 rounded-lg border-2 border-red-200" style={{ backgroundColor: '#fef2f2' }}>
                                      <div className="font-bold text-lg text-red-600">{stats.incorrect}</div>
                                      <div className="text-red-800 opacity-70 font-medium mt-1">{t('statistics.incorrect')}</div>
                                    </div>
                                    <div className="p-3 rounded-lg border-2 border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
                                      <div className="font-bold text-lg text-gray-600">{stats.unanswered}</div>
                                      <div className="text-gray-800 opacity-70 font-medium mt-1">{t('statistics.unanswered')}</div>
                                    </div>
                                  </div>

                                  {/* Risked Stat */}
                                  {stats.risked > 0 && (
                                    <div 
                                      className="flex items-center justify-between p-3 rounded-lg border-2 border-orange-200"
                                      style={{ backgroundColor: '#fff7ed' }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-orange-500" />
                                        <span className="text-xs font-bold text-orange-800">
                                          {t('statistics.markedWithRisk')}
                                        </span>
                                      </div>
                                      <span className="font-bold text-lg text-orange-600">{stats.risked}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-8">
                                <Target size={32} className="mx-auto mb-2" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                                <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                  {t('statistics.noDataForDifficulty')}
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

              {/* Segunda fila - Análisis de Riesgo en ancho completo */}
              <div 
                className="rounded-xl overflow-hidden border-2 flex flex-col mt-4"
                style={{ 
                  backgroundColor: getColor('secondaryBackground'),
                  borderColor: getColor('borderColor')
                }}
              >
                {/* Header */}
                <div 
                  className="px-4 py-3"
                  style={{ backgroundColor: '#f59e0b' }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-white" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                      {t('statistics.riskAnalysis')}
                    </h3>
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
                  <div className="flex-1 flex flex-col p-6">
                    {/* Tabs */}
                    <div className="flex p-1 rounded-lg mb-6" style={{ backgroundColor: `${getColor('primary', '#1a202c')}08` }}>
                      {['easy', 'medium', 'hard'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedDifficulty(level)}
                          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all capitalize ${
                            selectedDifficulty === level ? 'shadow-md' : ''
                          }`}
                          style={{
                            backgroundColor: selectedDifficulty === level ? getColor('background', '#ffffff') : 'transparent',
                            color: selectedDifficulty === level ? getColor('primary', '#1a202c') : `${getColor('primary', '#1a202c')}60`
                          }}
                        >
                          {t(`statistics.${level}`)}
                        </button>
                      ))}
                    </div>

                    {/* Chart Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {(() => {
                        const stats = difficultyStats[selectedDifficulty] || { risked: 0, risked_correct: 0, risked_incorrect: 0, risked_unanswered: 0 };
                        const data = [
                          { name: t('statistics.correct'), value: stats.risked_correct || 0, color: '#22c55e' },
                          { name: t('statistics.incorrect'), value: stats.risked_incorrect || 0, color: '#ef4444' },
                          { name: t('statistics.unanswered'), value: stats.risked_unanswered || 0, color: '#9ca3af' }
                        ].filter(d => d.value > 0);

                        return stats.risked > 0 ? (
                          <>
                            {/* Chart */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-48 h-48 relative mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={data}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                    >
                                      {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: getColor('background', '#ffffff'),
                                        borderColor: getColor('borderColor', '#e5e7eb'),
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem'
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-3xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                    {stats.risked}
                                  </span>
                                  <span className="text-xs uppercase tracking-wider" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                    Total
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="flex items-center">
                              <div className="w-full space-y-3">
                                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                  <div className="p-3 rounded-lg border-2 border-green-200" style={{ backgroundColor: '#f0fdf4' }}>
                                    <div className="font-bold text-lg text-green-600">{stats.risked_correct || 0}</div>
                                    <div className="text-green-800 opacity-70 font-medium mt-1">{t('statistics.correct')}</div>
                                  </div>
                                  <div className="p-3 rounded-lg border-2 border-red-200" style={{ backgroundColor: '#fef2f2' }}>
                                    <div className="font-bold text-lg text-red-600">{stats.risked_incorrect || 0}</div>
                                    <div className="text-red-800 opacity-70 font-medium mt-1">{t('statistics.incorrect')}</div>
                                  </div>
                                  <div className="p-3 rounded-lg border-2 border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
                                    <div className="font-bold text-lg text-gray-600">{stats.risked_unanswered || 0}</div>
                                    <div className="text-gray-800 opacity-70 font-medium mt-1">{t('statistics.unanswered')}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-2 text-center py-8">
                            <AlertTriangle size={32} className="mx-auto mb-2 text-orange-300" />
                            <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                              {t('statistics.noRiskDataForDifficulty')}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 p-6">
                    <AlertTriangle size={32} className="mx-auto mb-2 text-orange-300" />
                    <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                      {t('statistics.noRiskData')}
                    </p>
                  </div>
                )}
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
              {/* Header Compacto */}
              <div 
                className="flex items-center justify-between px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <BarChart2 size={18} style={{ color: getColor('primary', '#1a202c') }} className="flex-shrink-0" />
                  <h2 className="text-sm sm:text-base font-semibold leading-tight truncate" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('statistics.performanceByLesson')}
                  </h2>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-1"
                    style={{ 
                      backgroundColor: `${getColor('primary', '#1a202c')}10`,
                      color: getColor('primary', '#1a202c')
                    }}
                  >
                    {performanceByLesson.length} {t('lessons.title').toLowerCase()}
                  </span>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowAllLessons(false)}
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

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 max-w-5xl mx-auto">
                  {performanceByLesson.length > 0 ? (
                    <div className="space-y-4">
                      {performanceByLesson.map((lesson) => {
                        const lessonScore = lesson.avg_score / 10;
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
                                <span className="font-bold text-sm text-white truncate flex-1 mr-3">
                                  {lesson.lesson_title}
                                </span>
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
