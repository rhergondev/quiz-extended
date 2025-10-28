import React from 'react';
import { Link } from 'react-router-dom';
import ReviewedQuestionRecover from './ReviewedQuestionRecover';
import QEButton from '../../common/QEButton';
import ResultsSidebar from '../ResultsSidebar';
import { useTranslation } from 'react-i18next';

const QuizResultsRecover = ({ result, quizTitle, questions }) => {
  if (!result) {
    return <div className="text-center p-8">{t('quizzes.loadingResults')}</div>;
  }

  const { t } = useTranslation();

  const { detailed_results } = result;

  return (
    <div className="flex flex-col lg:flex-row-reverse gap-8 items-start p-4 max-w-screen-2xl mx-auto lg:h-[calc(100vh-100px)]">

      {/* --- COLUMNA DERECHA: SIDEBAR DE RESULTADOS --- */}
      <ResultsSidebar result={result} />

      {/* --- COLUMNA IZQUIERDA: REVISIÓN DETALLADA (con scroll interno) --- */}
      <main className="flex-grow w-full lg:overflow-y-auto lg:pr-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800">{t('quizzes.quizResults')}</h2>
        </div>

        {detailed_results && questions ? (
          <div className="space-y-4">
            {questions.map(question => (
              <ReviewedQuestionRecover
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
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 font-semibold rounded-lg shadow-md"
            >
              Volver a Cursos
            </QEButton>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default QuizResultsRecover;