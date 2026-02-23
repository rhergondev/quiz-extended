import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

// Componente de leyenda - box ancho con texto
const LegendBox = ({ bgColor, borderColor, textColor, text }) => (
  <div
    className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-center border-2"
    style={{
      backgroundColor: bgColor,
      borderColor: borderColor,
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

  // Compute results before hooks (hooks must not be conditional)
  const { detailed_results } = result || { detailed_results: [] };
  const orderedResults = questions
    ? questions.map(q => detailed_results.find(r => r.question_id === q.id)).filter(Boolean)
    : detailed_results;
  const numResults = orderedResults ? orderedResults.length : 0;

  // Auto-scaling refs
  const sidebarCardRef = useRef(null);
  const legendSectionRef = useRef(null);
  const gridTitleRef = useRef(null);
  const [btnSize, setBtnSize] = useState(28);

  useEffect(() => {
    const card = sidebarCardRef.current;
    if (!card) return;

    const compute = () => {
      const legend = legendSectionRef.current;
      const gridTitle = gridTitleRef.current;
      if (!legend) return;

      const viewportH = window.innerHeight;
      const { top: cardTop } = card.getBoundingClientRect();
      const availableH = Math.max(100, viewportH - cardTop - 8);

      const legendH = legend.offsetHeight;
      const titleH = gridTitle ? gridTitle.offsetHeight + 6 : 20; // 6 = mb-1.5
      const overhead = 24; // card p-3 vertical padding

      const gridH = Math.max(0, availableH - legendH - titleH - overhead);
      const gap = 4; // gap-1 = 4px
      const rows = Math.ceil(numResults / 10) || 1;
      const maxBtnH = (gridH - (rows - 1) * gap) / rows;
      setBtnSize(Math.max(16, Math.min(28, Math.floor(maxBtnH))));
    };

    const ro = new ResizeObserver(compute);
    ro.observe(card);
    compute();
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [numResults]);

  if (!result) {
    return null;
  }

  const scrollToQuestion = (displayIndex) => {
    const element = document.getElementById(`question-${displayIndex}`);
    if (element) {
      element.style.scrollMarginTop = '80px';
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });

      element.style.borderLeftWidth = '8px';
      element.style.transition = 'border-left-width 0.3s ease';

      setTimeout(() => {
        element.style.borderLeftWidth = '4px';
      }, 2000);
    }
  };

  return (
    <aside className="w-full pr-4 pt-4">
      <div
        ref={sidebarCardRef}
        className="p-3 rounded-lg border-2 shadow-sm"
        style={{
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
        }}
      >
        {/* Leyenda de estados - 4 elementos en 2x2 */}
        <div
          ref={legendSectionRef}
          className="px-1 py-1.5 border-b mb-3"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="grid grid-cols-2 gap-1.5">
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
        <div className="px-1 py-1.5">
          <h4
            ref={gridTitleRef}
            className="text-[10px] font-semibold mb-1.5"
            style={{ color: textPrimary }}
          >
            {t('quizzes.resultsSidebar.questionsMap')}
          </h4>
          <div
            className="grid grid-cols-10 gap-1 rounded"
            style={{ backgroundColor: bgSubtle }}
          >
            {orderedResults && orderedResults.map((res, index) => {
              const wasAnswered = res.answer_given !== null && res.answer_given !== undefined;

              let bgColor, borderColor, textColor, title;

              if (!wasAnswered) {
                bgColor = unansweredBg;
                borderColor = unansweredBorder;
                textColor = unansweredText;
                title = t('quizzes.resultsSidebar.questionUnanswered', { number: index + 1 });
              } else if (res.is_risked) {
                bgColor = 'transparent';
                borderColor = res.is_correct ? SUCCESS_COLOR : ERROR_COLOR;
                textColor = riskTextColor;
                title = res.is_correct
                  ? t('quizzes.resultsSidebar.questionCorrectWithRisk', { number: index + 1 })
                  : t('quizzes.resultsSidebar.questionIncorrectWithRisk', { number: index + 1 });
              } else {
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
                  className="w-full rounded font-bold border-2 transition-all duration-150 flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-sm"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderStyle: 'solid',
                    color: textColor,
                    height: btnSize,
                    fontSize: Math.max(8, Math.floor(btnSize * 0.42)),
                    lineHeight: 1
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
