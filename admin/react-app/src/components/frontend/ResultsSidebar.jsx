import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

// Componente de leyenda - box ancho con texto (usando box-shadow inset para bordes)
const LegendBox = ({ bgColor, borderColor, textColor, text }) => (
  <div 
    className="px-2 py-1 rounded text-[9px] font-semibold text-center truncate"
    style={{ 
      backgroundColor: bgColor, 
      boxShadow: `inset 0 0 0 2px ${borderColor}`,
      color: textColor
    }}
  >
    {text}
  </div>
);

const ResultsSidebar = ({ result, questions }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  
  const SUCCESS_COLOR = '#22c55e';
  const ERROR_COLOR = '#ef4444';
  
  // Colores para texto en elementos con riesgo
  const riskTextColor = isDarkMode ? '#ffffff' : getColor('primary', '#1a202c');
  
  // Colores para sin contestar
  const unansweredBg = isDarkMode ? '#4b5563' : '#9ca3af';
  const unansweredBorder = isDarkMode ? '#ffffff' : '#6b7280';
  const unansweredText = '#ffffff'; // Siempre blanco porque el fondo es gris

  // Dark mode aware colors
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c');
  const bgSubtle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  
  if (!result) {
    return null;
  }

  const { detailed_results } = result;

  const scrollToQuestion = (displayIndex) => {
    const element = document.getElementById(`question-${displayIndex}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
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
    <aside className="w-full pr-4 pt-4">
      <div 
        className="sticky top-6 p-2 rounded-lg border-2 shadow-sm max-h-[calc(100vh-5rem)] overflow-y-auto"
        style={{
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
        }}
      >
        {/* Leyenda de estados - 4 elementos en 2x2 */}
        <div 
          className="px-1 py-1.5 border-b mb-2"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="grid grid-cols-2 gap-1">
            {/* Correcta */}
            <LegendBox 
              bgColor={SUCCESS_COLOR}
              borderColor={SUCCESS_COLOR}
              textColor="#ffffff"
              text={t('quizzes.resultsSidebar.legendCorrect')}
            />
            {/* Arriesgando (correcta) */}
            <LegendBox 
              bgColor="transparent"
              borderColor={SUCCESS_COLOR}
              textColor={riskTextColor}
              text={t('quizzes.resultsSidebar.legendRisking')}
            />
            {/* Incorrecta */}
            <LegendBox 
              bgColor={ERROR_COLOR}
              borderColor={ERROR_COLOR}
              textColor="#ffffff"
              text={t('quizzes.resultsSidebar.legendIncorrect')}
            />
            {/* Arriesgando (incorrecta) */}
            <LegendBox 
              bgColor="transparent"
              borderColor={ERROR_COLOR}
              textColor={riskTextColor}
              text={t('quizzes.resultsSidebar.legendRisking')}
            />
          </div>
        </div>

        {/* Mapa de preguntas - 10 columnas */}
        <div className="px-1 py-1">
          <h4 
            className="text-[10px] font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('quizzes.resultsSidebar.questionsMap')}
          </h4>
          <div 
            className="grid grid-cols-10 gap-0.5 rounded"
            style={{ backgroundColor: bgSubtle }}
          >
            {orderedResults && orderedResults.map((res, index) => {
              const wasAnswered = res.answer_given !== null && res.answer_given !== undefined;
              
              let bgColor, borderColor, textColor, title;
              
              if (!wasAnswered) {
                // Sin contestar: fondo gris, borde blanco (dark) / gris oscuro (light), texto blanco/gris
                bgColor = unansweredBg;
                borderColor = unansweredBorder;
                textColor = unansweredText;
                title = t('quizzes.resultsSidebar.questionUnanswered', { number: index + 1 });
              } else if (res.is_risked) {
                // Con riesgo: solo borde, sin fondo
                bgColor = 'transparent';
                borderColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
                textColor = riskTextColor;
                title = res.is_correct 
                  ? t('quizzes.resultsSidebar.questionCorrectWithRisk', { number: index + 1 })
                  : t('quizzes.resultsSidebar.questionIncorrectWithRisk', { number: index + 1 });
              } else {
                // Sin riesgo: fondo sólido
                bgColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
                borderColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
                textColor = '#ffffff';
                title = res.is_correct 
                  ? t('quizzes.resultsSidebar.questionCorrect', { number: index + 1 })
                  : t('quizzes.resultsSidebar.questionIncorrect', { number: index + 1 });
              }

              return (
                <button
                  key={res.question_id}
                  onClick={() => scrollToQuestion(index + 1)}
                  className="w-full aspect-square rounded text-[9px] font-semibold transition-all duration-150 flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-sm"
                  style={{
                    backgroundColor: bgColor,
                    boxShadow: `inset 0 0 0 2px ${borderColor}`,
                    color: textColor
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
      </div>
    </aside>
  );
};

export default ResultsSidebar;