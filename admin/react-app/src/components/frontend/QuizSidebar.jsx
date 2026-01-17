import React, { useEffect, useState, useRef } from 'react';
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
  onLoadMore = null, // Callback para cargar más preguntas si es necesario
  scrollContainerRef = null // 🔥 FIX: Direct ref to the questions container
}) => {
  const { getColor, isDarkMode } = useTheme();
  const { t } = useTranslation();
  
  // 🔥 FIX: Forzar re-render cuando las preguntas se monten en el DOM
  const [domReady, setDomReady] = useState(false);
  const checkIntervalRef = useRef(null);
  
  useEffect(() => {
    // Esperar a que las preguntas se rendericen completamente en el DOM
    if (questions && questions.length > 0 && !domReady) {
      console.log('🔄 Questions arrived in sidebar, starting DOM check...');
      
      let checksCount = 0;
      const maxChecks = 10; // Máximo 10 checks (2 segundos)
      
      // Limpiar intervalo anterior si existe
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      
      checkIntervalRef.current = setInterval(() => {
        checksCount++;
        
        // Verificar si al menos la primera pregunta existe en el DOM
        const firstQuestionId = questions[0]?.id;
        if (firstQuestionId) {
          const element = document.getElementById(`quiz-question-${firstQuestionId}`);
          
          if (element) {
            console.log(`✅ Questions found in DOM after ${checksCount * 200}ms, marking DOM ready`);
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
            setDomReady(true); // 🔥 FIX: Use state instead of forceUpdate to avoid re-running
          } else if (checksCount >= maxChecks) {
            console.warn('⚠️ Questions still not in DOM after 2 seconds, marking ready anyway');
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
            setDomReady(true);
          }
        }
      }, 200);
      
      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      };
    }
  }, [questions, domReady]);
  
  // 🔥 FIX: Reset domReady when questions change significantly (new quiz)
  useEffect(() => {
    if (questions && questions.length > 0) {
      const firstId = questions[0]?.id;
      // Store the first question ID to detect quiz changes
      if (checkIntervalRef.firstQuestionId && checkIntervalRef.firstQuestionId !== firstId) {
        console.log('🔄 Quiz changed, resetting domReady');
        setDomReady(false);
      }
      checkIntervalRef.firstQuestionId = firstId;
    }
  }, [questions]);
  
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
      console.log('✅ Element found, scrolling to question', absoluteIndex + 1);
      
      // 🔥 FIX: Usar scrollIntoView directamente - es más confiable
      // y funciona correctamente tanto hacia arriba como hacia abajo
      setTimeout(() => {
        const verifiedElement = document.getElementById(`quiz-question-${questionId}`);
        if (!verifiedElement) {
          console.warn('⚠️ Element disappeared');
          return;
        }
        
        // Usar scrollIntoView con behavior smooth para animación
        // y block 'start' para posicionar al inicio del viewport con un pequeño offset
        verifiedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
        
        // Ajustar un poco hacia arriba para dar espacio visual (después de que termine el scroll)
        const scrollContainer = scrollContainerRef?.current;
        if (scrollContainer) {
          setTimeout(() => {
            // Restar 20px para dar un poco de margen superior
            scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - 20);
          }, 300); // Esperar a que termine el scroll smooth
        }
        
        console.log('✅ scrollIntoView executed for question', absoluteIndex + 1);
      }, 50);
      
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
              
              // 🔥 FIX: Use domReady state instead of checking DOM on every render
              // This avoids the timing issue where DOM check passes but scroll fails
              const elementExists = isLoaded && domReady;
              
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
                    console.log('🖱️ Button clicked for question:', index + 1, 'isLoaded:', isLoaded, 'domReady:', domReady);
                    if (elementExists) {
                      scrollToQuestion(index);
                    } else if (!isLoaded) {
                      console.log('⚠️ Question not loaded yet');
                    } else {
                      console.log('⚠️ DOM not ready yet, please wait...');
                    }
                  }}
                  disabled={!elementExists}
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