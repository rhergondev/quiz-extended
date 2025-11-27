import React from 'react';
import { X, Trophy, Loader, Calendar, ShieldAlert, Users, TrendingUp, Award } from 'lucide-react';
import { useQuizRanking } from '../../hooks/useQuizRanking';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const RankingRow = ({ rank, isCurrentUser, formatScore, isDarkMode, getColor }) => {
  const { position, display_name, avatar_url, score, score_with_risk, attempt_date } = rank;
  
  const formattedDate = new Date(attempt_date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Medal colors for top 3
  const getMedalColor = (pos) => {
    if (pos === 1) return '#FFD700'; // Gold
    if (pos === 2) return '#C0C0C0'; // Silver
    if (pos === 3) return '#CD7F32'; // Bronze
    return null;
  };

  const medalColor = getMedalColor(position);

  return (
    <li 
      className={`flex items-center p-3 rounded-lg transition-all ${
        isCurrentUser ? 'ring-2' : ''
      }`}
      style={{
        backgroundColor: isCurrentUser 
          ? (isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)')
          : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb'),
        ringColor: isCurrentUser ? getColor('primary', '#6366f1') : 'transparent'
      }}
    >
      {/* Position */}
      <div className="w-8 flex-shrink-0">
        {medalColor ? (
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md"
            style={{ backgroundColor: medalColor }}
          >
            {position}
          </div>
        ) : (
          <span 
            className="font-bold text-sm"
            style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
          >
            {position}
          </span>
        )}
      </div>
      
      {/* Avatar + Name */}
      <img 
        src={avatar_url} 
        alt={display_name} 
        className="w-8 h-8 rounded-full mx-3 border-2"
        style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
      />
      <div className="flex-1 min-w-0">
        <span 
          className="font-medium truncate block"
          style={{ color: isDarkMode ? '#f9fafb' : '#1f2937' }}
        >
          {display_name}
        </span>
        <div 
          className="flex items-center text-xs mt-0.5"
          style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
        >
          <Calendar className="w-3 h-3 mr-1" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Scores */}
      <div className="flex flex-col items-end">
        <span 
          className="font-bold text-lg"
          style={{ color: getColor('primary', '#6366f1') }}
        >
          {formatScore(score)}
        </span>
        <div 
          className="flex items-center text-xs mt-0.5"
          style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
          title="Puntuación con riesgo"
        >
          <ShieldAlert className="w-3 h-3 mr-1 text-red-500" />
          <span>{formatScore(score_with_risk ?? score)}</span>
        </div>
      </div>
    </li>
  );
};

const QuizRankingModal = ({ isOpen, onClose, quizId, quizTitle }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const { formatScore } = useScoreFormat();
  const { ranking, loading, error } = useQuizRanking(quizId);

  if (!isOpen) return null;

  const modalColors = {
    bg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgHeader: isDarkMode ? getColor('primary', '#1a202c') : getColor('primary', '#1a202c'),
    text: isDarkMode ? '#f9fafb' : '#1f2937',
    textMuted: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    cardBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: getColor('primary', '#6366f1') }} />
            <p style={{ color: modalColors.textMuted }}>{t('ranking.loading')}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div 
          className="p-6 rounded-lg text-center"
          style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }}
        >
          <p className="text-red-500 font-medium">{t('ranking.error')}</p>
          <p className="text-sm mt-2" style={{ color: modalColors.textMuted }}>{error}</p>
        </div>
      );
    }

    if (!ranking || (!ranking.top?.length && !ranking.relative?.length)) {
      return (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: modalColors.textMuted }} />
          <p className="text-lg font-medium" style={{ color: modalColors.text }}>
            {t('ranking.noData')}
          </p>
          <p className="text-sm mt-2" style={{ color: modalColors.textMuted }}>
            {t('ranking.noDataDescription')}
          </p>
        </div>
      );
    }

    const { top, relative, currentUser, statistics } = ranking;
    const currentUserId = currentUser?.id;

    // Combine rankings
    const allRanks = [...top];
    const topIds = new Set(top.map(r => r.user_id));
    
    relative.forEach(r => {
      if (!topIds.has(r.user_id)) {
        allRanks.push(r);
      }
    });

    allRanks.sort((a, b) => a.position - b.position);

    let displayList = [];
    let lastPos = 0;
    allRanks.forEach(rank => {
      if (lastPos > 0 && rank.position > lastPos + 1) {
        displayList.push({ isSeparator: true, id: `sep-${lastPos}` });
      }
      displayList.push(rank);
      lastPos = rank.position;
    });

    return (
      <>
        {/* Statistics */}
        {statistics && (
          <div className="mb-6">
            <div 
              className="grid grid-cols-3 gap-4 p-4 rounded-xl"
              style={{ backgroundColor: modalColors.cardBg }}
            >
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5" style={{ color: getColor('primary', '#6366f1') }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: getColor('primary', '#6366f1') }}>
                  {formatScore(statistics.avg_score_without_risk)}
                </div>
                <div className="text-xs" style={{ color: modalColors.textMuted }}>
                  {t('ranking.avgWithoutRisk')}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-500">
                  {formatScore(statistics.avg_score_with_risk)}
                </div>
                <div className="text-xs" style={{ color: modalColors.textMuted }}>
                  {t('ranking.avgWithRisk')}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5" style={{ color: modalColors.textMuted }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: modalColors.text }}>
                  {statistics.total_users}
                </div>
                <div className="text-xs" style={{ color: modalColors.textMuted }}>
                  {t('ranking.totalUsers')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ranking List */}
        <ul className="space-y-2">
          {displayList.map((rank) => {
            if (rank.isSeparator) {
              return (
                <li key={rank.id} className="flex justify-center items-center py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: modalColors.textMuted }}></div>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: modalColors.textMuted }}></div>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: modalColors.textMuted }}></div>
                  </div>
                </li>
              );
            }
            return (
              <RankingRow
                key={rank.user_id}
                rank={rank}
                isCurrentUser={currentUserId === rank.user_id}
                formatScore={formatScore}
                isDarkMode={isDarkMode}
                getColor={getColor}
              />
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl"
        style={{ backgroundColor: modalColors.bg }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: modalColors.bgHeader }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('ranking.title')}</h2>
              {quizTitle && (
                <p className="text-sm text-white/70 truncate max-w-[200px]">{quizTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default QuizRankingModal;
