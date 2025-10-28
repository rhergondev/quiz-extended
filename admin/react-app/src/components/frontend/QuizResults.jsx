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

  return (
    <div className="flex flex-col lg:flex-row-reverse gap-8 items-start p-4 max-w-screen-2xl mx-auto">

      {/* --- COLUMNA DERECHA: SIDEBAR DE RESULTADOS (NO STICKY) --- */}
      <ResultsSidebar result={result} />

      {/* --- COLUMNA IZQUIERDA: REVISIÓN DETALLADA --- */}
      <main className="flex-grow w-full">
        {/* Header con Título */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800">{t('quizzes.quizResults')}</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Card: Sin Riesgo */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Puntuación Sin Riesgo</h3>
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-4">
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
            </div>
          </div>

          {/* Card: Con Riesgo */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Puntuación Con Riesgo</h3>
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-4xl font-bold text-yellow-600 mb-4">
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
            </div>
          </div>
        </div>

        {detailed_results && questions ? (
          <div className="space-y-4">
            {questions.map(question => (
              <ReviewedQuestion
                key={question.id}
                question={question}
                result={detailed_results.find(r => r.question_id === question.id)}
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