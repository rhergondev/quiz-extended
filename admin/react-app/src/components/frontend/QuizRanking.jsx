import React from 'react';
import { useQuizRanking } from '../../hooks/useQuizRanking';
import { Loader, Trophy } from 'lucide-react';

const RankingRow = ({ rank, isCurrentUser }) => {
  const { position, display_name, avatar_url, score } = rank;
  
  const rowClass = isCurrentUser
    ? 'bg-indigo-100 border-l-4 border-indigo-500'
    : 'bg-white';

  return (
    <li className={`flex items-center p-3 rounded-md transition-colors ${rowClass}`}>
      <span className="font-bold text-gray-500 w-8 text-center">{position}</span>
      <img src={avatar_url} alt={display_name} className="w-8 h-8 rounded-full mx-3" />
      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{display_name}</span>
      <span className="font-bold text-indigo-600">{Math.round(score)}%</span>
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

  // Combine lists and remove duplicates, giving preference to the relative list
  const relativeIds = new Set(relative.map(r => r.user_id));
  const topFiltered = top.filter(r => !relativeIds.has(r.user_id));
  
  // Find where to insert the separator
  let separatorIndex = -1;
  if (topFiltered.length > 0 && relative.length > 0 && relative[0].position > topFiltered[topFiltered.length - 1].position + 1) {
    separatorIndex = topFiltered.length;
  }

  const displayList = [...topFiltered];
  if (separatorIndex !== -1) {
    displayList.push({ isSeparator: true, id: 'separator' });
  }
  
  // Create a Set of user_ids from the top list to avoid duplicates
  const topIds = new Set(topFiltered.map(r => r.user_id));
  relative.forEach(r => {
      if (!topIds.has(r.user_id)) {
          displayList.push(r);
      }
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
              <li key="separator" className="flex justify-center items-center py-2">
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