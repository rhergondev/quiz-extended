// src/components/frontend/Timer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const Timer = ({ durationMinutes, onTimeUp, isPaused, initialTimeRemaining = null, onTick = null, compact = false }) => {
  const { getColor, isDarkMode } = useTheme();
  const { t } = useTranslation();
  const [remainingTime, setRemainingTime] = useState(
    initialTimeRemaining !== null ? initialTimeRemaining : durationMinutes * 60
  );
  
  // 🔥 FIX: Use refs to store callbacks to avoid restarting the timer when they change
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);
  
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Dark mode colors
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff';
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : '#111827';
  const textSecondary = isDarkMode ? getColor('textSecondary', '#9ca3af') : '#374151';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.3)' : '#e5e7eb';

  // Actualizar tiempo inicial cuando se resume desde autoguardado
  useEffect(() => {
    if (initialTimeRemaining !== null) {
      setRemainingTime(initialTimeRemaining);
    }
  }, [initialTimeRemaining]);

  useEffect(() => {
    if (isPaused || durationMinutes <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          // 🔥 FIX: Use ref to call the latest callback
          if (onTimeUpRef.current) {
            console.log('⏰ Time is up! Submitting quiz...');
            onTimeUpRef.current();
          }
          return 0;
        }
        const newTime = prevTime - 1;
        
        // Notificar al padre el tiempo restante para autoguardado
        if (onTickRef.current) {
          onTickRef.current(newTime);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, durationMinutes]); // 🔥 FIX: Removed onTimeUp and onTick from dependencies

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  
  if (durationMinutes <= 0) {
      return null; // No renderizar si no hay límite de tiempo
  }

  // Modo compacto para la barra superior
  if (compact) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          color: textPrimary
        }}
      >
        <Clock className="w-4 h-4" style={{ color: textSecondary }} />
        <span className="text-sm font-semibold tabular-nums">
          {formatTime(remainingTime)}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="mt-4 p-4 rounded-lg border shadow-sm text-center"
      style={{ 
        backgroundColor: bgCard,
        borderColor: borderColor
      }}
    >
      <div className="flex items-center justify-center" style={{ color: textSecondary }}>
        <Clock className="w-5 h-5 mr-2" />
        <span className="text-lg font-semibold">{t('quizzes.timeRemaining')}</span>
      </div>
      <p className="text-3xl font-bold mt-2" style={{ color: textPrimary }}>
        {formatTime(remainingTime)}
      </p>
    </div>
  );
};

export default Timer;