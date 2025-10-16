// src/components/users/FakeUserGenerator.jsx

import React, { useState } from 'react';
import { X, Users, Clipboard } from 'lucide-react';
import Button from '../common/Button';

const fakeNames = [
  "Sofía García", "Mateo Rodríguez", "Valentina Martínez", "Santiago Hernández", "Isabella González",
  "Sebastián Pérez", "Camila López", "Matías Sánchez", "Valeria Ramírez", "Alejandro Flores",
  "Mariana Gómez", "Diego Díaz", "Gabriela Cruz", "Emiliano Ortiz", "Daniela Reyes"
];

const FakeUserGenerator = ({ isOpen, onClose }) => {
  const [generatedUsers, setGeneratedUsers] = useState([]);
  const [userCount, setUserCount] = useState(10);
  const [copied, setCopied] = useState(false);

  const generateUsers = () => {
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
      users.push({
        id: `fake_${i + 1}`,
        display_name: name,
        avatar_url: `https://i.pravatar.cc/150?u=${i}`
      });
    }
    setGeneratedUsers(users);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedUsers, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2" />Generador de Usuarios Ficticios</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <label>Número de usuarios a generar:</label>
            <input
              type="number"
              value={userCount}
              onChange={(e) => setUserCount(parseInt(e.target.value, 10))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="50"
            />
            <Button onClick={generateUsers}>Generar</Button>
          </div>
          {generatedUsers.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Usuarios Generados (JSON)</label>
                <Button onClick={copyToClipboard} variant="secondary" size="sm" iconLeft={Clipboard}>
                  {copied ? '¡Copiado!' : 'Copiar'}
                </Button>
              </div>
              <textarea
                readOnly
                value={JSON.stringify(generatedUsers, null, 2)}
                className="w-full h-64 p-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeUserGenerator;