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
  userAnswers, 
  riskedAnswers, 
  onQuestionSelect, 
  onSubmit 
}) => {
  
  const answeredCount = Object.keys(userAnswers).length;
  const riskedCount = riskedAnswers.length;
  const unansweredCount = questions.length - answeredCount;
  const impugnedCount = 0;

  return (
    <div className="sticky top-4 w-full">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        
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
          {questions.map((question, index) => {
            const isAnswered = userAnswers.hasOwnProperty(question.id);
            const isRisked = riskedAnswers.includes(question.id);
            const isImpugned = false; 

            let style = '';
            
            if (isImpugned) {
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
                key={question.id}
                onClick={() => onQuestionSelect(index)}
                className={`w-full h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${style}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>

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