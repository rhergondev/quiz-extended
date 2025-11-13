import React from 'react';
import { Award, Zap, Clock } from 'lucide-react';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

const StatBox = ({ label, value, icon: Icon, bgColor, textColor }) => (
  <div 
    className="text-center p-4 rounded-lg"
    style={{ backgroundColor: bgColor }}
  >
    <div className="flex items-center justify-center mb-2">
      <Icon className="w-5 h-5 mr-2" style={{ color: textColor }} />
      <span 
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: textColor }}
      >
        {label}
      </span>
    </div>
    <span 
      className="block text-2xl font-bold"
      style={{ color: textColor }}
    >
      {value}
    </span>
  </div>
);

const ResultsSidebar = ({ result, questions }) => {
  const { formatScore } = useScoreFormat();
  const { t } = useTranslation();
  const { getColor } = useTheme();
  
  const SUCCESS_COLOR = '#22c55e';
  const ERROR_COLOR = '#ef4444';
  const GRAY_COLOR = '#6b7280';
  
  if (!result) {
    return null;
  }

  const { score, score_with_risk, detailed_results, duration_seconds } = result;

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const scrollToQuestion = (displayIndex) => {
    const element = document.getElementById(`question-${displayIndex}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Añadir efecto visual con el borde izquierdo pulsante
      element.style.borderLeftWidth = '8px';
      element.style.transition = 'border-left-width 0.3s ease';
      
      setTimeout(() => {
        element.style.borderLeftWidth = '4px';
      }, 2000);
    }
  };

  // Ordenar los resultados según el orden de las preguntas
  const orderedResults = questions 
    ? questions.map(q => detailed_results.find(r => r.question_id === q.id)).filter(Boolean)
    : detailed_results;

  return (
    <aside className="w-full">
      <div 
        className="sticky top-4 p-6 rounded-lg border shadow-sm max-h-[calc(100vh-2rem)] overflow-y-auto"
        style={{
          backgroundColor: getColor('background', '#ffffff'),
          borderColor: getColor('primary', '#1a202c') + '20'
        }}
      >
        <h3 
          className="text-xl font-bold mb-6 text-center"
          style={{ color: getColor('primary', '#1a202c') }}
        >
          {t('quizzes.resultsSidebar.title')}
        </h3>

        <div className="grid grid-cols-1 gap-3 mb-6">
          <StatBox
            label={t('quizzes.resultsSidebar.score')}
            value={formatScore(score)}
            icon={Award}
            bgColor={getColor('primary', '#1a202c') + '10'}
            textColor={getColor('primary', '#1a202c')}
          />
          <StatBox
            label={t('quizzes.resultsSidebar.scoreWithRisk')}
            value={formatScore(score_with_risk)}
            icon={Zap}
            bgColor={getColor('accent', '#f59e0b') + '15'}
            textColor={getColor('accent', '#f59e0b')}
          />
          <StatBox
            label={t('quizzes.resultsSidebar.timeSpent')}
            value={formatTime(duration_seconds)}
            icon={Clock}
            bgColor={getColor('primary', '#1a202c') + '10'}
            textColor={getColor('primary', '#1a202c')}
          />
        </div>

        <h4 
          className="text-sm font-semibold mb-3"
          style={{ color: getColor('primary', '#1a202c') }}
        >
          {t('quizzes.resultsSidebar.questionsMap')}
        </h4>
        <div 
          className="grid grid-cols-5 gap-2 p-3 rounded-lg"
          style={{ backgroundColor: getColor('primary', '#1a202c') + '05' }}
        >
          {orderedResults && orderedResults.map((res, index) => {
            const wasAnswered = res.answer_given !== null && res.answer_given !== undefined;
            
            let bgColor, borderColor, textColor, title;
            
            if (!wasAnswered) {
              bgColor = GRAY_COLOR + '20';
              borderColor = GRAY_COLOR;
              textColor = GRAY_COLOR;
              title = t('quizzes.resultsSidebar.questionUnanswered', { number: index + 1 });
            } else if (res.is_risked) {
              bgColor = '#ffffff';
              borderColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
              textColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
              title = res.is_correct 
                ? t('quizzes.resultsSidebar.questionCorrectWithRisk', { number: index + 1 })
                : t('quizzes.resultsSidebar.questionIncorrectWithRisk', { number: index + 1 });
            } else {
              bgColor = res.is_correct ? SUCCESS_COLOR + '20' : ERROR_COLOR + '20';
              borderColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
              textColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
              title = res.is_correct 
                ? t('quizzes.resultsSidebar.questionCorrect', { number: index + 1 })
                : t('quizzes.resultsSidebar.questionIncorrect', { number: index + 1 });
            }

            return (
              <button
                key={res.question_id}
                onClick={() => scrollToQuestion(index + 1)}
                className="w-full aspect-square rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center cursor-pointer border-2"
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 4px 8px ${borderColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={title}
                aria-label={title}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default ResultsSidebar;