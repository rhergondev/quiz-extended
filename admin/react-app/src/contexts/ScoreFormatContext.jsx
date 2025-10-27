// src/contexts/ScoreFormatContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../api/services/settingsService';

const ScoreFormatContext = createContext();

export const useScoreFormat = () => {
  const context = useContext(ScoreFormatContext);
  if (!context) {
    throw new Error('useScoreFormat must be used within ScoreFormatProvider');
  }
  return context;
};

export const ScoreFormatProvider = ({ children }) => {
  // Cargar preferencia desde la API o localStorage temporal
  const [format, setFormat] = useState('percentage');
  const [loading, setLoading] = useState(true);

  // Cargar formato inicial desde la API
  useEffect(() => {
    const loadFormat = async () => {
      try {
        const scoreFormat = await settingsService.getScoreFormat();
        setFormat(scoreFormat);
      } catch (error) {
        console.error('Error loading score format:', error);
        // Fallback a localStorage si falla la API
        const saved = localStorage.getItem('scoreFormat');
        if (saved) {
          setFormat(saved);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFormat();
  }, []);

  // Sincronizar con localStorage como backup
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('scoreFormat', format);
    }
  }, [format, loading]);

  // Función para convertir score de porcentaje a base 10
  const convertScore = (percentageScore) => {
    // Validar que sea un número
    const score = parseFloat(percentageScore);
    if (isNaN(score)) {
      return format === 'base10' ? 0 : 0;
    }

    if (format === 'base10') {
      return score / 10;
    }
    return score;
  };

  // Función para formatear el score (sin unidades)
  const formatScore = (percentageScore, options = {}) => {
    // Validar que sea un número
    const numericScore = parseFloat(percentageScore);
    if (isNaN(numericScore)) {
      return '0';
    }

    if (format === 'base10') {
      const rawScore = numericScore / 10;
      // Mostrar decimales solo si los hay
      return rawScore % 1 === 0 ? Math.round(rawScore) : rawScore.toFixed(2);
    }
    
    // Para porcentaje, mostrar decimales solo si los hay
    return numericScore % 1 === 0 ? Math.round(numericScore) : numericScore.toFixed(2);
  };

  // Función para obtener el label del formato actual
  const getFormatLabel = () => {
    return format === 'base10' ? 'Base 10 (0-10)' : 'Porcentaje (0-100%)';
  };

  // Función para alternar entre formatos
  const toggleFormat = () => {
    setFormat(prev => prev === 'percentage' ? 'base10' : 'percentage');
  };

  // Función para establecer un formato específico
  const setScoreFormat = (newFormat) => {
    if (newFormat === 'percentage' || newFormat === 'base10') {
      setFormat(newFormat);
    }
  };

  const value = {
    format,
    setScoreFormat,
    toggleFormat,
    convertScore,
    formatScore,
    getFormatLabel,
    isBase10: format === 'base10',
    isPercentage: format === 'percentage',
    loading
  };

  return (
    <ScoreFormatContext.Provider value={value}>
      {children}
    </ScoreFormatContext.Provider>
  );
};

export default ScoreFormatContext;
