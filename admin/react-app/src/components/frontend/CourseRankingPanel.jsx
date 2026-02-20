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
    const totalUsersInRanking = myStatus?.total_users ?? statistics?.total_users ?? null;

    useEffect(() => {
        if (isOpen) {
            firstPage();
        }
    }, [isOpen]);

    const value = {
        t,
        isDarkMode,
        getColor,
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
        totalUsersInRanking,
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
        totalUsersInRanking,
        completedQuizzes,
        withRisk,
        onOpen 
    } = useRankingContext();

    // Button colors (same as CourseCard)
    const buttonBg = isDarkMode ? pageColors.accent : pageColors.hoverBg;
    const buttonText = isDarkMode ? pageColors.bgSecondary : '#ffffff';
    const buttonHoverBg = isDarkMode ? pageColors.hoverBg : pageColors.accent;

    const currentPosition = withRisk ? myStats?.position_with_risk : myStats?.position_without_risk || userPosition;

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
                {completedQuizzes > 0 && currentPosition && (
                    <span 
                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: buttonText }}
                    >
                        #{currentPosition}{totalUsersInRanking ? `/${totalUsersInRanking}` : ''}
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
        getColor,
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
                        color: isActive ? '#ffffff' : (isDarkMode ? '#ffffff' : primaryColor)
                    }}
                >
                    {i}
                </button>
            );
        }
        return pages;
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
                        <h3 className="text-sm font-bold flex items-center" style={{ color: pageColors.text }}>
                            {t('ranking.courseRanking', 'Ranking del Curso')}
                        </h3>
                    </div>
                    
                    {/* Remove toggle button from header - now showing both modes */}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-6xl mx-auto px-4 pt-6 pb-12">
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
                                    {/* Contenedor principal con fondo de color */}
                                    <div 
                                        className="rounded-2xl overflow-hidden p-4"
                                        style={{ 
                                            backgroundColor: getColor('background', '#ffffff'),
                                            border: isDarkMode ? '1px solid #ffffff' : 'none'
                                        }}
                                    >
                                    {/* Grid de Estadísticas: Curso y Mis Estadísticas lado a lado */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                                        {/* Estadísticas del Curso */}
                                        <div 
                                            className="rounded-xl overflow-hidden p-4"
                                            style={{ 
                                                backgroundColor: getColor('background', '#ffffff')
                                            }}
                                        >
                                        <div className="mb-3">
                                        {/* Título Principal */}
                                        <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-center" style={{ color: isDarkMode ? '#ffffff' : primaryColor }}>
                                            Medias del curso
                                        </h3>
                                        
                                        {/* Espaciador para alinear con "Sin Arriesgar" */}
                                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'transparent' }}>
                                            &nbsp;
                                        </p>
                                        
                                        {/* Stats en un solo cajón */}
                                        <div
                                            className="mx-3"
                                            style={{
                                                backgroundColor: primaryColor,
                                                border: isDarkMode ? '1px solid #ffffff' : 'none',
                                                borderRadius: '0.75rem',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div className="grid grid-cols-3 px-4 py-2">
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                        Usuarios
                                                    </p>
                                                    <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                        {statistics?.total_users || 0}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                        Sin Arriesgar
                                                    </p>
                                                    <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                        {formatScore(statistics?.avg_score_without_risk || 0)}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                        Arriesgando
                                                    </p>
                                                    <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                        {formatScore(statistics?.avg_score_with_risk || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nota de corte */}
                                        {(statistics?.top_20_cutoff_without_risk > 0 || statistics?.top_20_cutoff_with_risk > 0) && (
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: isDarkMode ? '#ffffff' : primaryColor }}>
                                                    Nota de corte
                                                </p>
                                                <div
                                                    className="mx-3"
                                                    style={{
                                                        backgroundColor: primaryColor,
                                                        border: isDarkMode ? '1px solid #ffffff' : 'none',
                                                        borderRadius: '0.75rem',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <div className="grid grid-cols-3 px-4 py-2">
                                                        <div className="text-center">
                                                            <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                                &nbsp;
                                                            </p>
                                                            <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                                Top 20%
                                                            </p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                                Sin Arriesgar
                                                            </p>
                                                            <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                                {formatScore(statistics?.top_20_cutoff_without_risk || 0)}
                                                            </p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                                Arriesgando
                                                            </p>
                                                            <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                                {formatScore(statistics?.top_20_cutoff_with_risk || 0)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </div>

                                        {/* Mis Estadísticas - Unificado */}
                                        {completedQuizzes > 0 && (
                                            <div 
                                                className="rounded-xl overflow-hidden p-4"
                                                style={{ 
                                                    backgroundColor: getColor('background', '#ffffff')
                                                }}
                                            >
                                            {/* Título Principal */}
                                            <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-center" style={{ color: isDarkMode ? '#ffffff' : primaryColor }}>
                                                Tus medias - Uniforme Azul
                                            </h3>
                                            
                                            {/* Sin Arriesgar Row */}
                                            <div className="mb-3">
                                                {/* Header fuera del fondo de color */}
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: isDarkMode ? '#ffffff' : primaryColor }}>
                                                    Sin Arriesgar
                                                </p>
                                                {/* Tabla con fondo de color y margen */}
                                                <div
                                                    className="mx-3"
                                                    style={{
                                                        backgroundColor: primaryColor,
                                                        border: isDarkMode ? '1px solid #ffffff' : 'none',
                                                        borderRadius: '0.75rem',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                {/* Contenido Sin Arriesgar */}
                                                <div className="grid grid-cols-3 px-4 py-2">
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Posición
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                            #{myStats?.position_without_risk || userPosition || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Mi Media
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                            {formatScore(myStats?.score_without_risk || userScore || 0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Percentil
                                                        </p>
                                                        {(() => {
                                                            const percentile = (myStats?.score_without_risk || userScore || 0) - (statistics?.avg_score_without_risk || 0);
                                                            return (
                                                                <p 
                                                                    className="text-lg font-bold"
                                                                    style={{ color: '#ffffff' }}
                                                                >
                                                                    {percentile >= 0 ? '+' : ''}{formatScore(percentile)}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                </div>
                                            </div>
                                            
                                            {/* Arriesgando Row */}
                                            <div>
                                                {/* Header fuera del fondo de color */}
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: isDarkMode ? '#ffffff' : primaryColor }}>
                                                    Arriesgando
                                                </p>
                                                {/* Tabla con fondo de color y margen */}
                                                <div
                                                    className="mx-3"
                                                    style={{
                                                        backgroundColor: primaryColor,
                                                        border: isDarkMode ? '1px solid #ffffff' : 'none',
                                                        borderRadius: '0.75rem',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                {/* Contenido Arriesgando */}
                                                <div className="grid grid-cols-3 px-4 py-2">
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Posición
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                            #{myStats?.position_with_risk || '-'}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Mi Media
                                                        </p>
                                                        <p className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                                            {formatScore(myStats?.score_with_risk || 0)}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] uppercase tracking-wide mb-0.5 font-bold" style={{ color: isDarkMode ? pageColors.accent : '#ffffff' }}>
                                                            Percentil
                                                        </p>
                                                        {(() => {
                                                            const percentile = (myStats?.score_with_risk || 0) - (statistics?.avg_score_with_risk || 0);
                                                            return (
                                                                <p 
                                                                    className="text-lg font-bold"
                                                                    style={{ color: '#ffffff' }}
                                                                >
                                                                    {percentile >= 0 ? '+' : ''}{formatScore(percentile)}
                                                                </p>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                        )}
                                    </div>

                                    {/* Sin Riesgo / Con Riesgo toggle */}
                                    <div className="flex justify-end mt-4 mb-1">
                                        <button
                                            onClick={toggleRisk}
                                            className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
                                            style={{
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : (withRisk ? pageColors.accent : primaryColor),
                                                color: '#ffffff',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                            }}
                                        >
                                            {withRisk ? 'Con Riesgo' : 'Sin Riesgo'}
                                        </button>
                                    </div>

                                    {/* Ranking Table */}
                                    <div
                                        className="rounded-xl overflow-hidden mt-3"
                                        style={{
                                            backgroundColor: getColor('background', '#ffffff'),
                                            border: isDarkMode ? '1px solid #ffffff' : 'none'
                                        }}
                                    >
                                        <table className="w-full" style={{ backgroundColor: isDarkMode ? '#000000' : '#ffffff' }}>
                                            <colgroup>
                                                <col style={{ width: '56px' }} />
                                                <col />
                                                <col style={{ width: '130px' }} />
                                            </colgroup>
                                            <thead>
                                                <tr style={{ backgroundColor: '#000000' }}>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#ffffff' }}>#</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#ffffff' }}>Usuario</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: withRisk ? pageColors.accent : '#ffffff' }}>
                                                        {withRisk ? 'Con Riesgo' : 'Sin Riesgo'}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ranking.map((user, index) => {
                                                    const isCurrentUser = user.is_current_user;
                                                    const isLastRow = index === ranking.length - 1;
                                                    const position = withRisk
                                                        ? (user.position_with_risk ?? user.position)
                                                        : (user.position_without_risk ?? user.position);
                                                    const score = withRisk ? user.score_with_risk : user.score_without_risk;
                                                    const positionColor = isDarkMode ? '#ffffff' :
                                                        position === 1 ? '#eab308' :
                                                        position === 2 ? '#9ca3af' :
                                                        position === 3 ? '#f97316' :
                                                        pageColors.text;
                                                    const textColor = isDarkMode ? '#ffffff' : pageColors.text;

                                                    return (
                                                        <tr
                                                            key={user.user_id}
                                                            className={`transition-colors ${!isLastRow ? 'border-b' : ''}`}
                                                            style={{
                                                                borderColor: isDarkMode ? '#ffffff' : pageColors.border,
                                                                backgroundColor: isCurrentUser
                                                                    ? isDarkMode ? 'rgba(245, 158, 11, 0.1)' : `${primaryColor}08`
                                                                    : 'transparent'
                                                            }}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1">
                                                                    {position <= 3 && (
                                                                        <Trophy className="w-4 h-4" style={{ color: positionColor }} />
                                                                    )}
                                                                    <span className="font-bold" style={{ color: positionColor }}>
                                                                        {position}
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
                                                                    <span className="font-medium" style={{ color: textColor }}>
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
                                                                <span className="font-bold" style={{ color: textColor }}>
                                                                    {formatScore(score ?? 0)}
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
                                    </div>

                                    {/* Pagination */}
                                    {pagination.totalUsers > 0 && (
                                        <div 
                                            className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg gap-2"
                                            style={{ 
                                                backgroundColor: getColor('background', '#ffffff'),
                                                border: isDarkMode ? '1px solid #ffffff' : 'none'
                                            }}
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
