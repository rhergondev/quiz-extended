import React from 'react';

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
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        
        {/* 🔥 NEW: Loading progress indicator */}
        {loadingMore && loadingProgress < 100 && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>Cargando preguntas...</span>
              <span className="font-bold">{loadedCount}/{effectiveTotal}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex justify-around items-center mb-4 p-2 bg-gray-50 rounded-lg">
            {/* CAMBIO: Usando la nueva clase 'bg-primary' */}
            <LegendItem color="bg-primary border-primary" text="Contestada" />
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
            
            if (!isLoaded) {
              // 🔥 NEW: Placeholder style for unloaded questions
              style = 'bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-wait';
            } else if (isImpugned) {
              style = 'bg-gray-400 text-black border-gray-400';
            } else if (isRisked) {
              // CAMBIO: Usando 'text-primary'
              style = 'bg-yellow-500 text-primary border-yellow-500';
            } else if (isAnswered) {
              // CAMBIO: Usando 'bg-primary' y 'border-primary'
              style = 'bg-primary text-yellow-500 border-primary';
            } else {
              // CAMBIO: Usando 'border-primary' y 'text-primary'
              style = 'bg-white border-2 border-primary text-primary';
            }

            return (
              <div
                key={qId}
                onClick={() => isLoaded && scrollToQuestion(index)}
                className={`w-full h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${isLoaded ? 'cursor-pointer hover:opacity-80' : 'cursor-wait'} ${style}`}
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
              className={`w-full px-4 py-2 rounded-md font-medium transition-all ${loadingMore ? 'bg-gray-300 text-gray-600 cursor-wait' : 'bg-white border-2 border-primary text-primary hover:opacity-90'}`}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más preguntas'}
            </button>
          </div>
        )}

        <button
          onClick={onSubmit}
          // CAMBIO: Usando 'bg-primary' y 'hover:bg-primary/90' para un efecto hover sutil
          className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 shadow-md transition-all transform hover:-translate-y-px"
        >
          FINALIZAR EXAMEN
        </button>
      </div>
    </div>
  );
};

export default QuizSidebar;