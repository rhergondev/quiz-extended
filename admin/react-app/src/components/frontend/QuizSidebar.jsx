import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Circle, CheckCircle, TrendingDown, AlertCircle } from 'lucide-react';

// --- COMPONENTES AUXILIARES ---

const StatBox = ({ label, value, bgColor, textColor }) => (
  <div 
    className="text-center p-3 rounded-lg border-2 transition-all duration-200"
    style={{ 
      backgroundColor: '#ffffff',
      borderColor: textColor
    }}
  >
    <span className="block text-xs font-medium mb-1" style={{ color: textColor + '90' }}>
      {label}
    </span>
    <span className="block text-2xl font-bold" style={{ color: textColor }}>
      {value}
    </span>
  </div>
);

const LegendItem = ({ icon: Icon, color, text }) => (
  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: color }}>
    <Icon size={16} strokeWidth={2.5} />
    <span>{text}</span>
  </div>
);
// --- COMPONENTE PRINCIPAL ---

const QuizSidebar = ({ 
  questions, 
  questionIds = [],
  totalCount = null,
  userAnswers, 
  riskedAnswers, 
  onQuestionSelect, 
  onSubmit,
  loadedCount = 0
}) => {
  const { getColor } = useTheme();
  const { t } = useTranslation();
  
  const answeredCount = Object.keys(userAnswers).length;
  const riskedCount = riskedAnswers.length;
  const effectiveTotal = totalCount !== null ? totalCount : (questions ? questions.length : (questionIds ? questionIds.length : 0));
  const unansweredCount = Math.max(0, effectiveTotal - answeredCount);
  const impugnedCount = 0;

  // Colores del sistema de 3 estados
  const colors = {
    unanswered: '#6b7280', // gray-500
    answered: getColor('primary', '#1a202c'),
    risked: getColor('accent', '#f59e0b'),
    impugned: '#9ca3af' // gray-400
  };

  const scrollToQuestion = (index) => {
    const element = document.getElementById(`quiz-question-${index + 1}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Aumentar el border-left temporalmente
      const originalBorderWidth = element.style.borderLeftWidth || '4px';
      element.style.borderLeftWidth = '12px';
      element.style.transition = 'border-left-width 0.3s ease';
      
      setTimeout(() => {
        element.style.borderLeftWidth = originalBorderWidth;
      }, 2000);
    }
    if (onQuestionSelect) {
      onQuestionSelect(index);
    }
  };

  return (
    <div className="w-full">
      <div 
        className="rounded-lg shadow-sm border-2 transition-all duration-200"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderColor: getColor('borderColor', colors.answered)
        }}
      >
        
        {/* Leyenda de estados */}
        <div 
          className="p-4 border-b"
          style={{ borderColor: getColor('borderColor', colors.answered) + '30' }}
        >
          <div className="flex flex-wrap gap-4 justify-around">
            <LegendItem 
              icon={Circle} 
              color={colors.unanswered} 
              text={t('quizzes.sidebar.unanswered')} 
            />
            <LegendItem 
              icon={CheckCircle} 
              color={colors.answered} 
              text={t('quizzes.sidebar.answered')} 
            />
            <LegendItem 
              icon={TrendingDown} 
              color={colors.risked} 
              text={t('quizzes.sidebar.withRisk')} 
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="p-4 border-b" style={{ borderColor: getColor('borderColor', colors.answered) + '30' }}>
          <div className="grid grid-cols-2 gap-3">
            <StatBox 
              label={t('quizzes.sidebar.answered')} 
              value={answeredCount} 
              bgColor={colors.answered + '10'}
              textColor={colors.answered}
            />
            <StatBox 
              label={t('quizzes.sidebar.withRisk')} 
              value={riskedCount} 
              bgColor={colors.risked + '10'}
              textColor={colors.risked}
            />
            <StatBox 
              label={t('quizzes.sidebar.withoutRisk')} 
              value={answeredCount - riskedCount} 
              bgColor={colors.answered + '10'}
              textColor={colors.answered}
            />
            <StatBox 
              label={t('quizzes.sidebar.unanswered')} 
              value={unansweredCount} 
              bgColor={colors.unanswered + '10'}
              textColor={colors.unanswered}
            />
          </div>
        </div>

        {/* Mapa de preguntas */}
        <div className="p-4 border-b" style={{ borderColor: getColor('borderColor', colors.answered) + '30' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: colors.answered }}>
            {t('quizzes.sidebar.questionsMap')}
          </h3>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: effectiveTotal }).map((_, index) => {
              const qId = questionIds && questionIds[index] ? questionIds[index] : (questions && questions[index] ? questions[index].id : `unloaded-${index}`);
              const isLoaded = questions && questions[index];
              const isAnswered = userAnswers.hasOwnProperty(qId);
              const isRisked = riskedAnswers.includes(qId);

              let bgColor = '';
              let borderColor = '';
              let textColor = '';
              let opacity = '1';
              
              if (!isLoaded) {
                bgColor = colors.unanswered + '15';
                borderColor = colors.unanswered + '30';
                textColor = colors.unanswered + '60';
                opacity = '0.5';
              } else if (isRisked) {
                bgColor = colors.risked;
                borderColor = colors.risked;
                textColor = '#ffffff';
              } else if (isAnswered) {
                bgColor = colors.answered;
                borderColor = colors.answered;
                textColor = '#ffffff';
              } else {
                bgColor = colors.unanswered + '10';
                borderColor = colors.unanswered + '30';
                textColor = colors.unanswered;
              }

              return (
                <button
                  key={qId}
                  onClick={() => isLoaded && scrollToQuestion(index)}
                  disabled={!isLoaded}
                  className="w-full h-8 rounded text-xs font-bold transition-all duration-200 flex items-center justify-center border disabled:cursor-wait hover:enabled:scale-105 hover:enabled:shadow-md"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    color: textColor,
                    opacity: opacity
                  }}
                  title={!isLoaded ? t('quizzes.sidebar.loadingQuestion') : `${t('quizzes.sidebar.question')} ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón finalizar */}
        <div className="p-4">
          <button
            onClick={onSubmit}
            className="w-full px-6 py-3.5 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: colors.answered }}
          >
            {t('quizzes.sidebar.finishExam')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizSidebar;