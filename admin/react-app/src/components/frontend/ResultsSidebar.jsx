import React from 'react';
import { Award, Zap, Clock } from 'lucide-react';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';

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
  const { formatScore } = useScoreFormat();
  
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
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Resumen de Resultados</h3>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {/* 🔥 CORRECCIÓN: Se han invertido las etiquetas y los valores para que coincidan con la lógica. */}
          <StatBox
            label="Puntuación"
            value={formatScore(score)}
            icon={Award}
            colorClass="bg-blue-50 text-blue-800"
          />
          <StatBox
            label="Puntuación (con riesgo)"
            value={formatScore(score_with_risk)}
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
            // Determinar si la pregunta fue contestada
            const wasAnswered = res.answer_given !== null;
            
            // Lógica de estilos
            let boxStyle = '';
            let title = '';
            
            if (!wasAnswered) {
              // Sin contestar: gris
              boxStyle = 'bg-gray-300 text-white';
              title = `Pregunta ${index + 1}: Sin contestar`;
            } else if (res.is_risked) {
              // Con riesgo: solo borde, sin relleno
              if (res.is_correct) {
                boxStyle = 'bg-white border-2 border-green-500 text-green-600';
                title = `Pregunta ${index + 1}: Correcta (con riesgo)`;
              } else {
                boxStyle = 'bg-white border-2 border-red-500 text-red-600';
                title = `Pregunta ${index + 1}: Incorrecta (con riesgo)`;
              }
            } else {
              // Sin riesgo: relleno completo
              if (res.is_correct) {
                boxStyle = 'bg-green-500 text-white';
                title = `Pregunta ${index + 1}: Correcta`;
              } else {
                boxStyle = 'bg-red-500 text-white';
                title = `Pregunta ${index + 1}: Incorrecta`;
              }
            }

            return (
              <div
                key={res.question_id}
                className={`w-full h-7 rounded text-xs font-bold transition-colors flex items-center justify-center ${boxStyle}`}
                title={title}
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