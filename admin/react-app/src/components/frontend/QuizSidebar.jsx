import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Circle, CheckCircle, TrendingDown, AlertCircle } from 'lucide-react';

// --- COMPONENTES AUXILIARES ---

const StatBox = ({ label, value, bgColor, textColor, bgCard }) => (
  <div 
    className="text-center p-2 rounded-lg border-2 transition-all duration-200"
    style={{ 
      backgroundColor: bgCard,
      borderColor: textColor
    }}
  >
    <span className="block text-[10px] font-medium mb-0.5" style={{ color: textColor + '90' }}>
      {label}
    </span>
    <span className="block text-xl font-bold" style={{ color: textColor }}>
      {value}
    </span>
  </div>
);

const LegendItem = ({ icon: Icon, color, text }) => (
  <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: color }}>
    <Icon size={14} strokeWidth={2.5} />
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
  const { getColor, isDarkMode } = useTheme();
  const { t } = useTranslation();
  
  const answeredCount = Object.keys(userAnswers).length;
  const riskedCount = riskedAnswers.length;
  const effectiveTotal = totalCount !== null ? totalCount : (questions ? questions.length : (questionIds ? questionIds.length : 0));
  const unansweredCount = Math.max(0, effectiveTotal - answeredCount);
  const impugnedCount = 0;

  // Dark mode aware colors
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff';
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c');
  
  // Color primario para fondos de botones (siempre oscuro para tener contraste con texto blanco)
  const primaryBg = getColor('primary', '#1a202c');

  // Colores del sistema de 3 estados
  const colors = {
    unanswered: isDarkMode ? '#ffffff' : '#6b7280', // Blanco en dark mode para mejor contraste
    unansweredBg: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(107,114,128,0.1)',
    unansweredBorder: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(107,114,128,0.3)',
    answered: textPrimary, // Para texto e iconos - adaptativo
    answeredBg: primaryBg, // Para fondos de botones - siempre oscuro
    // En dark mode usar versión más brillante del primary (brightness ~1.1)
    answeredBgBright: isDarkMode ? '#5a9cfc' : primaryBg,
    risked: getColor('accent', '#f59e0b'),
    impugned: '#9ca3af' // gray-400
  };

  const scrollToQuestion = (index) => {
    // Try to find the question element
    const questionNumber = index + 1;
    const element = document.getElementById(`quiz-question-${questionNumber}`);
    
    if (element) {
      // Use scrollIntoView with nearest block to avoid issues with fixed elements
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      
      // Visual feedback: highlight the question temporarily with border only
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
          borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
        }}
      >
        
        {/* Leyenda de estados */}
        <div 
          className="p-3 border-b"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="flex flex-wrap gap-3 justify-around">
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
        <div className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <div className="grid grid-cols-2 gap-2">
            <StatBox 
              label={t('quizzes.sidebar.answered')} 
              value={answeredCount} 
              bgColor={colors.answered + '10'}
              textColor={colors.answered}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.withRisk')} 
              value={riskedCount} 
              bgColor={colors.risked + '10'}
              textColor={colors.risked}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.withoutRisk')} 
              value={answeredCount - riskedCount} 
              bgColor={colors.answered + '10'}
              textColor={colors.answered}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.unanswered')} 
              value={unansweredCount} 
              bgColor={colors.unanswered + '10'}
              textColor={colors.unanswered}
              bgCard={bgCard}
            />
          </div>
        </div>

        {/* Mapa de preguntas */}
        <div className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: textPrimary }}>
            {t('quizzes.sidebar.questionsMap')}
          </h3>
          <div className="grid grid-cols-10 gap-1">
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
                bgColor = isDarkMode ? 'rgba(255,255,255,0.05)' : colors.unanswered + '15';
                borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : colors.unanswered + '30';
                textColor = isDarkMode ? 'rgba(255,255,255,0.4)' : colors.unanswered + '60';
                opacity = '0.5';
              } else if (isRisked) {
                bgColor = colors.risked;
                borderColor = colors.risked;
                textColor = '#ffffff';
              } else if (isAnswered) {
                // En dark mode usar versión más brillante para mejor contraste
                bgColor = colors.answeredBgBright;
                borderColor = colors.answeredBgBright;
                textColor = '#ffffff';
              } else {
                // Sin contestar: fondo y borde blancos semi-transparentes en dark mode
                bgColor = colors.unansweredBg;
                borderColor = colors.unansweredBorder;
                textColor = colors.unanswered;
              }

              return (
                <button
                  key={qId}
                  onClick={() => isLoaded && scrollToQuestion(index)}
                  disabled={!isLoaded}
                  className="w-full h-6 rounded text-[10px] font-bold transition-all duration-200 flex items-center justify-center border disabled:cursor-wait hover:enabled:scale-105 hover:enabled:shadow-md"
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
        <div className="p-3">
          <button
            onClick={onSubmit}
            className="w-full px-4 py-3 text-sm text-white font-semibold rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: colors.answeredBg }}
          >
            {t('quizzes.sidebar.finishExam')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizSidebar;