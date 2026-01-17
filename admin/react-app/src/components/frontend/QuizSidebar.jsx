import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// --- COMPONENTES AUXILIARES ---

const StatBox = ({ label, value, textColor, bgCard }) => (
  <div 
    className="text-center px-2 py-2 rounded border-2"
    style={{
      backgroundColor: bgCard,
      borderColor: textColor
    }}
  >
    <span className="block text-[11px] font-semibold leading-tight" style={{ color: textColor }}>
      {label}
    </span>
    <span className="block text-xl font-bold mt-0.5" style={{ color: textColor }}>
      {value}
    </span>
  </div>
);

const LegendItem = ({ bgColor, borderColor, textColor, text }) => (
  <div 
    className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center border-2"
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
  onLoadMore = null // Callback para cargar más preguntas si es necesario
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

  const scrollToQuestion = async (absoluteIndex) => {
    console.log('🎯 scrollToQuestion called with absoluteIndex:', absoluteIndex);
    
    // Obtener el ID real de la pregunta desde questionIds
    const questionId = questionIds[absoluteIndex];
    if (!questionId) {
      console.warn('⚠️ Question ID not found for index:', absoluteIndex);
      return;
    }
    
    console.log('🔍 Looking for question with ID:', questionId);
    
    // Buscar el elemento usando el ID real de la pregunta
    let element = document.getElementById(`quiz-question-${questionId}`);
    
    // Si no se encuentra, la pregunta podría no estar cargada aún
    if (!element) {
      console.log('⏳ Question not loaded yet, checking if we can load more...');
      
      // Verificar si la pregunta está en la lista de cargadas
      const loadedQuestion = questions?.find(q => q.id === questionId);
      
      if (!loadedQuestion && onLoadMore && typeof onLoadMore === 'function') {
        console.log('📥 Attempting to load more questions...');
        try {
          await onLoadMore();
          // Esperar un momento para que el DOM se actualice
          await new Promise(resolve => setTimeout(resolve, 300));
          // Intentar encontrar el elemento nuevamente
          element = document.getElementById(`quiz-question-${questionId}`);
        } catch (error) {
          console.error('❌ Error loading more questions:', error);
        }
      }
    }
    
    if (element) {
      console.log('✅ Element found, scrolling...');
      
      // 🔥 FIX: Encontrar el contenedor de scroll correcto
      // Buscar el contenedor padre con overflow-y-auto (el main con las preguntas)
      let scrollContainer = element.parentElement;
      while (scrollContainer && scrollContainer !== document.body) {
        const overflowY = window.getComputedStyle(scrollContainer).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          console.log('📦 Found scroll container:', scrollContainer);
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
      
      // Calcular posición del elemento y hacer scroll manual
      if (scrollContainer && scrollContainer !== document.body) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        const offset = containerRect.height / 2 - elementRect.height / 2; // Centrar
        
        console.log('📍 Scrolling to position:', relativeTop - offset);
        
        // Scroll suave usando scrollTo
        scrollContainer.scrollTo({
          top: relativeTop - offset,
          behavior: 'smooth'
        });
      } else {
        // Fallback: usar scrollIntoView si no encontramos contenedor
        console.log('⚠️ Using scrollIntoView fallback');
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
      
      // Feedback visual: resaltar temporalmente con borde más ancho
      const originalBorderWidth = element.style.borderLeftWidth || '4px';
      
      element.style.borderLeftWidth = '12px';
      element.style.transition = 'border-left-width 0.3s ease';
      
      setTimeout(() => {
        element.style.borderLeftWidth = originalBorderWidth;
      }, 2000);
      
      // Notificar al componente padre si hay callback
      if (onQuestionSelect) {
        // Encontrar el índice relativo de la pregunta en el array cargado
        const relativeIndex = questions?.findIndex(q => q.id === questionId) ?? absoluteIndex;
        console.log('📞 Calling onQuestionSelect with relativeIndex:', relativeIndex);
        onQuestionSelect(relativeIndex);
      }
    } else {
      console.warn('❌ Question element not found even after attempting to load');
      // Mostrar mensaje al usuario (opcional)
      // alert(t('quizzes.sidebar.questionNotLoaded'));
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div 
        className="rounded-lg shadow-sm border-2 transition-all duration-200 flex flex-col h-full max-h-full p-2"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
        }}
      >
        
        {/* Leyenda de estados */}
        <div 
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
        <div className="px-1 py-2 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
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

        {/* Mapa de preguntas - con scroll interno */}
        <div className="px-1 py-1.5 border-b flex-1 min-h-0 flex flex-col" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <h3 className="text-[10px] font-semibold mb-1 flex-shrink-0" style={{ color: textPrimary }}>
            {t('quizzes.sidebar.questionsMap')}
          </h3>
          <div className="flex-1 min-h-0" style={{ maxHeight: '280px' }}>
            <div 
              className="grid grid-cols-10 gap-0.5"
            >
            {Array.from({ length: effectiveTotal }).map((_, index) => {
              const qId = questionIds && questionIds[index] ? questionIds[index] : (questions && questions[index] ? questions[index].id : `unloaded-${index}`);
              // Verificar si la pregunta está cargada buscándola en el array de questions
              const isLoaded = questions && questions.some(q => q.id === qId);
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
                    if (isLoaded) {
                      scrollToQuestion(index);
                    }
                  }}
                  disabled={!isLoaded}
                  className="w-full aspect-square rounded text-[11px] font-bold transition-all duration-150 flex items-center justify-center border-2 disabled:cursor-wait hover:enabled:scale-110 hover:enabled:shadow-sm cursor-pointer"
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
        </div>

        {/* Botón finalizar - siempre visible al final */}
        <div className="px-2 py-2 flex-shrink-0">
          <button
            onClick={onSubmit}
            className="w-full py-3 text-sm text-white font-bold rounded-lg shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] text-center"
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