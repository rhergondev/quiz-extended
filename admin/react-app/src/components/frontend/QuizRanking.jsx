import React from 'react';
import { useQuizRanking } from '../../hooks/useQuizRanking';
import { Loader, Trophy, Calendar, ShieldAlert } from 'lucide-react'; // Cambiamos el icono a uno más adecuado

const RankingRow = ({ rank, isCurrentUser }) => {
  const { position, display_name, avatar_url, score, score_with_risk, attempt_date } = rank;
  
  const rowClass = isCurrentUser
    ? 'bg-indigo-100 border-l-4 border-indigo-500'
    : 'bg-white';

  const formattedDate = new Date(attempt_date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  const roundedScore = Math.round(score);
  const roundedScoreWithRisk = Math.round(score_with_risk ?? score);

  return (
    <li className={`flex items-center p-3 rounded-md transition-colors ${rowClass}`}>
      {/* Columna de Posición */}
      <span className="font-bold text-gray-500 w-8 text-center">{position}</span>
      
      {/* Columna de Usuario */}
      <img src={avatar_url} alt={display_name} className="w-8 h-8 rounded-full mx-3" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate">{display_name}</span>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Columna de Puntuación (Modificada) */}
      <div className="flex flex-col items-end">
        {/* Puntuación Principal */}
        <span className="font-bold text-indigo-600 text-lg">
          {roundedScore}%
        </span>
        {/* Puntuación con Riesgo (siempre visible, más pequeña) */}
        <div 
            className="flex items-center text-xs text-gray-500 mt-1" 
            title="Puntuación con penalización por riesgo"
        >
          <ShieldAlert className="w-3 h-3 mr-1 text-red-500" />
          <span>{roundedScoreWithRisk}%</span>
        </div>
      </div>
    </li>
  );
};


const QuizRanking = ({ quizId }) => {
  const { ranking, loading, error } = useQuizRanking(quizId);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mt-4 flex justify-center items-center h-48">
        <Loader className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!ranking || (!ranking.top.length && !ranking.relative.length)) {
    return null; // Don't show anything if there's no ranking data
  }

  const { top, relative, currentUser } = ranking;
  const currentUserId = currentUser?.id;

  // --- Lógica para combinar y mostrar rankings sin cambios ---
  const allRanks = [...top];
  const topIds = new Set(top.map(r => r.user_id));
  
  relative.forEach(r => {
      if (!topIds.has(r.user_id)) {
          allRanks.push(r);
      }
  });

  allRanks.sort((a, b) => a.position - b.position);

  let displayList = [];
  let lastPos = 0;
  allRanks.forEach(rank => {
      if (lastPos > 0 && rank.position > lastPos + 1) {
          displayList.push({ isSeparator: true, id: `sep-${lastPos}` });
      }
      displayList.push(rank);
      lastPos = rank.position;
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mt-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center flex items-center justify-center">
        <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
        Ranking del Cuestionario
      </h3>
      <ul className="space-y-2">
        {displayList.map((rank) => {
          if (rank.isSeparator) {
            return (
              <li key={rank.id} className="flex justify-center items-center py-2">
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-1"></div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              </li>
            );
          }
          return (
            <RankingRow
              key={rank.user_id}
              rank={rank}
              isCurrentUser={currentUserId === rank.user_id}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default QuizRanking;