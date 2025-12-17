import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Award, Menu, X, Trophy, Target, Clock, ChevronLeft } from 'lucide-react';
import ReviewedQuestion from './ReviewedQuestion';
import ResultsSidebar from './ResultsSidebar';
import { useTranslation } from 'react-i18next';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTheme } from '../../contexts/ThemeContext';

const QuizResults = ({ 
  result, 
  quizTitle, 
  questions, 
  noPadding = false,
  difficulty = null,
  onBack = null,
  // Context props for feedback modal
  courseId = null,
  courseName = null,
  lessonId = null,
  lessonTitle = null
}) => {
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
    border: isDarkMode ? accentColor : `${primaryColor}20`,
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

  // Estadísticas SIN RIESGO (todas las preguntas contestadas sin riesgo)
  const withoutRiskAnswers = detailed_results?.filter(r => !r.is_risked && r.answer_given !== null) || [];
  const withoutRiskCorrect = withoutRiskAnswers.filter(r => r.is_correct).length;
  const withoutRiskIncorrect = withoutRiskAnswers.filter(r => !r.is_correct).length;
  
  // Estadísticas CON RIESGO (todas las preguntas contestadas con riesgo)
  const withRiskAnswers = detailed_results?.filter(r => r.is_risked && r.answer_given !== null) || [];
  const withRiskCorrect = withRiskAnswers.filter(r => r.is_correct).length;
  const withRiskIncorrect = withRiskAnswers.filter(r => !r.is_correct).length;

  // Debug log para verificar datos de riesgo
  console.log('QuizResults - detailed_results:', detailed_results);
  console.log('QuizResults - answeredWithRisk:', answeredWithRisk);
  console.log('QuizResults - is_risked values:', detailed_results?.map(r => ({ question_id: r.question_id, is_risked: r.is_risked, answer_given: r.answer_given })));

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
        {/* Barra de info: Botón volver, Dificultad y Tiempo */}
        {(onBack || difficulty || result?.duration_seconds) && (
          <div 
            className={`flex items-center justify-between mb-4 ${noPadding ? 'mt-4' : ''}`}
          >
            {/* Lado izquierdo: Botón volver + Dificultad */}
            <div className="flex items-center gap-3">
              {/* Botón volver */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-full transition-all"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.text}10`,
                  }}
                  title={t('common.back')}
                >
                  <ChevronLeft size={20} style={{ color: pageColors.text }} />
                </button>
              )}
              
              {/* Dificultad */}
              {difficulty && (() => {
              const difficultyColors = {
                'easy': '#10b981',
                'medium': '#f59e0b',
                'hard': '#ef4444'
              };
              const difficultyLabels = {
                'easy': t('tests.difficultyEasy') || 'Fácil',
                'medium': t('tests.difficultyMedium') || 'Medio',
                'hard': t('tests.difficultyHard') || 'Difícil'
              };
              return (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: pageColors.textMuted }}>
                    {t('quizzes.results.difficultyLevel')}:
                  </span>
                  <div 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${difficultyColors[difficulty]}15`,
                    }}
                  >
                    <Target size={12} style={{ color: difficultyColors[difficulty] }} />
                    <span className="text-xs font-medium" style={{ color: difficultyColors[difficulty] }}>
                      {difficultyLabels[difficulty]}
                    </span>
                  </div>
                </div>
              );
            })()}
            </div>
            
            {/* Tiempo */}
            {result?.duration_seconds && (
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.textMuted }}>
                  {t('quizzes.results.timeSpent')}:
                </span>
                <span className="text-sm font-medium" style={{ color: pageColors.text }}>
                  {Math.floor(result.duration_seconds / 60)}:{String(result.duration_seconds % 60).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Resumen de respuestas - Grid 2 columnas: Nota | Arriesgando */}
        <div 
          className={`rounded-xl overflow-hidden border-2 mb-4 ${noPadding ? 'mt-4 lg:mt-0' : ''}`}
          style={{ 
            backgroundColor: pageColors.bg,
            borderColor: pageColors.border
          }}
        >
          {/* Header Principal */}
          <div 
            className="px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}08` }}
          >
            <Trophy size={16} style={{ color: isDarkMode ? pageColors.accent : primaryColor }} />
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color: pageColors.text }}>
              {t('quizzes.results.summary')}
            </span>
          </div>
          
          {/* Grid de 2 columnas: Nota | Arriesgando */}
          <div className="grid grid-cols-2">
            {/* Columna NOTA (Sin Riesgo) */}
            <div className="border-r p-3" style={{ borderColor: 'rgba(156, 163, 175, 0.2)' }}>
              {/* Título */}
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-center" style={{ color: pageColors.textMuted }}>
                {t('quizzes.results.scoreWithoutRisk')}
              </p>
              
              {/* Valor de la nota con fondo */}
              <div 
                className="rounded-lg py-2 px-3 mb-3 text-center"
                style={{ 
                  backgroundColor: isDarkMode ? primaryColor : primaryColor,
                }}
              >
                <span className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                  {formatScore(score)}
                </span>
              </div>
              
              {/* Estadísticas */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={12} style={{ color: SUCCESS_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.correct')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: SUCCESS_COLOR }}>{correctAnswers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MinusCircle size={12} style={{ color: GRAY_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.unanswered')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: GRAY_COLOR }}>{unanswered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <XCircle size={12} style={{ color: ERROR_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.incorrect')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: ERROR_COLOR }}>{incorrectAnswers}</span>
                </div>
              </div>
            </div>

            {/* Columna ARRIESGANDO (Con Riesgo) */}
            <div className="p-3">
              {/* Título */}
              <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-center" style={{ color: pageColors.textMuted }}>
                {t('quizzes.results.scoreWithRisk')}
              </p>
              
              {/* Valor de la nota con fondo */}
              <div 
                className="rounded-lg py-2 px-3 mb-3 text-center"
                style={{ 
                  backgroundColor: isDarkMode ? pageColors.accent : pageColors.accent,
                }}
              >
                <span className="text-2xl font-bold" style={{ color: '#ffffff' }}>
                  {formatScore(score_with_risk)}
                </span>
              </div>
              
              {/* Estadísticas */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={12} style={{ color: SUCCESS_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.correct')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: SUCCESS_COLOR }}>{correctAnswers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MinusCircle size={12} style={{ color: GRAY_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.unanswered')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: GRAY_COLOR }}>{unanswered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <XCircle size={12} style={{ color: ERROR_COLOR }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('quizzes.results.incorrect')}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: ERROR_COLOR }}>{incorrectAnswers}</span>
                </div>
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
                courseId={courseId}
                courseName={courseName}
                lessonId={lessonId}
                lessonTitle={lessonTitle}
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