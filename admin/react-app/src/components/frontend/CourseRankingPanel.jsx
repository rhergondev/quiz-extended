import React, { useEffect, useState, createContext, useContext } from 'react';
import { Trophy, TrendingUp, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useCourseRanking } from '../../hooks/useCourseRanking';
import { useTranslation } from 'react-i18next';

// Context para compartir estado entre Trigger y Panel
const RankingContext = createContext(null);

// Hook para usar el contexto
const useRankingContext = () => {
    const context = useContext(RankingContext);
    if (!context) {
        throw new Error('useRankingContext must be used within CourseRankingProvider');
    }
    return context;
};

// Provider que maneja el estado y los datos del ranking
export const CourseRankingProvider = ({ courseId, courseName, isOpen, onOpen, onClose, children }) => {
    const { t } = useTranslation();
    const { getColor, isDarkMode } = useTheme();
    const { formatScore } = useScoreFormat();
    
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

    const primaryColor = getColor('primary', '#1a202c');
    
    const pageColors = {
        bg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
        bgSecondary: getColor('secondaryBackground', '#f9fafb'),
        text: isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor,
        textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${primaryColor}60`,
        accent: getColor('accent', '#f59e0b'),
        border: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
        // Main container border - accent in dark mode for consistency
        containerBorder: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb'),
        hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : primaryColor,
        iconColor: isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor,
        positionColor: isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor,
        userNameColor: isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor,
    };

    const completedQuizzes = myStatus?.completed_quizzes ?? 0;
    const totalQuizzes = myStatus?.total_quizzes ?? 0;
    const userScore = myStatus?.average_score ?? 0;
    const userPosition = myStatus?.position ?? null;

    useEffect(() => {
        if (isOpen && pagination.userPage && pagination.currentPage === 1) {
            goToUserPage();
        }
    }, [isOpen, pagination.userPage, pagination.currentPage, goToUserPage]);

    const value = {
        t,
        isDarkMode,
        formatScore,
        primaryColor,
        pageColors,
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
        goToUserPage,
        completedQuizzes,
        totalQuizzes,
        userScore,
        userPosition,
        courseId,
        courseName,
        isOpen,
        onOpen,
        onClose,
    };

    return (
        <RankingContext.Provider value={value}>
            {children}
        </RankingContext.Provider>
    );
};

// Componente Trigger Button (se coloca en la lista de tests)
export const CourseRankingTrigger = () => {
    const { 
        t, 
        isDarkMode,
        pageColors, 
        myStats,
        userPosition,
        completedQuizzes,
        withRisk,
        onOpen 
    } = useRankingContext();

    // Button colors (same as CourseCard)
    const buttonBg = isDarkMode ? pageColors.accent : pageColors.hoverBg;
    const buttonText = isDarkMode ? pageColors.bgSecondary : '#ffffff';
    const buttonHoverBg = isDarkMode ? pageColors.hoverBg : pageColors.accent;

    return (
        <div className="flex justify-end mb-4">
            <button
                onClick={onOpen}
                className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                style={{ 
                    backgroundColor: buttonBg,
                    color: buttonText
                }}
                onMouseEnter={(e) => {
                    if (isDarkMode) {
                        e.currentTarget.style.filter = 'brightness(1.15)';
                    } else {
                        e.currentTarget.style.backgroundColor = buttonHoverBg;
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.backgroundColor = buttonBg;
                }}
            >
                <Trophy className="w-4 h-4" />
                <span>{t('ranking.ranking', 'Ranking')}</span>
                {completedQuizzes > 0 && (myStats || userPosition) && (
                    <span 
                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: buttonText }}
                    >
                        #{withRisk ? myStats?.position_with_risk : myStats?.position_without_risk || userPosition}
                    </span>
                )}
            </button>
        </div>
    );
};

// Componente Panel (se coloca como hermano del Test Viewer)
export const CourseRankingSlidePanel = () => {
    const {
        t,
        isDarkMode,
        formatScore,
        primaryColor,
        pageColors,
        loading,
        error,
        ranking,
        statistics,
        myStats,
        pagination,
        withRisk,
        toggleRisk,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        completedQuizzes,
        totalQuizzes,
        userScore,
        userPosition,
        courseName,
        isOpen,
        onClose,
    } = useRankingContext();

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

    // Componente para mostrar progreso del usuario
    const UserProgressInfo = () => {
        if (completedQuizzes === totalQuizzes || completedQuizzes === 0) return null;
        
        return (
            <div 
                className="p-4 rounded-lg flex items-start gap-3"
                style={{ 
                    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                    border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#93c5fd'}`
                }}
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
                <div>
                    <p className="font-medium text-sm" style={{ color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
                        {t('ranking.progressInfo', 'Progreso en el curso')}
                    </p>
                    <p className="text-xs mt-1" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>
                        Has completado {completedQuizzes} de {totalQuizzes} tests. Tu nota media actual es {formatScore(userScore)}.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div 
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ backgroundColor: pageColors.bgSecondary }}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div 
                    className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b"
                    style={{ 
                        backgroundColor: pageColors.bg,
                        borderColor: pageColors.border
                    }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}10` }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.2)' : `${primaryColor}20`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}10`;
                            }}
                        >
                            <ChevronLeft className="w-5 h-5" style={{ color: pageColors.text }} />
                        </button>
                        <Trophy className="w-5 h-5" style={{ color: isDarkMode ? pageColors.accent : primaryColor }} />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold truncate" style={{ color: pageColors.text }}>
                                {t('ranking.courseRanking', 'Ranking del Curso')}
                            </h3>
                            <p className="text-xs truncate" style={{ color: pageColors.textMuted }}>{courseName}</p>
                        </div>
                    </div>
                    
                    {/* Remove toggle button from header - now showing both modes */}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
                        <div className="space-y-4">
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
                                    style={{ 
                                        backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', 
                                        border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}` 
                                    }}
                                >
                                    <p className="font-medium" style={{ color: '#ef4444' }}>Error al cargar el ranking</p>
                                    <p className="text-sm" style={{ color: isDarkMode ? '#fca5a5' : '#dc2626' }}>{error}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Progress Info (if not all quizzes completed) */}
                                    {completedQuizzes > 0 && completedQuizzes < totalQuizzes && (
                                        <UserProgressInfo />
                                    )}

                                    {/* Estadísticas del Curso */}
                                    <div 
                                        className="rounded-xl overflow-hidden border-2"
                                        style={{ 
                                            backgroundColor: pageColors.bg,
                                            borderColor: pageColors.containerBorder
                                        }}
                                    >
                                        {/* Header */}
                                        <div 
                                            className="px-4 py-2 flex items-center gap-2"
                                            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}08` }}
                                        >
                                            <Users size={14} style={{ color: pageColors.iconColor }} />
                                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
                                                Estadísticas del Curso
                                            </span>
                                        </div>
                                        
                                        {/* Stats Grid */}
                                        <div 
                                            className="grid grid-cols-3"
                                            style={{ 
                                                '--tw-divide-x-reverse': 0,
                                            }}
                                        >
                                            <div 
                                                className="p-3 text-center"
                                                style={{ borderRight: `1px solid ${pageColors.border}` }}
                                            >
                                                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: pageColors.textMuted }}>
                                                    Usuarios
                                                </p>
                                                <p className="text-xl font-bold" style={{ color: pageColors.text }}>
                                                    {statistics?.total_users || 0}
                                                </p>
                                            </div>
                                            <div 
                                                className="p-3 text-center"
                                                style={{ borderRight: `1px solid ${pageColors.border}` }}
                                            >
                                                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: pageColors.textMuted }}>
                                                    Media Sin Riesgo
                                                </p>
                                                <p className="text-xl font-bold" style={{ color: isDarkMode ? pageColors.text : primaryColor }}>
                                                    {formatScore(statistics?.avg_score_without_risk || 0)}
                                                </p>
                                            </div>
                                            <div className="p-3 text-center">
                                                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: pageColors.textMuted }}>
                                                    Media Con Riesgo
                                                </p>
                                                <p className="text-xl font-bold" style={{ color: pageColors.accent }}>
                                                    {formatScore(statistics?.avg_score_with_risk || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mis Estadísticas - Unificado */}
                                    {completedQuizzes > 0 && (
                                        <div 
                                            className="rounded-xl overflow-hidden border-2"
                                            style={{ 
                                                backgroundColor: pageColors.bg,
                                                borderColor: pageColors.containerBorder
                                            }}
                                        >
                                            {/* Header */}
                                            <div 
                                                className="px-4 py-2 flex items-center gap-2"
                                                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}08` }}
                                            >
                                                <Trophy size={14} style={{ color: isDarkMode ? pageColors.accent : primaryColor }} />
                                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
                                                    Mis Estadísticas
                                                </span>
                                            </div>
                                            
                                            {/* Sin Riesgo Row */}
                                            <div>
                                                {/* Header Sin Riesgo */}
                                                <div 
                                                    className="px-4 py-2"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ffffff' }}>
                                                            Sin Riesgo
                                                        </span>
                                                        <div 
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: '#ffffff' }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Contenido Sin Riesgo */}
                                                <div className="grid grid-cols-3 gap-4 px-4 py-3">
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Posición
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: pageColors.text }}>
                                                            #{myStats?.position_without_risk || userPosition || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Mi Media
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: pageColors.text }}>
                                                            {formatScore(myStats?.score_without_risk || userScore || 0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Percentil
                                                        </p>
                                                        {(() => {
                                                            const percentile = (myStats?.score_without_risk || userScore || 0) - (statistics?.avg_score_without_risk || 0);
                                                            return (
                                                                <p 
                                                                    className="text-lg font-bold"
                                                                    style={{ color: percentile >= 0 ? '#10b981' : '#ef4444' }}
                                                                >
                                                                    {percentile >= 0 ? '+' : ''}{formatScore(percentile)}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Separador */}
                                            <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />
                                            
                                            {/* Con Riesgo Row */}
                                            <div>
                                                {/* Header Con Riesgo */}
                                                <div 
                                                    className="px-4 py-2"
                                                    style={{ backgroundColor: pageColors.accent }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ffffff' }}>
                                                            Con Riesgo
                                                        </span>
                                                        <div 
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: '#ffffff' }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Contenido Con Riesgo */}
                                                <div className="grid grid-cols-3 gap-4 px-4 py-3">
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Posición
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: pageColors.accent }}>
                                                            #{myStats?.position_with_risk || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Mi Media
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: pageColors.accent }}>
                                                            {formatScore(myStats?.score_with_risk || 0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                                                            Percentil
                                                        </p>
                                                        {(() => {
                                                            const percentile = (myStats?.score_with_risk || 0) - (statistics?.avg_score_with_risk || 0);
                                                            return (
                                                                <p 
                                                                    className="text-lg font-bold"
                                                                    style={{ color: percentile >= 0 ? '#10b981' : '#ef4444' }}
                                                                >
                                                                    {percentile >= 0 ? '+' : ''}{formatScore(percentile)}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ranking Table */}
                                    <div 
                                        className="rounded-xl border-2 overflow-hidden"
                                        style={{ backgroundColor: pageColors.bg, borderColor: pageColors.containerBorder }}
                                    >
                                        <table className="w-full">
                                            <thead>
                                                <tr style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}08` }}>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>#</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Usuario</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Sin Riesgo</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>Con Riesgo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ranking.map((user) => {
                                                    const isCurrentUser = user.is_current_user;
                                                    const positionColor = 
                                                        user.position === 1 ? '#eab308' :
                                                        user.position === 2 ? '#9ca3af' :
                                                        user.position === 3 ? '#f97316' :
                                                        pageColors.text;

                                                    const currentUserColor = isDarkMode ? pageColors.accent : primaryColor;

                                                    return (
                                                        <tr
                                                            key={user.user_id}
                                                            className="border-t transition-colors"
                                                            style={{
                                                                borderColor: pageColors.border,
                                                                backgroundColor: isCurrentUser 
                                                                    ? isDarkMode ? 'rgba(245, 158, 11, 0.1)' : `${primaryColor}08`
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
                                                                        style={{ color: isCurrentUser ? currentUserColor : pageColors.text }}
                                                                    >
                                                                        {user.display_name}
                                                                        {isCurrentUser && (
                                                                            <span 
                                                                                className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                                                                                style={{ 
                                                                                    backgroundColor: isDarkMode ? pageColors.accent : primaryColor, 
                                                                                    color: '#fff' 
                                                                                }}
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
                                                                        color: isCurrentUser ? currentUserColor : pageColors.text,
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
                                                                        color: isCurrentUser ? currentUserColor : pageColors.text,
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

                                    {/* Pagination */}
                                    {pagination.totalUsers > 0 && (
                                        <div 
                                            className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg border-2 gap-2"
                                            style={{ backgroundColor: pageColors.bg, borderColor: pageColors.containerBorder }}
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
                                                        className="p-1.5 rounded border disabled:opacity-30 transition-all"
                                                        style={{ 
                                                            color: pageColors.text,
                                                            borderColor: pageColors.border,
                                                            backgroundColor: pageColors.bg
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (pagination.currentPage !== 1) {
                                                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = pageColors.bg;
                                                        }}
                                                    >
                                                        <ChevronsLeft className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={prevPage} 
                                                        disabled={pagination.currentPage === 1} 
                                                        className="p-1.5 rounded border disabled:opacity-30 transition-all"
                                                        style={{ 
                                                            color: pageColors.text,
                                                            borderColor: pageColors.border,
                                                            backgroundColor: pageColors.bg
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (pagination.currentPage !== 1) {
                                                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = pageColors.bg;
                                                        }}
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex gap-1">{renderPageNumbers()}</div>
                                                    <button 
                                                        onClick={nextPage} 
                                                        disabled={pagination.currentPage === pagination.totalPages} 
                                                        className="p-1.5 rounded border disabled:opacity-30 transition-all"
                                                        style={{ 
                                                            color: pageColors.text,
                                                            borderColor: pageColors.border,
                                                            backgroundColor: pageColors.bg
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (pagination.currentPage !== pagination.totalPages) {
                                                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = pageColors.bg;
                                                        }}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={lastPage} 
                                                        disabled={pagination.currentPage === pagination.totalPages} 
                                                        className="p-1.5 rounded border disabled:opacity-30 transition-all"
                                                        style={{ 
                                                            color: pageColors.text,
                                                            borderColor: pageColors.border,
                                                            backgroundColor: pageColors.bg
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (pagination.currentPage !== pagination.totalPages) {
                                                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = pageColors.bg;
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
            </div>
        </div>
    );
};

// Componente principal que incluye todo (para compatibilidad con uso simple)
const CourseRankingPanel = ({ courseId, courseName, isOpen, onOpen, onClose }) => {
    // Estado interno solo si no se controla externamente
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    
    // Usar estado externo si está disponible, sino interno
    const isControlled = isOpen !== undefined;
    const showPanel = isControlled ? isOpen : internalIsOpen;
    const handleOpen = isControlled ? onOpen : () => setInternalIsOpen(true);
    const handleClose = isControlled ? onClose : () => setInternalIsOpen(false);

    return (
        <CourseRankingProvider
            courseId={courseId}
            courseName={courseName}
            isOpen={showPanel}
            onOpen={handleOpen}
            onClose={handleClose}
        >
            <CourseRankingTrigger />
            <CourseRankingSlidePanel />
        </CourseRankingProvider>
    );
};

export default CourseRankingPanel;
