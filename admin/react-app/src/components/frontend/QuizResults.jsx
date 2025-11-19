import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Award } from 'lucide-react';
import ReviewedQuestion from './ReviewedQuestion';
import ResultsSidebar from './ResultsSidebar';
import { useTranslation } from 'react-i18next';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTheme } from '../../contexts/ThemeContext';

const QuizResults = ({ result, quizTitle, questions, noPadding = false }) => {
  const { t } = useTranslation();
  const { formatScore } = useScoreFormat();
  const { getColor } = useTheme();

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
    <div className="h-full flex flex-col" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
      <div className={`flex-1 overflow-hidden ${noPadding ? '' : 'p-6'}`}>
        <div className="w-full max-w-screen-2xl mx-auto flex flex-col lg:flex-row-reverse gap-8 h-full">
          <div className={`w-full lg:w-80 flex-shrink-0 ${noPadding ? 'mt-4' : ''}`}>
            <ResultsSidebar result={result} questions={questions} />
          </div>

          <main className={`flex-1 w-full lg:w-auto lg:overflow-y-auto ${noPadding ? 'lg:px-6 lg:py-6' : 'lg:pr-4'}`}>
        <div 
          className={`rounded-lg p-6 mb-6 shadow-sm ${noPadding ? 'mt-4' : ''}`}
          style={{
            backgroundColor: getColor('primary', '#1a202c'),
          }}
        >
          <h2 
            className="text-2xl font-bold"
            style={{ color: getColor('textColorContrast', '#ffffff') }}
          >
            {t('quizzes.results.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div 
            className="border-2 rounded-lg p-6 shadow-md"
            style={{
              backgroundColor: getColor('secondaryBackground', '#ffffff'),
              borderColor: getColor('primary', '#1a202c')
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-lg font-bold"
                style={{ color: getColor('primary', '#1a202c') }}
              >
                {t('quizzes.results.scoreWithoutRisk')}
              </h3>
              <Award 
                className="w-7 h-7" 
                style={{ color: getColor('primary', '#1a202c') }}
              />
            </div>
            <div 
              className="text-4xl font-bold mb-4"
              style={{ color: getColor('primary', '#1a202c') }}
            >
              {formatScore(score)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" style={{ color: SUCCESS_COLOR }} />
                  {t('quizzes.results.correct')}
                </span>
                <span 
                  className="font-semibold"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {correctAnswers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <MinusCircle className="w-4 h-4 mr-2" style={{ color: GRAY_COLOR }} />
                  {t('quizzes.results.unanswered')}
                </span>
                <span 
                  className="font-semibold"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {unanswered}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <XCircle className="w-4 h-4 mr-2" style={{ color: ERROR_COLOR }} />
                  {t('quizzes.results.incorrect')}
                </span>
                <span 
                  className="font-semibold"
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
                    <span style={{ color: GRAY_COLOR }}>
                      {t('quizzes.results.globalAverage')}
                    </span>
                    <span 
                      className="font-semibold"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {formatScore(averageScore)}
                    </span>
                  </div>
                  {percentil !== null && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: GRAY_COLOR }}>
                        {t('quizzes.results.percentile')}
                      </span>
                      <span 
                        className="font-semibold"
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

          <div 
            className="border-2 rounded-lg p-6 shadow-md"
            style={{
              backgroundColor: getColor('secondaryBackground', '#ffffff'),
              borderColor: getColor('accent', '#f59e0b')
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 
                className="text-lg font-bold"
                style={{ color: getColor('accent', '#f59e0b') }}
              >
                {t('quizzes.results.scoreWithRisk')}
              </h3>
              <Award 
                className="w-7 h-7" 
                style={{ color: getColor('accent', '#f59e0b') }}
              />
            </div>
            <div 
              className="text-4xl font-bold mb-4"
              style={{ color: getColor('accent', '#f59e0b') }}
            >
              {formatScore(score_with_risk)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" style={{ color: SUCCESS_COLOR }} />
                  {t('quizzes.results.correct')}
                </span>
                <span 
                  className="font-semibold"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {correctAnswers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <MinusCircle className="w-4 h-4 mr-2" style={{ color: GRAY_COLOR }} />
                  {t('quizzes.results.unanswered')}
                </span>
                <span 
                  className="font-semibold"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {unanswered}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="flex items-center"
                  style={{ color: GRAY_COLOR }}
                >
                  <XCircle className="w-4 h-4 mr-2" style={{ color: ERROR_COLOR }} />
                  {t('quizzes.results.incorrect')}
                </span>
                <span 
                  className="font-semibold"
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
                    <span style={{ color: GRAY_COLOR }}>
                      {t('quizzes.results.globalAverage')}
                    </span>
                    <span 
                      className="font-semibold"
                      style={{ color: getColor('accent', '#f59e0b') }}
                    >
                      {formatScore(averageScoreWithRisk)}
                    </span>
                  </div>
                  {percentilWithRisk !== null && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: GRAY_COLOR }}>
                        {t('quizzes.results.percentile')}
                      </span>
                      <span 
                        className="font-semibold"
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