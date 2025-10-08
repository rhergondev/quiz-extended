// src/components/frontend/Timer.jsx
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const Timer = ({ durationMinutes, onTimeUp, isPaused }) => {
  const [remainingTime, setRemainingTime] = useState(durationMinutes * 60);

  useEffect(() => {
    if (isPaused || durationMinutes <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, onTimeUp, durationMinutes]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  
  if (durationMinutes <= 0) {
      return null; // No renderizar si no hay límite de tiempo
  }

  return (
    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
      <div className="flex items-center justify-center text-gray-700">
        <Clock className="w-5 h-5 mr-2" />
        <span className="text-lg font-semibold">Tiempo Restante</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">
        {formatTime(remainingTime)}
      </p>
    </div>
  );
};

export default Timer;