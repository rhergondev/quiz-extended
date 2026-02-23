import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// --- COMPONENTES AUXILIARES ---

const StatBox = ({ label, value, textColor, bgCard }) => (
  <div 
    className="text-center px-2 py-1.5 rounded border-2"
    style={{
      backgroundColor: bgCard,
      borderColor: textColor
    }}
  >
    <span className="block text-xs font-semibold leading-tight" style={{ color: textColor }}>
      {label}
    </span>
    <span className="block text-[22px] font-bold" style={{ color: textColor }}>
      {value}
    </span>
  </div>
);

const LegendItem = ({ bgColor, borderColor, textColor, text }) => (
  <div
    className="px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-center border-2"
    style={{ 
      backgroundColor: bgColor,
      borderColor: borderColor,
      color: textColor
    }}
  >
    {text}
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
  loadedCount = 0,
  onLoadMore = null, // Callback para cargar más preguntas si es necesario
  scrollContainerRef = null // 🔥 FIX: Direct ref to the questions container
}) => {
  const { getColor, isDarkMode } = useTheme();
  const { t } = useTranslation();
  
  
  const answeredCount = Object.keys(userAnswers).length;
  const riskedCount = riskedAnswers.length;
  const effectiveTotal = totalCount !== null ? totalCount : (questions ? questions.length : (questionIds ? questionIds.length : 0));
  const unansweredCount = Math.max(0, effectiveTotal - answeredCount);
  const impugnedCount = 0;
  const numRows = Math.ceil(effectiveTotal / 10) || 1;

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

  // Auto-scaling: refs to measure each fixed section
  const sidebarCardRef = useRef(null);
  const legendSectionRef = useRef(null);
  const statsSectionRef = useRef(null);
  const gridTitleRef = useRef(null);
  const submitSectionRef = useRef(null);
  const [btnSize, setBtnSize] = useState(28);

  useEffect(() => {
    const card = sidebarCardRef.current;
    if (!card) return;

    const compute = () => {
      const legend = legendSectionRef.current;
      const stats = statsSectionRef.current;
      const gridTitle = gridTitleRef.current;
      const submit = submitSectionRef.current;
      if (!legend || !stats || !submit) return;

      const viewportH = window.innerHeight;
      const { top: cardTop } = card.getBoundingClientRect();
      const availableH = Math.max(100, viewportH - cardTop - 8);

      const legendH = legend.offsetHeight;
      const statsH = stats.offsetHeight;
      const titleH = gridTitle ? gridTitle.offsetHeight + 4 : 20;
      const submitH = submit.offsetHeight;
      const overhead = 16; // card p-2 vertical padding

      const gridH = Math.max(0, availableH - legendH - statsH - titleH - submitH - overhead);
      const gap = 4; // gap-1 = 4px
      const rows = Math.ceil(effectiveTotal / 10) || 1;
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
  }, [effectiveTotal]);

  const scrollToQuestion = async (absoluteIndex) => {
    console.log('🎯 scrollToQuestion called with absoluteIndex:', absoluteIndex);

    const questionId = questionIds[absoluteIndex];
    if (!questionId) {
      console.warn('⚠️ Question ID not found for index:', absoluteIndex);
      return;
    }

    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) {
      console.warn('⚠️ Scroll container not ready');
      return;
    }

    const findElement = () => scrollContainer.querySelector(`#quiz-question-${questionId}`);

    let element = findElement();
    if (!element) {
      console.log('⏳ Question not loaded yet, checking if we can load more...');

      const loadedQuestion = questions?.find(q => q.id === questionId);
      if (!loadedQuestion && onLoadMore && typeof onLoadMore === 'function') {
        try {
          await onLoadMore();
          await new Promise(resolve => setTimeout(resolve, 200));
          element = findElement();
        } catch (error) {
          console.error('❌ Error loading more questions:', error);
        }
      }
    }

    if (!element) {
      console.warn('❌ Question element not found even after attempting to load');
      return;
    }

    const doScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      const targetTop = Math.max(0, relativeTop - 16);

      scrollContainer.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });

    // Feedback visual: resaltar temporalmente con borde más ancho
    const originalBorderWidth = element.style.borderLeftWidth || '4px';
    element.style.borderLeftWidth = '12px';
    element.style.transition = 'border-left-width 0.3s ease';

    setTimeout(() => {
      element.style.borderLeftWidth = originalBorderWidth;
    }, 2000);

    if (onQuestionSelect) {
      const relativeIndex = questions?.findIndex(q => q.id === questionId) ?? absoluteIndex;
      console.log('📞 Calling onQuestionSelect with relativeIndex:', relativeIndex);
      onQuestionSelect(relativeIndex);
    }
  };

  return (
    <div className="w-full">
      <div
        ref={sidebarCardRef}
        className="rounded-lg shadow-sm border-2 transition-all duration-200 p-2"
        style={{
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
        }}
      >
        
        {/* Leyenda de estados */}
        <div
          ref={legendSectionRef}
          className="px-1 py-1.5 border-b"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div className="flex flex-wrap gap-1.5">
            <LegendItem 
              bgColor={colors.unansweredBg}
              borderColor={colors.unansweredBorder}
              textColor={colors.unanswered}
              text={t('quizzes.sidebar.unanswered')} 
            />
            <LegendItem 
              bgColor={colors.answeredBgBright}
              borderColor={colors.answeredBgBright}
              textColor="#ffffff"
              text={t('quizzes.sidebar.answered')} 
            />
            <LegendItem 
              bgColor={colors.risked}
              borderColor={colors.risked}
              textColor="#ffffff"
              text={t('quizzes.sidebar.withRisk')} 
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div ref={statsSectionRef} className="px-1 py-2 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <div className="grid grid-cols-2 gap-2">
            <StatBox 
              label={t('quizzes.sidebar.answered')} 
              value={answeredCount} 
              textColor={colors.answered}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.withRisk')} 
              value={riskedCount} 
              textColor={colors.risked}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.withoutRisk')} 
              value={answeredCount - riskedCount} 
              textColor={colors.answered}
              bgCard={bgCard}
            />
            <StatBox 
              label={t('quizzes.sidebar.unanswered')} 
              value={unansweredCount} 
              textColor={colors.unanswered}
              bgCard={bgCard}
            />
          </div>
        </div>

        {/* Mapa de preguntas */}
        <div className="px-1 py-1.5 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <h3 ref={gridTitleRef} className="text-[11px] font-semibold mb-1" style={{ color: textPrimary }}>
            {t('quizzes.sidebar.questionsMap')}
          </h3>
          <div>
            <div
              className="grid grid-cols-10 gap-1"
            >
            {Array.from({ length: effectiveTotal }).map((_, index) => {
              const qId = questionIds && questionIds[index] ? questionIds[index] : (questions && questions[index] ? questions[index].id : `unloaded-${index}`);
              // Verificar si la pregunta está cargada buscándola en el array de questions
              const isLoaded = questions && questions.some(q => q.id === qId);
              
              const elementExists = isLoaded;
              
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
                  onClick={() => {
                    console.log('🖱️ Button clicked for question:', index + 1, 'isLoaded:', isLoaded);
                    if (elementExists) {
                      scrollToQuestion(index);
                    } else if (!isLoaded) {
                      console.log('⚠️ Question not loaded yet');
                    } else {
                      console.log('⚠️ Element not ready yet, please wait...');
                    }
                  }}
                  disabled={!elementExists}
                  className="w-full rounded font-bold transition-all duration-150 flex items-center justify-center border-2 disabled:cursor-wait hover:enabled:scale-110 hover:enabled:shadow-sm cursor-pointer"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    color: textColor,
                    opacity: opacity,
                    height: btnSize,
                    fontSize: Math.max(8, Math.floor(btnSize * 0.42)),
                    lineHeight: 1
                  }}
                  title={!isLoaded ? t('quizzes.sidebar.loadingQuestion') : `${t('quizzes.sidebar.question')} ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/* Botón finalizar - siempre visible al final */}
        <div ref={submitSectionRef} className="px-2 py-2 flex-shrink-0">
          <button
            onClick={onSubmit}
            className="w-full py-3 text-[15px] text-white font-bold rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] text-center"
            style={{ backgroundColor: colors.answeredBg }}
          >
            {t('quizzes.sidebar.finishExam')}
          </button>
        </div>
      </div>
    </div>
  );
};

// 🔥 FIX: Memoize QuizSidebar to prevent unnecessary re-renders
export default React.memo(QuizSidebar);