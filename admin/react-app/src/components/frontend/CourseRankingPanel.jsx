import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useCourseRanking } from '../../hooks/useCourseRanking';
import { useTranslation } from 'react-i18next';

const CourseRankingPanel = ({ courseId, courseName }) => {
    const { t } = useTranslation();
    const { getColor, isDarkMode } = useTheme();
    const { formatScore } = useScoreFormat();
    const [isOpen, setIsOpen] = useState(false);
    
    const {
        loading,
        error,
        ranking,
        statistics,
        myStats,
        myStatus,
        pagination,
        withRisk,
        toggleRisk,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        goToUserPage
    } = useCourseRanking(courseId);

    // Primary color from theme (same pattern as QuizGeneratorPage)
    const primaryColor = getColor('primary', '#1a202c');
    
    // Theme colors - adaptable like other pages
    const pageColors = {
        bg: getColor('background', '#ffffff'),
        bgSecondary: getColor('secondaryBackground', '#f9fafb'),
        text: isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor,
        textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${primaryColor}60`,
        accent: getColor('accent', '#f59e0b'),
        border: getColor('borderColor', '#e5e7eb'),
        hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : primaryColor,
    };

    // Check if user has completed all quizzes
    const hasCompletedAllQuizzes = myStatus?.has_completed_all ?? false;
    const completedQuizzes = myStatus?.completed_quizzes ?? 0;
    const totalQuizzes = myStatus?.total_quizzes ?? 0;
    const pendingQuizzes = myStatus?.pending_quizzes ?? 0;
    const temporaryScore = myStatus?.average_score ?? 0;

    // Debug pagination
    console.log('🏆 Ranking Pagination:', {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        perPage: pagination.perPage,
        totalUsers: pagination.totalUsers,
        rankingLength: ranking.length
    });

    useEffect(() => {
        if (isOpen && pagination.userPage && pagination.currentPage === 1) {
            goToUserPage();
        }
    }, [isOpen, pagination.userPage, pagination.currentPage, goToUserPage]);

    const renderPageNumbers = () => {
        const pages = [];
        const totalPages = pagination.totalPages;
        const currentPage = pagination.currentPage;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (currentPage <= 3) endPage = Math.min(5, totalPages);
        if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            pages.push(
                <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className="px-3 py-1 rounded text-sm font-semibold transition-all border"
                    style={{
                        backgroundColor: isActive ? primaryColor : pageColors.bg,
                        borderColor: isActive ? primaryColor : pageColors.border,
                        color: isActive ? '#ffffff' : pageColors.text
                    }}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    // Incomplete warning
    const IncompleteWarning = () => {
        if (hasCompletedAllQuizzes || completedQuizzes === 0) return null;
        
        return (
            <div 
                className="p-4 rounded-lg flex items-start gap-3"
                style={{ 
                    backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : '#fffbeb',
                    border: `1px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.3)' : '#fcd34d'}`
                }}
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: pageColors.accent }} />
                <div>
                    <p className="font-medium text-sm" style={{ color: isDarkMode ? '#fbbf24' : '#b45309' }}>
                        {t('ranking.incompleteTitle', 'Nota Media Provisional')}
                    </p>
                    <p className="text-xs mt-1" style={{ color: isDarkMode ? '#fcd34d' : '#92400e' }}>
                        Has completado {completedQuizzes} de {totalQuizzes} tests. Tu nota provisional es {formatScore(temporaryScore)}, pero no aparecerás en el ranking hasta completar todos.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Small Trigger Button - Top Right */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 text-sm font-medium border"
                    style={{ 
                        backgroundColor: pageColors.bg,
                        borderColor: pageColors.border,
                        color: pageColors.text
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                        e.currentTarget.style.borderColor = pageColors.hoverBg;
                        e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = pageColors.bg;
                        e.currentTarget.style.borderColor = pageColors.border;
                        e.currentTarget.style.color = pageColors.text;
                    }}
                >
                    <Trophy className="w-4 h-4" />
                    <span>{t('ranking.ranking', 'Ranking')}</span>
                    {myStats && hasCompletedAllQuizzes && (
                        <span 
                            className="px-1.5 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: pageColors.hoverBg, color: '#fff' }}
                        >
                            #{myStats.position}
                        </span>
                    )}
                </button>
            </div>

            {/* Full Page View - Slides from right */}
            <div 
                className={`absolute inset-0 z-20 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ backgroundColor: pageColors.bgSecondary }}
            >
                {/* Header - Same style as QuizGeneratorPage */}
                <div 
                    className="rounded-t-lg overflow-hidden border"
                    style={{ 
                        backgroundColor: pageColors.bg,
                        borderColor: pageColors.border
                    }}
                >
                    <div 
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ backgroundColor: isDarkMode ? pageColors.accent : primaryColor }}
                    >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/20"
                            >
                                <ChevronLeft className="w-5 h-5 text-white" />
                            </button>
                            <Trophy className="w-5 h-5 text-white flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-white truncate">
                                    {t('ranking.courseRanking', 'Ranking del Curso')}
                                </h3>
                                <p className="text-xs text-white/70 truncate">{courseName}</p>
                            </div>
                        </div>
                        
                        {/* Toggle Risk in header */}
                        <button
                            onClick={toggleRisk}
                            className="px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5"
                            style={{
                                backgroundColor: withRisk ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                                color: '#ffffff'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.85';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                            }}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ffffff' }} />
                            {withRisk ? 'Con Riesgo' : 'Sin Riesgo'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="h-[calc(100%-56px)] overflow-y-auto p-4">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {loading && !ranking.length ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div 
                                        className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3"
                                        style={{ borderColor: primaryColor }}
                                    />
                                    <p className="text-sm" style={{ color: pageColors.textMuted }}>Cargando...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div 
                                className="p-4 rounded-lg"
                                style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
                            >
                                <p className="font-medium text-red-600">Error al cargar el ranking</p>
                                <p className="text-sm text-red-500">{error}</p>
                            </div>
                        ) : (
                            <>
                                {/* Warning + Stats Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* Warning takes full width on mobile, 2 cols on desktop */}
                                    {!hasCompletedAllQuizzes && completedQuizzes > 0 && (
                                        <div className="lg:col-span-2">
                                            <IncompleteWarning />
                                        </div>
                                    )}
                                    
                                    {/* Stats */}
                                    <div className={`grid grid-cols-3 gap-2 ${!hasCompletedAllQuizzes && completedQuizzes > 0 ? '' : 'lg:col-span-3'}`}>
                                        <div 
                                            className="rounded-lg p-3 text-center border"
                                            style={{ backgroundColor: pageColors.bg, borderColor: pageColors.border }}
                                        >
                                            <Users size={16} className="mx-auto mb-1" style={{ color: primaryColor }} />
                                            <p className="text-[10px]" style={{ color: pageColors.textMuted }}>Total</p>
                                            <p className="font-bold" style={{ color: pageColors.text }}>{statistics?.total_users || 0}</p>
                                        </div>
                                        <div 
                                            className="rounded-lg p-3 text-center border"
                                            style={{ backgroundColor: pageColors.bg, borderColor: pageColors.border }}
                                        >
                                            <TrendingUp size={16} className="mx-auto mb-1" style={{ color: '#10b981' }} />
                                            <p className="text-[10px]" style={{ color: pageColors.textMuted }}>Media</p>
                                            <p className="font-bold" style={{ color: pageColors.text }}>
                                                {formatScore(withRisk ? statistics?.avg_score_with_risk : statistics?.avg_score_without_risk)}
                                            </p>
                                        </div>
                                        <div 
                                            className="rounded-lg p-3 text-center"
                                            style={{ 
                                                backgroundColor: pageColors.bg, 
                                                border: myStats && hasCompletedAllQuizzes ? `2px solid ${primaryColor}` : `1px dashed ${pageColors.border}`
                                            }}
                                        >
                                            {myStats && hasCompletedAllQuizzes ? (
                                                <>
                                                    <Trophy size={16} className="mx-auto mb-1" style={{ color: primaryColor }} />
                                                    <p className="text-[10px]" style={{ color: pageColors.textMuted }}>Tu Posición</p>
                                                    <p className="font-bold" style={{ color: primaryColor }}>
                                                        #{withRisk ? myStats.position_with_risk : myStats.position_without_risk}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={16} className="mx-auto mb-1" style={{ color: pageColors.textMuted }} />
                                                    <p className="text-[10px]" style={{ color: pageColors.textMuted }}>Provisional</p>
                                                    <p className="font-bold" style={{ color: pageColors.textMuted }}>
                                                        {completedQuizzes > 0 ? formatScore(temporaryScore) : '-'}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ranking Table */}
                                <div 
                                    className="rounded-lg border overflow-hidden"
                                    style={{ backgroundColor: pageColors.bg, borderColor: pageColors.border }}
                                >
                                    <table className="w-full">
                                        <thead>
                                            <tr style={{ backgroundColor: `${primaryColor}08` }}>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>#</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Usuario</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Sin Riesgo</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Con Riesgo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ranking.map((user, idx) => {
                                                const isCurrentUser = user.is_current_user;
                                                const positionColor = 
                                                    user.position === 1 ? '#eab308' :
                                                    user.position === 2 ? '#9ca3af' :
                                                    user.position === 3 ? '#f97316' :
                                                    pageColors.text;

                                                return (
                                                    <tr
                                                        key={user.user_id}
                                                        className="border-t transition-colors"
                                                        style={{
                                                            borderColor: pageColors.border,
                                                            backgroundColor: isCurrentUser 
                                                                ? `${primaryColor}08`
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1">
                                                                {user.position <= 3 && (
                                                                    <Trophy className="w-4 h-4" style={{ color: positionColor }} />
                                                                )}
                                                                <span className="font-bold" style={{ color: positionColor }}>
                                                                    {user.position}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <img
                                                                    src={user.avatar_url}
                                                                    alt=""
                                                                    className="w-8 h-8 rounded-full"
                                                                />
                                                                <span 
                                                                    className="font-medium"
                                                                    style={{ color: isCurrentUser ? primaryColor : pageColors.text }}
                                                                >
                                                                    {user.display_name}
                                                                    {isCurrentUser && (
                                                                        <span 
                                                                            className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                                                                            style={{ backgroundColor: primaryColor, color: '#fff' }}
                                                                        >
                                                                            Tú
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span 
                                                                className={`font-bold ${!withRisk ? 'underline decoration-2' : ''}`}
                                                                style={{ 
                                                                    color: isCurrentUser ? primaryColor : pageColors.text,
                                                                    textDecorationColor: '#10b981'
                                                                }}
                                                            >
                                                                {formatScore(user.score_without_risk ?? 0)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span 
                                                                className={`font-bold ${withRisk ? 'underline decoration-2' : ''}`}
                                                                style={{ 
                                                                    color: isCurrentUser ? primaryColor : pageColors.text,
                                                                    textDecorationColor: pageColors.accent
                                                                }}
                                                            >
                                                                {formatScore(user.score_with_risk ?? 0)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {ranking.length === 0 && !loading && (
                                        <div className="text-center py-8">
                                            <Trophy className="w-10 h-10 mx-auto mb-3" style={{ color: pageColors.border }} />
                                            <p className="font-medium" style={{ color: pageColors.textMuted }}>
                                                No hay usuarios en el ranking
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination - always show if there are users */}
                                {pagination.totalUsers > 0 && (
                                    <div 
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                        style={{ backgroundColor: pageColors.bg, borderColor: pageColors.border }}
                                    >
                                        <span className="text-sm" style={{ color: pageColors.textMuted }}>
                                            {((pagination.currentPage - 1) * pagination.perPage) + 1}-{Math.min(pagination.currentPage * pagination.perPage, pagination.totalUsers)} de {pagination.totalUsers}
                                            {pagination.totalPages > 1 && ` (Página ${pagination.currentPage} de ${pagination.totalPages})`}
                                        </span>
                                        {pagination.totalPages > 1 && (
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={firstPage} 
                                                    disabled={pagination.currentPage === 1} 
                                                    className="p-1.5 rounded border disabled:opacity-30 transition-all hover:bg-gray-100"
                                                    style={{ 
                                                        color: pageColors.text,
                                                        borderColor: pageColors.border,
                                                        backgroundColor: pageColors.bg
                                                    }}
                                                >
                                                    <ChevronsLeft className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={prevPage} 
                                                    disabled={pagination.currentPage === 1} 
                                                    className="p-1.5 rounded border disabled:opacity-30 transition-all hover:bg-gray-100"
                                                    style={{ 
                                                        color: pageColors.text,
                                                        borderColor: pageColors.border,
                                                        backgroundColor: pageColors.bg
                                                    }}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <div className="flex gap-1">{renderPageNumbers()}</div>
                                                <button 
                                                    onClick={nextPage} 
                                                    disabled={pagination.currentPage === pagination.totalPages} 
                                                    className="p-1.5 rounded border disabled:opacity-30 transition-all hover:bg-gray-100"
                                                    style={{ 
                                                        color: pageColors.text,
                                                        borderColor: pageColors.border,
                                                        backgroundColor: pageColors.bg
                                                    }}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={lastPage} 
                                                    disabled={pagination.currentPage === pagination.totalPages} 
                                                    className="p-1.5 rounded border disabled:opacity-30 transition-all hover:bg-gray-100"
                                                    style={{ 
                                                        color: pageColors.text,
                                                        borderColor: pageColors.border,
                                                        backgroundColor: pageColors.bg
                                                    }}
                                                >
                                                    <ChevronsRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CourseRankingPanel;
