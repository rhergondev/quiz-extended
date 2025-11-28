import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Award, Menu, X, Trophy } from 'lucide-react';
import ReviewedQuestion from './ReviewedQuestion';
import ResultsSidebar from './ResultsSidebar';
import { useTranslation } from 'react-i18next';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTheme } from '../../contexts/ThemeContext';

const QuizResults = ({ result, quizTitle, questions, noPadding = false }) => {
  const { t } = useTranslation();
  const { formatScore } = useScoreFormat();
  const { getColor, isDarkMode } = useTheme();
  const [isResultsSidebarOpen, setIsResultsSidebarOpen] = useState(false);

  const SUCCESS_COLOR = '#10b981';
  const ERROR_COLOR = '#ef4444';
  const GRAY_COLOR = isDarkMode ? '#9ca3af' : '#6b7280';

  // Dark mode aware colors - matching CourseRankingPanel
  const primaryColor = getColor('primary', '#3b82f6');
  const accentColor = getColor('accent', '#f59e0b');
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: accentColor,
    bg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}20`,
  };

  if (!result) {
    return (
      <div 
        className="text-center p-8"
        style={{ color: getColor('text', '#6b7280') }}
      >
        {t('quizzes.loadingResults')}
      </div>
    );
  }

  const { detailed_results, score, score_with_risk, average_score, average_score_with_risk } = result;

  const correctAnswers = detailed_results?.filter(r => r.is_correct).length || 0;
  const incorrectAnswers = detailed_results?.filter(r => !r.is_correct && r.answer_given !== null).length || 0;
  const unanswered = detailed_results?.filter(r => r.answer_given === null).length || 0;
  // is_risked indica si la pregunta fue contestada con riesgo activado
  const answeredWithRisk = detailed_results?.filter(r => r.is_risked && r.answer_given !== null).length || 0;
  const totalQuestions = detailed_results?.length || 0;

  const averageScore = average_score ?? null;
  const averageScoreWithRisk = average_score_with_risk ?? null;
  
  const percentil = averageScore !== null ? (score - averageScore).toFixed(2) : null;
  const percentilWithRisk = averageScoreWithRisk !== null ? (score_with_risk - averageScoreWithRisk).toFixed(2) : null;

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
      {/* Overlay para móvil */}
      {isResultsSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsResultsSidebarOpen(false)}
        />
      )}

      {/* Botón flotante para abrir sidebar en móvil */}
      <button
        onClick={() => setIsResultsSidebarOpen(true)}
        className="lg:hidden fixed bottom-14 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: getColor('primary', '#3b82f6'),
          color: '#ffffff'
        }}
        aria-label="Abrir resumen de resultados"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className={`flex-1 overflow-hidden ${noPadding ? '' : 'p-4'}`}>
        <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-col lg:flex-row-reverse gap-6">
          {/* Sidebar de resultados */}
          <aside className={`
            fixed lg:relative
            top-0 right-0 
            h-full lg:h-auto
            w-80 lg:w-80
            flex-shrink-0
            transition-transform duration-300
            z-50 lg:z-auto
            ${isResultsSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            ${noPadding ? 'lg:sticky lg:top-4' : ''}
          `}
          style={{
            backgroundColor: isResultsSidebarOpen ? getColor('background', '#ffffff') : 'transparent'
          }}
          >
            {/* Header del sidebar móvil */}
            <div className="lg:hidden flex items-center justify-between px-4 py-5 border-b" style={{
              borderColor: getColor('borderColor', '#e5e7eb')
            }}>
              <h3 className="font-bold text-xl" style={{ color: pageColors.text }}>
                {t('quizzes.results.summary')}
              </h3>
              <button
                onClick={() => setIsResultsSidebarOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: pageColors.text }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-88px)] lg:h-auto px-4 py-4 lg:p-0">
              <ResultsSidebar result={result} questions={questions} />
            </div>
          </aside>

          <main className={`flex-1 w-full lg:w-auto overflow-y-auto ${noPadding ? 'px-4 sm:px-6 lg:px-4 py-4 lg:py-4 pb-24 lg:pb-12' : 'px-4 lg:pr-4 py-4 lg:pb-8 pb-24'}`}>
        {/* Título responsive - visible solo en desktop */}
        <div 
          className={`hidden lg:block rounded-lg p-4 mb-4 shadow-sm ${noPadding ? 'mt-4' : ''}`}
          style={{
            backgroundColor: primaryColor,
          }}
        >
          <h2 
            className="text-xl font-bold"
            style={{ color: getColor('textColorContrast', '#ffffff') }}
          >
            {t('quizzes.results.title')}
          </h2>
        </div>

        {/* Resumen de respuestas - Compact */}
        <div 
          className={`rounded-xl overflow-hidden border-2 mb-4 ${noPadding ? 'mt-4 lg:mt-0' : ''}`}
          style={{ 
            backgroundColor: pageColors.bg,
            borderColor: pageColors.border
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-2 flex items-center gap-2 flex-wrap"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}08` }}
          >
            <Trophy size={14} style={{ color: isDarkMode ? pageColors.accent : primaryColor }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
              {t('quizzes.results.summary')}
            </span>
            {/* Question Stats inline */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto text-[10px] sm:text-xs">
              <span className="flex items-center gap-1" style={{ color: SUCCESS_COLOR }}>
                <CheckCircle size={12} />
                <span className="hidden sm:inline">{t('quizzes.results.correct')}</span> {correctAnswers}
              </span>
              <span className="flex items-center gap-1" style={{ color: GRAY_COLOR }}>
                <MinusCircle size={12} />
                <span className="hidden sm:inline">{t('quizzes.results.unanswered')}</span> {unanswered}
              </span>
              <span className="flex items-center gap-1" style={{ color: ERROR_COLOR }}>
                <XCircle size={12} />
                <span className="hidden sm:inline">{t('quizzes.results.incorrect')}</span> {incorrectAnswers}
              </span>
              {answeredWithRisk > 0 && (
                <span className="flex items-center gap-1" style={{ color: pageColors.accent }}>
                  <Award size={12} />
                  <span className="hidden sm:inline">{t('quizzes.results.answeredWithRisk')}</span> {answeredWithRisk}
                </span>
              )}
            </div>
          </div>
          
          {/* Sin Riesgo Row */}
          <div 
            className="px-4 py-3 border-b"
            style={{ 
              borderColor: pageColors.border,
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : `${primaryColor}03`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isDarkMode ? pageColors.text : primaryColor }}>
                {t('quizzes.results.scoreWithoutRisk')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.myScore')}
                </p>
                <p className="text-lg font-bold" style={{ color: isDarkMode ? pageColors.text : primaryColor }}>
                  {formatScore(score)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.globalAverage')}
                </p>
                <p className="text-lg font-bold" style={{ color: isDarkMode ? pageColors.text : primaryColor }}>
                  {averageScore !== null ? formatScore(averageScore) : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.percentile')}
                </p>
                {percentil !== null ? (
                  <p 
                    className="text-lg font-bold"
                    style={{ color: parseFloat(percentil) >= 0 ? SUCCESS_COLOR : ERROR_COLOR }}
                  >
                    {parseFloat(percentil) >= 0 ? '+' : ''}{formatScore(parseFloat(percentil))}
                  </p>
                ) : (
                  <p className="text-lg font-bold" style={{ color: pageColors.textMuted }}>-</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Con Riesgo Row */}
          <div 
            className="px-4 py-3"
            style={{ 
              backgroundColor: isDarkMode ? `${pageColors.accent}10` : `${pageColors.accent}08`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: pageColors.accent }}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: pageColors.accent }}>
                {t('quizzes.results.scoreWithRisk')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.myScore')}
                </p>
                <p className="text-lg font-bold" style={{ color: pageColors.accent }}>
                  {formatScore(score_with_risk)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.globalAverage')}
                </p>
                <p className="text-lg font-bold" style={{ color: pageColors.accent }}>
                  {averageScoreWithRisk !== null ? formatScore(averageScoreWithRisk) : '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.percentile')}
                </p>
                {percentilWithRisk !== null ? (
                  <p 
                    className="text-lg font-bold"
                    style={{ color: parseFloat(percentilWithRisk) >= 0 ? SUCCESS_COLOR : ERROR_COLOR }}
                  >
                    {parseFloat(percentilWithRisk) >= 0 ? '+' : ''}{formatScore(parseFloat(percentilWithRisk))}
                  </p>
                ) : (
                  <p className="text-lg font-bold" style={{ color: pageColors.textMuted }}>-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {detailed_results && questions ? (
          <div className={`space-y-4 ${noPadding ? 'pb-6' : ''}`}>
            {questions.map((question, index) => (
              <ReviewedQuestion
                key={question.id}
                question={question}
                result={detailed_results.find(r => r.question_id === question.id)}
                displayIndex={index + 1}
              />
            ))}
          </div>
        ) : (
          <p className={noPadding ? 'pb-6' : ''} style={{ color: getColor('text', '#6b7280') }}>
            {t('quizzes.noDetailedResults')}
          </p>
        )}
      </main>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;