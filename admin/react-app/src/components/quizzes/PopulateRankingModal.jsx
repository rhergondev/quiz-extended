// src/components/quizzes/PopulateRankingModal.jsx

import React, { useState } from 'react';
import { X, Users, Upload } from 'lucide-react';
import Button from '../common/Button';

const PopulateRankingModal = ({ isOpen, onClose, onPopulate, quizId }) => {
  const [jsonUsers, setJsonUsers] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [maxScore, setMaxScore] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const handlePopulate = async () => {
    try {
      const users = JSON.parse(jsonUsers);
      setIsLoading(true);
      await onPopulate(quizId, users, minScore, maxScore);
      onClose();
    } catch (error) {
      alert('Error: El JSON de usuarios no es válido.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center"><Upload className="mr-2" />Poblar Ranking</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JSON de Usuarios</label>
            <textarea
              value={jsonUsers}
              onChange={(e) => setJsonUsers(e.target.value)}
              placeholder="Pega aquí el JSON generado en la página de usuarios..."
              className="w-full h-40 p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Puntuación Mínima</label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Puntuación Máxima</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end p-4 border-t">
          <Button onClick={handlePopulate} isLoading={isLoading}>
            Añadir al Ranking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PopulateRankingModal;