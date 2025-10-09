import React from 'react';
import { Award, Zap, Clock } from 'lucide-react';

const StatBox = ({ label, value, icon: Icon, colorClass = 'bg-gray-100 text-gray-800' }) => (
  <div className={`text-center p-3 rounded-lg ${colorClass}`}>
    <div className="flex items-center justify-center mb-1">
      <Icon className="w-4 h-4 mr-2" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <span className="block text-2xl font-bold">{value}</span>
  </div>
);

const ResultsSidebar = ({ result }) => {
  if (!result) {
    return null;
  }

  const { score, score_with_risk, detailed_results, duration_seconds } = result;

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <aside className="lg:w-80 w-full flex-shrink-0">
      <div className="sticky top-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Resumen de Resultados</h3>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {/* 🔥 CORRECCIÓN: Se han invertido las etiquetas y los valores para que coincidan con la lógica. */}
          <StatBox
            label="Puntuación"
            value={`${score}%`}
            icon={Award}
            colorClass="bg-blue-50 text-blue-800"
          />
          <StatBox
            label="Puntuación (con riesgo)"
            value={`${score_with_risk}%`}
            icon={Zap}
            colorClass="bg-yellow-50 text-yellow-800"
          />
          <StatBox
            label="Tiempo Empleado"
            value={formatTime(duration_seconds)}
            icon={Clock}
            colorClass="bg-gray-100 text-gray-800"
          />
        </div>

        <h4 className="text-sm font-semibold text-gray-700 mb-2">Mapa de Preguntas</h4>
        <div className="grid grid-cols-10 gap-1.5 p-2 bg-gray-50 rounded-lg">
          {detailed_results && detailed_results.map((res, index) => {
            const baseStyle = res.is_correct
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white';
            
            const riskStyle = res.is_risked 
              ? 'border-2 border-yellow-500 box-border' 
              : '';

            return (
              <div
                key={res.question_id}
                className={`w-full h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${baseStyle} ${riskStyle}`}
                title={`Pregunta ${index + 1}: ${res.is_correct ? 'Correcta' : 'Incorrecta'}${res.is_risked ? ' (con riesgo)' : ''}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default ResultsSidebar;