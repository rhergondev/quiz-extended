import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Award, Menu, X } from 'lucide-react';
import ReviewedQuestion from './ReviewedQuestion';
import ResultsSidebar from './ResultsSidebar';
import { useTranslation } from 'react-i18next';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTheme } from '../../contexts/ThemeContext';

const QuizResults = ({ result, quizTitle, questions, noPadding = false }) => {
  const { t } = useTranslation();
  const { formatScore } = useScoreFormat();
  const { getColor } = useTheme();
  const [isResultsSidebarOpen, setIsResultsSidebarOpen] = useState(false);

  const SUCCESS_COLOR = '#22c55e';
  const ERROR_COLOR = '#ef4444';
  const GRAY_COLOR = '#6b7280';

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
              <h3 className="font-bold text-xl" style={{ color: getColor('primary', '#1a202c') }}>
                {t('quizzes.results.summary')}
              </h3>
              <button
                onClick={() => setIsResultsSidebarOpen(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: getColor('primary', '#1a202c') }}
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
            backgroundColor: getColor('primary', '#1a202c'),
          }}
        >
          <h2 
            className="text-xl font-bold"
            style={{ color: getColor('textColorContrast', '#ffffff') }}
          >
            {t('quizzes.results.title')}
          </h2>
        </div>

        {/* Tarjetas de puntuación - responsive con bordes redondeados */}
        <div className={`rounded-xl overflow-hidden border-2 mb-4 ${noPadding ? 'mt-4 lg:mt-0' : ''}`}
          style={{
            backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          {/* Sin Riesgo */}
          <div 
            className="p-3 sm:p-4 lg:p-6"
            style={{
              backgroundColor: getColor('background', '#ffffff'),
            }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 
                className="text-xs sm:text-sm lg:text-base font-bold"
                style={{ color: getColor('primary', '#1a202c') }}
              >
                {t('quizzes.results.scoreWithoutRisk')}
              </h3>
              <Award 
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" 
                style={{ color: getColor('primary', '#1a202c') }}
              />
            </div>
            <div 
              className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3"
              style={{ color: getColor('primary', '#1a202c') }}
            >
              {formatScore(score)}
            </div>
            <div className="space-y-1 sm:space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" style={{ color: SUCCESS_COLOR }} />
                  {t('quizzes.results.correct')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {correctAnswers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <MinusCircle className="w-3.5 h-3.5 mr-2" style={{ color: GRAY_COLOR }} />
                  {t('quizzes.results.unanswered')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {unanswered}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-2" style={{ color: ERROR_COLOR }} />
                  {t('quizzes.results.incorrect')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {incorrectAnswers}
                </span>
              </div>
              {averageScore !== null && (
                <>
                  <div 
                    className="border-t my-2"
                    style={{ borderColor: getColor('primary', '#1a202c') + '20' }}
                  />
                  <div className="flex items-center justify-between">
                    <span style={{ color: GRAY_COLOR }} className="text-xs">
                      {t('quizzes.results.globalAverage')}
                    </span>
                    <span 
                      className="font-semibold text-xs"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {formatScore(averageScore)}
                    </span>
                  </div>
                  {percentil !== null && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: GRAY_COLOR }} className="text-xs">
                        {t('quizzes.results.percentile')}
                      </span>
                      <span 
                        className="font-semibold text-xs"
                        style={{ 
                          color: parseFloat(percentil) >= 0 ? SUCCESS_COLOR : ERROR_COLOR 
                        }}
                      >
                        {parseFloat(percentil) >= 0 ? '+' : ''}{percentil}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Separador horizontal */}
          <div 
            style={{ 
              height: '1px', 
              backgroundColor: 'rgba(156, 163, 175, 0.2)'
            }}
          />

          {/* Con Riesgo */}
          <div 
            className="p-3 sm:p-4 lg:p-6"
            style={{
              backgroundColor: getColor('background', '#ffffff'),
            }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 
                className="text-xs sm:text-sm lg:text-base font-bold"
                style={{ color: getColor('accent', '#f59e0b') }}
              >
                {t('quizzes.results.scoreWithRisk')}
              </h3>
              <Award 
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" 
                style={{ color: getColor('accent', '#f59e0b') }}
              />
            </div>
            <div 
              className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3"
              style={{ color: getColor('accent', '#f59e0b') }}
            >
              {formatScore(score_with_risk)}
            </div>
            <div className="space-y-1 sm:space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" style={{ color: SUCCESS_COLOR }} />
                  {t('quizzes.results.correct')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {correctAnswers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <MinusCircle className="w-3.5 h-3.5 mr-2" style={{ color: GRAY_COLOR }} />
                  {t('quizzes.results.unanswered')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {unanswered}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center text-xs"
                  style={{ color: GRAY_COLOR }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-2" style={{ color: ERROR_COLOR }} />
                  {t('quizzes.results.incorrect')}
                </span>
                <span 
                  className="font-semibold text-xs"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {incorrectAnswers}
                </span>
              </div>
              {averageScoreWithRisk !== null && (
                <>
                  <div 
                    className="border-t my-2"
                    style={{ borderColor: getColor('accent', '#f59e0b') + '30' }}
                  />
                  <div className="flex items-center justify-between">
                    <span style={{ color: GRAY_COLOR }} className="text-xs">
                      {t('quizzes.results.globalAverage')}
                    </span>
                    <span 
                      className="font-semibold text-xs"
                      style={{ color: getColor('accent', '#f59e0b') }}
                    >
                      {formatScore(averageScoreWithRisk)}
                    </span>
                  </div>
                  {percentilWithRisk !== null && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: GRAY_COLOR }} className="text-xs">
                        {t('quizzes.results.percentile')}
                      </span>
                      <span 
                        className="font-semibold text-xs"
                        style={{ 
                          color: parseFloat(percentilWithRisk) >= 0 ? SUCCESS_COLOR : ERROR_COLOR 
                        }}
                      >
                        {parseFloat(percentilWithRisk) >= 0 ? '+' : ''}{percentilWithRisk}
                      </span>
                    </div>
                  )}
                </>
              )}
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