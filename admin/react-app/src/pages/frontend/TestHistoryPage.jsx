// src/pages/frontend/TestHistoryPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import useQuizAttempts from '../../hooks/useQuizAttempts';
import useMultipleQuizRankings from '../../hooks/useMultipleQuizRankings';
import { getCourseLessons } from '../../api/services/courseLessonService';
import { Calendar, Award, BookOpen, ExternalLink, Eye, TrendingUp, TrendingDown, Loader, ClipboardList, ChevronRight, Search, Filter, ChevronLeft, ChevronRight as ChevronRightNav, X } from 'lucide-react';
import CourseSidebar from '../../components/course/CourseSidebar';

const TestHistoryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { formatScore } = useScoreFormat();
  
  // Dark mode aware colors
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
    hoverBgStrong: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getColor('primary', '#1a202c')}20`,
    primaryBg: getColor('primary', '#1a202c'), // Para fondos de botones activos
  };
  
  // Estados para filtros
  const [searchText, setSearchText] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lessons, setLessons] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Construir objeto de filtros
  const filters = useMemo(() => ({
    search: searchText,
    lesson_id: selectedLesson,
    date_from: dateFrom,
    date_to: dateTo,
  }), [searchText, selectedLesson, dateFrom, dateTo]);
  
  const { attempts, loading, error, pagination, fetchAttempts } = useQuizAttempts({
    courseId: courseId ? parseInt(courseId, 10) : null,
    perPage: 10,
    autoFetch: false,
    filters
  });

  // Cargar lecciones del curso para el filtro
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const courseIdNum = parseInt(courseId, 10);
        if (!courseIdNum || isNaN(courseIdNum)) {
          console.error('Invalid courseId:', courseId);
          return;
        }
        const lessonsData = await getCourseLessons(courseIdNum);
        setLessons(lessonsData.data || []);
      } catch (err) {
        console.error('Error loading lessons:', err);
      }
    };
    
    if (courseId) {
      fetchLessons();
    }
  }, [courseId]);

  // Cargar attempts cuando cambian los filtros o la página
  useEffect(() => {
    fetchAttempts(currentPage, filters);
  }, [currentPage, filters, fetchAttempts]);

  // Obtener rankings para todos los quizzes
  const uniqueQuizIds = [...new Set(attempts.map(a => a.quiz_id))];
  const { rankings, loading: rankingLoading } = useMultipleQuizRankings(uniqueQuizIds);

  const calculatePercentile = (quizId, score, withRisk) => {
    const ranking = rankings[quizId];
    if (!ranking) return null;
    
    const statistics = ranking.statistics;
    if (!statistics) return null;
    
    const avgScore = withRisk 
      ? statistics.avg_score_with_risk 
      : statistics.avg_score_without_risk;
    
    if (avgScore === undefined || avgScore === null) return null;
    
    return score - avgScore;
  };

  const handleViewQuiz = (attempt, e) => {
    e.stopPropagation();
    navigate(`/courses/${courseId}/tests`, {
      state: { 
        selectedQuizId: parseInt(attempt.quiz_id),
        scrollToQuiz: true,
        returnTo: `/courses/${courseId}/test-history`
      }
    });
  };

  const handleViewDetails = (attempt, e) => {
    e.stopPropagation();
    navigate(`/courses/${courseId}/tests`, {
      state: { 
        selectedQuizId: parseInt(attempt.quiz_id),
        viewAttemptId: parseInt(attempt.attempt_id),
        returnTo: `/courses/${courseId}/test-history`
      }
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedLesson('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchText || selectedLesson || dateFrom || dateTo;

  // Generar array de números de página para la paginación
  const getPageNumbers = () => {
    const pages = [];
    const { currentPage, totalPages } = pagination;
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex h-full w-full">
      <CourseSidebar />
      <div 
        className="flex-1 flex flex-col overflow-auto"
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
        {/* Breadcrumbs Header */}
        <header className="px-6 py-3 border-b sticky top-0 z-10 flex-shrink-0" style={{ 
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}15`,
          backgroundColor: getColor('secondaryBackground', '#f3f4f6')
        }}>
          <nav className="flex items-center text-sm space-x-2">
            <Link 
              to="/courses"
              className="transition-colors duration-200 hover:underline font-medium"
              style={{ color: pageColors.text }}
            >
              {t('sidebar.studyPlanner')}
            </Link>
            <ChevronRight size={16} style={{ color: pageColors.textMuted }} />
            <span 
              className="font-medium"
              style={{ color: pageColors.text }}
            >
              {t('tests.testHistory')}
            </span>
          </nav>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl w-full mx-auto px-4 py-6 pb-24">
            {/* Header con filtros */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: pageColors.hoverBg }}
                  >
                    <ClipboardList size={28} style={{ color: pageColors.text }} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: pageColors.text }}>
                      {t('tests.testHistory')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: pageColors.textMuted }}>
                      {pagination.total} {pagination.total === 1 ? t('tests.attempt') : t('tests.attempts')} {t('common.total')}
                    </p>
                  </div>
                </div>
                
                {/* Botón para mostrar/ocultar filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: showFilters ? pageColors.primaryBg : pageColors.hoverBg,
                    color: showFilters ? '#ffffff' : pageColors.text
                  }}
                >
                  <Filter size={18} />
                  <span>{t('common.filters')}</span>
                  {hasActiveFilters && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: showFilters ? '#ffffff' : pageColors.primaryBg,
                        color: showFilters ? pageColors.primaryBg : '#ffffff'
                      }}
                    >
                      {[searchText, selectedLesson, dateFrom, dateTo].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Panel de filtros */}
              {showFilters && (
                <div 
                  className="p-4 rounded-xl border-2 mb-4"
                  style={{
                    backgroundColor: pageColors.bgCard,
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Buscador de texto */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
                        {t('tests.searchQuiz')}
                      </label>
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: pageColors.textMuted }} />
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                          placeholder={t('tests.quizNamePlaceholder')}
                          className="w-full pl-10 pr-3 py-2 rounded-lg border"
                          style={{
                            borderColor: getColor('borderColor', '#e5e7eb'),
                            backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                            color: pageColors.text
                          }}
                        />
                      </div>
                    </div>

                    {/* Filtro por lección */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
                        {t('tests.lesson')}
                      </label>
                      <select
                        value={selectedLesson}
                        onChange={(e) => { setSelectedLesson(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{
                          borderColor: getColor('borderColor', '#e5e7eb'),
                          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                          color: pageColors.text
                        }}
                      >
                        <option value="">{t('tests.allLessons')}</option>
                        {lessons.map(lesson => (
                          <option key={lesson.id} value={lesson.id}>
                            {lesson.title?.rendered || lesson.title || t('courses.untitledLesson')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro fecha desde */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
                        {t('tests.dateFrom')}
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{
                          borderColor: getColor('borderColor', '#e5e7eb'),
                          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                          color: pageColors.text
                        }}
                      />
                    </div>

                    {/* Filtro fecha hasta */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
                        {t('tests.dateTo')}
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{
                          borderColor: getColor('borderColor', '#e5e7eb'),
                          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                          color: pageColors.text
                        }}
                      />
                    </div>
                  </div>

                  {/* Botón para limpiar filtros */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                      style={{
                        backgroundColor: pageColors.hoverBg,
                        color: pageColors.text
                      }}
                    >
                      <X size={16} />
                      <span>{t('common.clearFilters')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin" style={{ color: pageColors.text }} />
              </div>
            ) : error ? (
              <div 
                className="p-6 rounded-lg border-2"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                  borderColor: '#ef4444',
                  color: '#ef4444'
                }}
              >
                {error}
              </div>
            ) : attempts.length === 0 ? (
              <div 
                className="p-12 text-center rounded-xl border-2"
                style={{
                  backgroundColor: pageColors.bgCard,
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <ClipboardList size={64} className="mx-auto mb-4" style={{ color: pageColors.textMuted }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: pageColors.text }}>
                  {t('tests.noAttemptsYet')}
                </h3>
                <p style={{ color: pageColors.textMuted }}>
                  {t('tests.noAttemptsDescription')}
                </p>
              </div>
            ) : (
              <div 
                className="rounded-xl border-2"
                style={{
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                {attempts.map((attempt, index) => {
                  const percentileWithoutRisk = calculatePercentile(attempt.quiz_id, attempt.score, false);
                  const percentileWithRisk = calculatePercentile(attempt.quiz_id, attempt.score_with_risk, true);

                  return (
                    <div key={attempt.attempt_id}>
                      <div className="px-4 py-4 sm:px-6 sm:py-5">
                        {/* Layout Mobile */}
                        <div className="sm:hidden space-y-3">
                          {/* Header: Fecha + Botón Ver */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: pageColors.hoverBg }}
                              >
                                <Calendar size={16} style={{ color: pageColors.text }} />
                              </div>
                              <div>
                                <div className="text-xs font-semibold" style={{ color: pageColors.text }}>
                                  {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { 
                                    day: '2-digit', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleViewDetails(attempt, e)}
                              className="p-2 rounded-lg text-xs font-medium transition-all"
                              style={{ 
                                backgroundColor: pageColors.hoverBg,
                                color: pageColors.text
                              }}
                            >
                              <Eye size={18} />
                            </button>
                          </div>

                          {/* Lección y Quiz */}
                          <div>
                            <div className="flex items-center text-xs mb-1" style={{ color: pageColors.textMuted }}>
                              <BookOpen size={12} className="mr-1.5" />
                              {attempt.lessonTitle || t('tests.noLesson')}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium line-clamp-1" style={{ color: pageColors.text }}>
                                {attempt.quizTitle || t('tests.untitledQuiz')}
                              </div>
                              <button
                                onClick={(e) => handleViewQuiz(attempt, e)}
                                className="p-1 rounded-lg transition-all flex-shrink-0"
                                style={{ backgroundColor: pageColors.hoverBg }}
                                title={t('tests.goToQuiz')}
                              >
                                <ExternalLink size={14} style={{ color: pageColors.text }} />
                              </button>
                            </div>
                          </div>

                          {/* Scores */}
                          <div className="grid grid-cols-2 gap-3">
                            <div 
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: pageColors.bgSubtle }}
                            >
                              <div className="text-xs mb-1" style={{ color: pageColors.textMuted }}>
                                {t('tests.withoutRisk')}
                              </div>
                              <div className="text-lg font-bold" style={{ color: pageColors.text }}>
                                {formatScore(attempt.score || 0)}
                              </div>
                              {percentileWithoutRisk !== null && (
                                <span 
                                  className="text-xs font-medium flex items-center gap-1 mt-1"
                                  style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}
                                >
                                  {percentileWithoutRisk >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                  {percentileWithoutRisk >= 0 ? '+' : ''}{percentileWithoutRisk.toFixed(1)}
                                </span>
                              )}
                            </div>

                            <div 
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: `${pageColors.accent}15` }}
                            >
                              <div className="text-xs mb-1" style={{ color: pageColors.textMuted }}>
                                {t('tests.withRisk')}
                              </div>
                              <div className="text-lg font-bold" style={{ color: pageColors.accent }}>
                                {formatScore(attempt.score_with_risk || 0)}
                              </div>
                              {percentileWithRisk !== null && (
                                <span 
                                  className="text-xs font-medium flex items-center gap-1 mt-1"
                                  style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}
                                >
                                  {percentileWithRisk >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                  {percentileWithRisk >= 0 ? '+' : ''}{percentileWithRisk.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Layout Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-6 gap-4 items-center">
                          {/* Fecha */}
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: pageColors.hoverBg }}
                            >
                              <Calendar size={18} style={{ color: pageColors.text }} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold" style={{ color: pageColors.text }}>
                                {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: 'short'
                                })}
                              </div>
                              <div className="text-xs" style={{ color: pageColors.textMuted }}>
                                {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { 
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Lección y Cuestionario */}
                          <div className="col-span-2">
                            <div className="flex items-center text-xs mb-1" style={{ color: pageColors.textMuted }}>
                              <BookOpen size={12} className="mr-1.5" />
                              {attempt.lessonTitle || t('tests.noLesson')}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate" style={{ color: pageColors.text }}>
                                {attempt.quizTitle || t('tests.untitledQuiz')}
                              </div>
                              <button
                                onClick={(e) => handleViewQuiz(attempt, e)}
                                className="p-1.5 rounded-lg transition-all flex-shrink-0"
                                style={{ backgroundColor: pageColors.hoverBg }}
                                title={t('tests.goToQuiz')}
                              >
                                <ExternalLink size={14} style={{ color: pageColors.text }} />
                              </button>
                            </div>
                          </div>

                          {/* Nota Sin Riesgo */}
                          <div>
                            <div className="text-lg font-bold mb-1" style={{ color: pageColors.text }}>
                              {formatScore(attempt.score || 0)}
                            </div>
                            {percentileWithoutRisk !== null && (
                              <span 
                                className="text-xs font-medium flex items-center gap-1"
                                style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}
                              >
                                {percentileWithoutRisk >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {percentileWithoutRisk >= 0 ? '+' : ''}{percentileWithoutRisk.toFixed(1)}
                              </span>
                            )}
                          </div>

                          {/* Nota Con Riesgo */}
                          <div>
                            <div className="text-lg font-bold mb-1" style={{ color: pageColors.accent }}>
                              {formatScore(attempt.score_with_risk || 0)}
                            </div>
                            {percentileWithRisk !== null && (
                              <span 
                                className="text-xs font-medium flex items-center gap-1"
                                style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}
                              >
                                {percentileWithRisk >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {percentileWithRisk >= 0 ? '+' : ''}{percentileWithRisk.toFixed(1)}
                              </span>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center justify-end">
                            <button
                              onClick={(e) => handleViewDetails(attempt, e)}
                              className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                              style={{ 
                                backgroundColor: pageColors.hoverBg,
                                color: pageColors.text
                              }}
                            >
                              <Eye size={14} />
                              <span>{t('tests.viewDetails')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Separador */}
                      {index < attempts.length - 1 && (
                        <div 
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Paginación */}
            {!loading && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                {/* Info de página actual */}
                <div className="text-sm" style={{ color: pageColors.textMuted }}>
                  {t('tests.showing')} {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, pagination.total)} {t('tests.of')} {pagination.total} {t('tests.results')}
                </div>

                {/* Controles de paginación */}
                <div className="flex items-center gap-2">
                  {/* Botón anterior */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: pageColors.hoverBg,
                      color: pageColors.text
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Números de página */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span 
                            key={`ellipsis-${index}`} 
                            className="px-3 py-2"
                            style={{ color: pageColors.textMuted }}
                          >
                            ...
                          </span>
                        );
                      }

                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className="min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all flex justify-center items-center"
                          style={{
                            backgroundColor: isActive 
                              ? pageColors.primaryBg
                              : pageColors.bgSubtle,
                            color: isActive 
                              ? '#ffffff' 
                              : pageColors.text
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botón siguiente */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: pageColors.hoverBg,
                      color: pageColors.text
                    }}
                  >
                    <ChevronRightNav size={20} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TestHistoryPage;
