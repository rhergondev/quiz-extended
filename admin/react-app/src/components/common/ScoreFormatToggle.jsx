// src/components/common/ScoreFormatToggle.jsx
import React from 'react';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { Percent, Hash } from 'lucide-react';

const ScoreFormatToggle = ({ className = '' }) => {
  const { format, toggleFormat, getFormatLabel } = useScoreFormat();

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Formato de notas:</span>
      <button
        onClick={toggleFormat}
        className="relative inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-indigo-400 transition-all group"
        title="Cambiar formato de visualización"
      >
        <div className="flex items-center gap-2">
          {format === 'percentage' ? (
            <>
              <Percent className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">0-100%</span>
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">0-10</span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 group-hover:text-indigo-600 transition-colors">
          Cambiar
        </div>
      </button>
    </div>
  );
};

export default ScoreFormatToggle;
