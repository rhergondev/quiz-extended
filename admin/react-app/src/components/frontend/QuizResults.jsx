import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Award } from 'lucide-react';
import ReviewedQuestion from './ReviewedQuestion';
import ResultsSidebar from './ResultsSidebar';
import { useTranslation } from 'react-i18next';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import QEButton from '../common/QEButton';

const QuizResults = ({ result, quizTitle, questions }) => {
  const { t } = useTranslation();
  const { formatScore } = useScoreFormat();

  if (!result) {
    return <div className="text-center p-8">{t('quizzes.loadingResults')}</div>;
  }

  const { detailed_results, score, score_with_risk } = result;

  // Calcular estadísticas
  const totalQuestions = detailed_results?.length || 0;
  const correctAnswers = detailed_results?.filter(r => r.is_correct).length || 0;
  const incorrectAnswers = detailed_results?.filter(r => !r.is_correct && r.answer_given !== null).length || 0;
  const unanswered = detailed_results?.filter(r => r.answer_given === null).length || 0;

  // Obtener estadísticas globales si existen
  const averageScore = result.average_score !== undefined && result.average_score !== null ? result.average_score : null;
  const averageScoreWithRisk = result.average_score_with_risk !== undefined && result.average_score_with_risk !== null ? result.average_score_with_risk : null;
  
  // Calcular percentil (diferencia con la media dividida por 10) - mostrar incluso si es 0
  const percentil = averageScore !== null ? ((score - averageScore) / 10).toFixed(2) : null;
  const percentilWithRisk = averageScoreWithRisk !== null ? ((score_with_risk - averageScoreWithRisk) / 10).toFixed(2) : null;

  return (
    <div className="flex flex-col lg:flex-row-reverse gap-8 items-start p-4 max-w-screen-2xl mx-auto min-h-screen">

      {/* --- COLUMNA DERECHA: SIDEBAR DE RESULTADOS (STICKY) --- */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <ResultsSidebar result={result} questions={questions} />
      </div>

      {/* --- COLUMNA IZQUIERDA: REVISIÓN DETALLADA --- */}
      <main className="flex-1 w-full lg:w-auto">
        {/* Header con Título */}
        <div className="qe-bg-background border qe-border-primary rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold qe-text-primary">{t('quizzes.quizResults')}</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Card: Sin Riesgo */}
          <div className="qe-bg-gradient-primary border-2 qe-border-primary rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Puntuación Sin Riesgo</h3>
              <Award className="w-6 h-6 qe-icon-primary" />
            </div>
            <div className="text-4xl font-bold qe-text-primary mb-4">
              {formatScore(score)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Aciertos
                </span>
                <span className="font-semibold text-gray-900">{correctAnswers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <MinusCircle className="w-4 h-4 mr-2 text-gray-500" />
                  Sin contestar
                </span>
                <span className="font-semibold text-gray-900">{unanswered}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Errores
                </span>
                <span className="font-semibold text-gray-900">{incorrectAnswers}</span>
              </div>
              {averageScore !== null && (
                <>
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Media Global</span>
                    <span className="font-semibold text-gray-900">{formatScore(averageScore)}</span>
                  </div>
                  {percentil !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Percentil</span>
                      <span className={`font-semibold ${parseFloat(percentil) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(percentil) >= 0 ? '+' : ''}{percentil}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card: Con Riesgo */}
          <div className="qe-bg-accent-light border-2 qe-border-accent rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Puntuación Con Riesgo</h3>
              <Award className="w-6 h-6 qe-icon-accent" />
            </div>
            <div className="text-4xl font-bold qe-text-accent mb-4">
              {formatScore(score_with_risk)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Aciertos
                </span>
                <span className="font-semibold text-gray-900">{correctAnswers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <MinusCircle className="w-4 h-4 mr-2 text-gray-500" />
                  Sin contestar
                </span>
                <span className="font-semibold text-gray-900">{unanswered}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Errores
                </span>
                <span className="font-semibold text-gray-900">{incorrectAnswers}</span>
              </div>
              {averageScoreWithRisk !== null && (
                <>
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Media Global</span>
                    <span className="font-semibold text-gray-900">{formatScore(averageScoreWithRisk)}</span>
                  </div>
                  {percentilWithRisk !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Percentil</span>
                      <span className={`font-semibold ${parseFloat(percentilWithRisk) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          <div className="space-y-4">
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
            <p>{t('quizzes.noDetailedResults')}</p>
        )}

        <div className="mt-8 text-center pb-4">
          <Link to="/courses">
            <QEButton 
              variant="primary"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg font-semibold shadow-md"
            >
              Volver a Cursos
            </QEButton>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default QuizResults;