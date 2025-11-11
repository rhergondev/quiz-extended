import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// --- COMPONENTES AUXILIARES (Sin cambios) ---

const StatBox = ({ label, value, colorClass = 'bg-gray-200' }) => (
  <div className={`text-center p-2 rounded-md ${colorClass}`}>
    <span className="block text-xs text-gray-700">{label}</span>
    <span className="block text-xl font-bold text-gray-900">{value}</span>
  </div>
);

const LegendItem = ({ color, text }) => (
    <div className="flex items-center text-xs text-gray-600">
        <span className={`w-3 h-3 rounded-full mr-2 border ${color}`}></span>
        <span>{text}</span>
    </div>
);


// --- COMPONENTE PRINCIPAL (Con cambios) ---

const QuizSidebar = ({ 
  questions, 
  questionIds = [],
  totalCount = null,
  userAnswers, 
  riskedAnswers, 
  onQuestionSelect, 
  onSubmit,
  loadingMore = false,
  loadedCount = 0,
  hasMore = false,
  onLoadMore = null
}) => {
  const { getColor } = useTheme();
  
  const answeredCount = Object.keys(userAnswers).length;
  const riskedCount = riskedAnswers.length;
  const effectiveTotal = totalCount !== null ? totalCount : (questions ? questions.length : (questionIds ? questionIds.length : 0));
  const unansweredCount = Math.max(0, effectiveTotal - answeredCount);
  const impugnedCount = 0;
  
  // 🔥 NEW: Calculate loading progress
  const loadingProgress = effectiveTotal > 0 ? Math.round((loadedCount / effectiveTotal) * 100) : 100;

  const scrollToQuestion = (index) => {
    const element = document.getElementById(`quiz-question-${index + 1}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Añadir un efecto visual temporal
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 2000);
    }
    // También llamar a onQuestionSelect si existe
    if (onQuestionSelect) {
      onQuestionSelect(index);
    }
  };

  return (
    <div className="sticky top-4 w-full">
      <div 
        className="p-6 rounded-xl shadow-lg border-2"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
          borderColor: getColor('primary', '#3b82f6')
        }}
      >
        
        {/* 🔥 NEW: Loading progress indicator */}
        {loadingMore && loadingProgress < 100 && (
          <div 
            className="mb-4 p-3 rounded-lg border-2"
            style={{ 
              backgroundColor: getColor('primary', '#3b82f6') + '10',
              borderColor: getColor('primary', '#3b82f6')
            }}
          >
            <div className="flex items-center justify-between text-xs qe-text-primary mb-2">
              <span className="font-medium">Cargando preguntas...</span>
              <span className="font-bold">{loadedCount}/{effectiveTotal}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${loadingProgress}%`,
                  backgroundColor: getColor('primary', '#3b82f6')
                }}
              ></div>
            </div>
          </div>
        )}
        
        <div 
          className="flex justify-around items-center mb-4 p-3 rounded-lg"
          style={{ backgroundColor: getColor('background', '#ffffff') }}
        >
            <LegendItem color="border-2" text="Contestada" style={{ borderColor: getColor('primary', '#3b82f6'), backgroundColor: getColor('primary', '#3b82f6') }} />
            <LegendItem color="bg-yellow-500 border-yellow-500" text="Con Riesgo" />
            <LegendItem color="bg-gray-400 border-gray-400" text="Impugnada" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBox label="Contestadas" value={answeredCount} />
          <StatBox label="Con Riesgo" value={riskedCount} colorClass="bg-yellow-100" />
          <StatBox label="Sin Riesgo" value={answeredCount - riskedCount} />
          <StatBox label="Sin Contestar" value={unansweredCount} />
        </div>

        <div className="grid grid-cols-10 gap-1.5 mb-6">
          {Array.from({ length: effectiveTotal }).map((_, index) => {
            const qId = questionIds && questionIds[index] ? questionIds[index] : (questions && questions[index] ? questions[index].id : `unloaded-${index}`);
            const isLoaded = questions && questions[index]; // Check if question is loaded
            const isAnswered = userAnswers.hasOwnProperty(qId);
            const isRisked = riskedAnswers.includes(qId);
            const isImpugned = false; 

            let style = '';
            let bgColor = '';
            let borderColor = '';
            let textColor = '';
            
            if (!isLoaded) {
              // 🔥 NEW: Placeholder style for unloaded questions
              style = 'bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-wait';
            } else if (isImpugned) {
              style = 'bg-gray-400 text-black border-gray-400';
            } else if (isRisked) {
              // CAMBIO: Usando color primario
              style = `bg-yellow-500 text-white border-2`;
              borderColor = '#eab308';
            } else if (isAnswered) {
              // CAMBIO: Usando color primario
              style = `text-white border-2`;
              bgColor = getColor('primary', '#3b82f6');
              borderColor = getColor('primary', '#3b82f6');
            } else {
              // Sin contestar
              style = `bg-white border-2`;
              borderColor = getColor('primary', '#3b82f6');
              textColor = getColor('primary', '#3b82f6');
            }

            return (
              <div
                key={qId}
                onClick={() => isLoaded && scrollToQuestion(index)}
                className={`w-full h-7 rounded text-xs font-bold transition-all flex items-center justify-center ${isLoaded ? 'cursor-pointer hover:opacity-80' : 'cursor-wait'} ${style}`}
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor
                }}
                title={!isLoaded ? 'Cargando pregunta...' : undefined}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

        {/* Manual fallback: cargar más preguntas si hay más y la prefetch falló */}
        {hasMore && (
          <div className="mb-4">
            <button
              onClick={() => { if (onLoadMore) onLoadMore(); }}
              disabled={loadingMore}
              aria-label="Cargar más preguntas"
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all border-2 ${loadingMore ? 'bg-gray-300 text-gray-600 cursor-wait' : 'bg-white hover:opacity-90'}`}
              style={!loadingMore ? {
                borderColor: getColor('primary', '#3b82f6'),
                color: getColor('primary', '#3b82f6')
              } : {}}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más preguntas'}
            </button>
          </div>
        )}

        <button
          onClick={onSubmit}
          className="w-full px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-all transform hover:-translate-y-px hover:shadow-lg"
          style={{ backgroundColor: getColor('primary', '#3b82f6') }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          FINALIZAR EXAMEN
        </button>
      </div>
    </div>
  );
};

export default QuizSidebar;